import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createInitialPetState, tickPet } from "../core/behavior";
import {
  createAnchoredPatrolState,
  createInitialPatrolState,
  planPatrolStep,
  type PatrolState
} from "../core/patrolPlanner";
import { choosePatrolSurface, shouldMigrateSurface } from "../core/patrolSelector";
import type { PatrolSurface } from "../core/patrolSurface";
import { DEFAULT_PREFERENCES } from "../core/preferences";
import { createSpriteRenderer } from "../core/renderer";
import type { PetState, Point } from "../core/types";
import {
  DEFAULT_WINDOW_POSITION,
  applyPetMove,
  type InteractionState
} from "../core/interaction";
import {
  applyWindowState,
  applyLaunchAtLogin,
  listenForPetCommands,
  listenForPetMoves,
  loadCompanionMemory,
  loadScreenPatrolSurfaces,
  loadInteractionState,
  reduceInteractionState,
  saveCompanionMemory,
  saveInteractionState,
  sendPetCommandToPet,
  startPetDrag
} from "./petWindow";
import { loadFrontWindowSurface } from "./nativeSurfaces";
import { createSoundPlayer, loadDefaultSpriteAssets } from "./defaultAssets";
import { ANIMATIONS } from "../core/animations";
import { SettingsApp } from "./SettingsApp";
import type { SpriteRuntimeAssets } from "../core/renderer";
import {
  createInitialPettingGestureState,
  pettingReactionToBehavior,
  updatePettingGesture,
  type PettingReaction
} from "../core/petting";
import { selectCompanionSoundCue } from "../core/sound";
import {
  advanceCompanion,
  createInitialCompanionState
} from "../core/companion";

const BASE_CANVAS_SIZE = 96;
const SURFACE_REFRESH_MS = 3_000;
const REST_DECISION_MS = 3_000;
const PATROL_SPEEDS = {
  lazy: 0.025,
  normal: 0.045,
  busy: 0.07
} as const;

