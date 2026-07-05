import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createInitialPetState, tickPet } from "../core/behavior";
import {
  createInitialPatrolState,
  planPatrolStep,
  type PatrolState
} from "../core/patrolPlanner";
import { choosePatrolSurface, shouldMigrateSurface } from "../core/patrolSelector";
import type { PatrolSurface } from "../core/patrolSurface";
import { DEFAULT_PREFERENCES } from "../core/preferences";
import { createSpriteRenderer } from "../core/renderer";
import type { PetState } from "../core/types";
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
  loadScreenEdgePatrolSurfaces,
  loadInteractionState,
  reduceInteractionState,
  saveInteractionState,
  sendPetCommandToPet,
  startPetDrag
} from "./petWindow";
import { loadFrontWindowSurface } from "./nativeSurfaces";
import { createSoundPlayer, loadDefaultSpriteAssets } from "./defaultAssets";
import { ANIMATIONS } from "../core/animations";
import { SettingsApp } from "./SettingsApp";
import type { SpriteRuntimeAssets } from "../core/renderer";

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
  const spriteAssetsRef = useRef<SpriteRuntimeAssets | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>({
    preferences: DEFAULT_PREFERENCES,
    position: DEFAULT_WINDOW_POSITION
  });
  const canvasSize = Math.round(BASE_CANVAS_SIZE * interaction.preferences.scale);

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
        setInteraction((current) => applyPetMove(current, position));
      }).then((unlisten) => {
        unlistenMoves = unlisten;
      });
    }

    return () => {
      unlistenCommands?.();
      unlistenMoves?.();
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
    let previousCue: string | undefined;
    let activeSurface: PatrolSurface | null = null;
    let patrolState: PatrolState | null = null;
    let refreshElapsedMs = SURFACE_REFRESH_MS;
    let migrationElapsedMs = SURFACE_REFRESH_MS;
    let restDecisionElapsedMs = 0;

    void loadDefaultSpriteAssets()
      .then((assets) => {
        spriteAssetsRef.current = assets;
        renderer.setSpriteAssets(assets);
      })
      .catch(() => undefined);

    const refreshPatrolSurface = () => {
      if (!interaction.preferences.patrolEnabled) {
        activeSurface = null;
        patrolState = null;
        return;
      }

      void Promise.all([
        loadFrontWindowSurface(),
        loadScreenEdgePatrolSurfaces(interaction.position)
      ])
        .then(([frontWindow, fallbackSurfaces]) => {
          if (fallbackSurfaces.length === 0) return;

          const nextSurface = choosePatrolSurface({
            preferred: interaction.preferences.patrolSurfacePreference,
            frontWindow,
            fallbackSurfaces
          });

          if (
            shouldMigrateSurface(activeSurface?.id ?? null, nextSurface.id, migrationElapsedMs)
          ) {
            activeSurface = nextSurface;
            patrolState = createInitialPatrolState(nextSurface);
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

      if (interaction.preferences.patrolEnabled && activeSurface) {
        patrolState ??= createInitialPatrolState(activeSurface);
        const patrolStep = planPatrolStep({
          state: patrolState,
          surface: activeSurface,
          deltaMs,
          petSize: canvasSize,
          restRoll:
            restDecisionElapsedMs >= REST_DECISION_MS ? Math.random() : undefined,
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

      renderer.draw(petState.current);

      const cue =
        spriteAssetsRef.current?.atlas.animations[petState.current.behavior]?.soundCue ??
        ANIMATIONS[petState.current.behavior]?.soundCue;
      if (cue && cue !== previousCue) {
        soundPlayer.play(cue, interaction.preferences.muted);
      }
      previousCue = cue;

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
            void startPetDrag().catch(() => undefined);
          }
        }}
      />
    </main>
  );
}