export function PetApp() {
  const windowLabel = getCurrentWindow().label;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const petState = useRef<PetState>(createInitialPetState());
  const pettingGesture = useRef(createInitialPettingGestureState());
  const previousPettingTime = useRef(performance.now());
  const lastPettingReaction = useRef<PettingReaction | null>(null);
  const pendingPettingReaction = useRef<PettingReaction | null>(null);
  const companionState = useRef(createInitialCompanionState());
  const manualDragging = useRef(false);
  const manualDragAnchor = useRef<Point | null>(null);
  const dragAnchorVersion = useRef(0);
  const dragSettleTimeout = useRef<number | null>(null);
  const spriteAssetsRef = useRef<SpriteRuntimeAssets | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>({
    preferences: DEFAULT_PREFERENCES,
    position: DEFAULT_WINDOW_POSITION
  });
  const canvasSize = Math.round(BASE_CANVAS_SIZE * interaction.preferences.scale);

  const scheduleDragSettle = () => {
    if (dragSettleTimeout.current !== null) {
      window.clearTimeout(dragSettleTimeout.current);
    }

    dragSettleTimeout.current = window.setTimeout(() => {
      manualDragging.current = false;
      dragSettleTimeout.current = null;
    }, 350);
  };

  useEffect(() => {
    let disposed = false;

    loadInteractionState()
      .then((state) => {
        if (!disposed) setInteraction(state);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (windowLabel !== "pet") return;

    let disposed = false;
    void loadCompanionMemory()
      .then((memory) => {
        if (!disposed) {
          companionState.current = {
            ...companionState.current,
            memory
          };
        }
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, [windowLabel]);

  useEffect(() => {
    if (windowLabel === "pet") {
      void applyWindowState(interaction).catch(() => undefined);
    }
    void saveInteractionState(interaction).catch(() => undefined);
    void applyLaunchAtLogin(interaction.preferences.launchAtLogin).catch(() => undefined);
  }, [interaction, windowLabel]);

  useEffect(() => {
    let unlistenCommands: (() => void) | undefined;
    let unlistenMoves: (() => void) | undefined;

    void listenForPetCommands((command) => {
      setInteraction((current) => reduceInteractionState(current, command));
    }).then((unlisten) => {
      unlistenCommands = unlisten;
    });

    if (windowLabel === "pet") {
      void listenForPetMoves((position) => {
        if (manualDragging.current) {
          manualDragAnchor.current = position;
          dragAnchorVersion.current += 1;
          scheduleDragSettle();
          setInteraction((current) => applyPetMove(current, position, "drag"));
          return;
        }

        setInteraction((current) => applyPetMove(current, position));
      }).then((unlisten) => {
        unlistenMoves = unlisten;
      });
    }

    return () => {
      unlistenCommands?.();
      unlistenMoves?.();
      if (dragSettleTimeout.current !== null) {
        window.clearTimeout(dragSettleTimeout.current);
      }
    };
  }, [windowLabel]);

  useEffect(() => {
    if (windowLabel !== "pet") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createSpriteRenderer(canvas);
    const soundPlayer = createSoundPlayer();
    let previousTime = performance.now();
    let frameId = 0;
    let lastSoundAt = performance.now() - 5_000;
    let activeSurface: PatrolSurface | null = null;
    let activeRestSurface: PatrolSurface | null = null;
    let patrolState: PatrolState | null = null;
    let refreshElapsedMs = SURFACE_REFRESH_MS;
    let migrationElapsedMs = SURFACE_REFRESH_MS;
    let restDecisionElapsedMs = 0;
    let frontWindowMissingMs = 0;
    let handledDragAnchorVersion = dragAnchorVersion.current;

    void loadDefaultSpriteAssets()
      .then((assets) => {
        spriteAssetsRef.current = assets;
        renderer.setSpriteAssets(assets);
      })
      .catch(() => undefined);

    const refreshPatrolSurface = () => {
      if (!interaction.preferences.patrolEnabled) {
        activeSurface = null;
        activeRestSurface = null;
        patrolState = null;
        frontWindowMissingMs = 0;
        return;
      }

      void Promise.all([
        loadFrontWindowSurface(),
        loadScreenPatrolSurfaces(interaction.position)
      ])
        .then(([frontWindow, fallbackSurfaces]) => {
          if (fallbackSurfaces.length === 0) return;
          frontWindowMissingMs = frontWindow ? 0 : frontWindowMissingMs + SURFACE_REFRESH_MS;
          activeRestSurface =
            interaction.preferences.patrolSurfacePreference === "front-window" ? frontWindow : null;

          const nextSurface = choosePatrolSurface({
            preferred: interaction.preferences.patrolSurfacePreference,
            currentSurface: activeSurface,
            frontWindow,
            frontWindowMissingMs,
            fallbackSurfaces
          });

          if (
            shouldMigrateSurface(activeSurface?.id ?? null, nextSurface.id, migrationElapsedMs)
          ) {
            activeSurface = nextSurface;
            patrolState = manualDragAnchor.current
              ? createAnchoredPatrolState(nextSurface, manualDragAnchor.current, canvasSize)
              : createInitialPatrolState(nextSurface);
            handledDragAnchorVersion = dragAnchorVersion.current;
            migrationElapsedMs = 0;
          }
        })
        .catch(() => undefined);
    };

    refreshPatrolSurface();

    const frame = (time: number) => {
      const deltaMs = time - previousTime;
      previousTime = time;
      refreshElapsedMs += deltaMs;
      migrationElapsedMs += deltaMs;
      restDecisionElapsedMs += deltaMs;

      if (refreshElapsedMs >= SURFACE_REFRESH_MS) {
        refreshElapsedMs = 0;
        refreshPatrolSurface();
      }

      petState.current = tickPet(petState.current, {
        deltaMs,
        preferences: interaction.preferences,
        cursor: null,
        screen: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });

      if (interaction.preferences.patrolEnabled && activeSurface && !manualDragging.current) {
        patrolState ??= createInitialPatrolState(activeSurface);
        if (
          manualDragAnchor.current &&
          dragAnchorVersion.current !== handledDragAnchorVersion
        ) {
          patrolState = createAnchoredPatrolState(
            activeSurface,
            manualDragAnchor.current,
            canvasSize
          );
          handledDragAnchorVersion = dragAnchorVersion.current;
          petState.current = {
            ...petState.current,
            behavior: "look",
            target: null,
            position: patrolState.position,
            elapsedInStateMs: 0
          };
        }
        const patrolStep = planPatrolStep({
          state: patrolState,
          surface: activeSurface,
          deltaMs,
          petSize: canvasSize,
          restRoll:
            restDecisionElapsedMs >= REST_DECISION_MS ? Math.random() : undefined,
          restSurface: activeRestSurface,
          roamTarget:
            activeSurface.kind === "screen-roam" && !patrolState.roamTarget
              ? createRandomRoamTarget(activeSurface, canvasSize)
              : undefined,
          speedPxPerMs: PATROL_SPEEDS[interaction.preferences.patrolIntensity]
        });
        patrolState = patrolStep;
        restDecisionElapsedMs =
          restDecisionElapsedMs >= REST_DECISION_MS ? 0 : restDecisionElapsedMs;
        petState.current = {
          ...petState.current,
          behavior: patrolStep.behavior,
          facing: patrolStep.facing,
          position: patrolStep.position
        };
        void applyWindowState({
          ...interaction,
          position: patrolStep.position
        }).catch(() => undefined);
      }

      const companionResult = advanceCompanion(companionState.current, {
        deltaMs,
        currentBehavior: petState.current.behavior,
        energyPreference: interaction.preferences.energy,
        pettingReaction: pendingPettingReaction.current,
        restSpotId: patrolState?.targetRestSpot?.id ?? null,
        nowMs: Date.now()
      });
      pendingPettingReaction.current = null;
      companionState.current = companionResult.state;

      if (companionResult.intent.type === "animate") {
        petState.current = {
          ...petState.current,
          behavior: companionResult.intent.behavior,
          elapsedInStateMs: 0
        };
      }

      if (companionResult.memoryChanged) {
        void saveCompanionMemory(companionResult.state.memory).catch(() => undefined);
      }

      renderer.draw(petState.current);

      const cue =
        selectCompanionSoundCue({
          behavior: petState.current.behavior,
          atlasCue:
            spriteAssetsRef.current?.atlas.animations[petState.current.behavior]?.soundCue ??
            ANIMATIONS[petState.current.behavior]?.soundCue,
          pettingReaction: lastPettingReaction.current,
          muted: interaction.preferences.muted,
          elapsedSinceLastCueMs: time - lastSoundAt
        });
      if (cue) {
        soundPlayer.play(cue, false);
        lastSoundAt = time;
      }
      lastPettingReaction.current = null;

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [interaction, windowLabel]);

  if (windowLabel === "settings") {
    return (
      <SettingsApp
        interaction={interaction}
        onCommand={(command) => {
          setInteraction((current) => reduceInteractionState(current, command));
          void sendPetCommandToPet(command).catch(() => undefined);
        }}
      />
    );
  }

  return (
    <main className="pet-stage" aria-label="PawPal desktop pet">
      <canvas
        ref={canvasRef}
        className="pet-canvas"
        width={canvasSize}
        height={canvasSize}
        style={{
          width: `${canvasSize}px`,
          height: `${canvasSize}px`
        }}
        onPointerDown={() => {
          if (!interaction.preferences.clickThrough) {
            manualDragging.current = true;
            void startPetDrag().catch(() => undefined);
          }
        }}
        onPointerUp={scheduleDragSettle}
        onPointerCancel={scheduleDragSettle}
        onPointerMove={(event) => {
          if (interaction.preferences.clickThrough) return;
          if (manualDragging.current) return;

          const now = performance.now();
          const result = updatePettingGesture(pettingGesture.current, {
            point: {
              x: event.nativeEvent.offsetX,
              y: event.nativeEvent.offsetY
            },
            deltaMs: now - previousPettingTime.current
          });
          previousPettingTime.current = now;
          pettingGesture.current = result.state;

          if (result.reaction) {
            lastPettingReaction.current = result.reaction;
            pendingPettingReaction.current = result.reaction;
            petState.current = {
              ...petState.current,
              behavior: pettingReactionToBehavior(result.reaction),
              elapsedInStateMs: 0
            };
          }
        }}
      />
    </main>
  );
}

function createRandomRoamTarget(surface: PatrolSurface, petSize: number) {
  return {
    x: surface.rect.x + Math.random() * Math.max(0, surface.rect.width - petSize),
    y: surface.rect.y + Math.random() * Math.max(0, surface.rect.height - petSize)
  };
}
