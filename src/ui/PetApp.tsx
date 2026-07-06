import { useEffect, useRef, useState, type PointerEvent } from "react";
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
  loadCompanionMemory,
  loadCursorLogicalPosition,
  loadScreenPatrolSurfaces,
  loadInteractionState,
  reduceInteractionState,
  saveCompanionMemory,
  saveInteractionState,
  setPetWindowCursorIgnoring,
  sendPetCommandToPet
} from "./petWindow";
import {
  loadFocusedTypingBounds,
  loadFrontWindowSurface
} from "./nativeSurfaces";
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
import {
  createTypingAvoidanceZone,
  isAvoidanceZoneActive,
  type AvoidanceZone
} from "../core/typingGuard";
import { advanceTrajectoryPosition } from "../core/trajectory";
import {
  isCursorInsidePetHitbox,
  toOverlayLocalPosition
} from "../core/overlayStage";
import { selectCursorAwareness } from "../core/cursorAwareness";

const BASE_CANVAS_SIZE = 96;
const SURFACE_REFRESH_MS = 3_000;
const TYPING_GUARD_REFRESH_MS = 750;
const PATROL_TRAJECTORY_MAX_SPEED_PX_PER_MS = 0.25;
const CURSOR_HIT_TEST_MS = 120;
const MAX_ANIMATION_DELTA_MS = 32;
const REST_DECISION_MS = 3_000;
const DRAG_SETTLE_MS = 900;
const DRAG_SESSION_MS = 5_000;
const PETTING_AFTER_DRAG_SUPPRESS_MS = 900;
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
  const manualDragOffset = useRef<Point | null>(null);
  const manualDragAnchor = useRef<Point | null>(null);
  const pendingManualDragAnchor = useRef<Point | null>(null);
  const dragAnchorVersion = useRef(0);
  const dragInteractionUntil = useRef(0);
  const ignorePettingUntil = useRef(0);
  const dragSettleTimeout = useRef<number | null>(null);
  const stageOrigin = useRef<Point>({ x: 0, y: 0 });
  const renderedPetPosition = useRef<Point>(DEFAULT_WINDOW_POSITION);
  const cursorPosition = useRef<Point | null>(null);
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
      commitManualDragAnchor();
    }, DRAG_SETTLE_MS);
  };

  const commitManualDragAnchor = () => {
    manualDragging.current = false;
    manualDragOffset.current = null;
    dragInteractionUntil.current = 0;
    ignorePettingUntil.current = performance.now() + PETTING_AFTER_DRAG_SUPPRESS_MS;
    dragSettleTimeout.current = null;

    const anchor = pendingManualDragAnchor.current;
    pendingManualDragAnchor.current = null;
    if (!anchor) return;

    if (
      manualDragAnchor.current &&
      manualDragAnchor.current.x === anchor.x &&
      manualDragAnchor.current.y === anchor.y
    ) {
      return;
    }

    manualDragAnchor.current = anchor;
    dragAnchorVersion.current += 1;
    setInteraction((current) => applyPetMove(current, anchor, "drag"));
  };

  const beginManualDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    manualDragging.current = true;
    dragInteractionUntil.current = performance.now() + DRAG_SESSION_MS;
    ignorePettingUntil.current = dragInteractionUntil.current;
    pendingManualDragAnchor.current = renderedPetPosition.current;
    manualDragOffset.current = {
      x: stageOrigin.current.x + event.clientX - renderedPetPosition.current.x,
      y: stageOrigin.current.y + event.clientY - renderedPetPosition.current.y
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateManualDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    const offset = manualDragOffset.current;
    if (!offset) return;

    pendingManualDragAnchor.current = {
      x: stageOrigin.current.x + event.clientX - offset.x,
      y: stageOrigin.current.y + event.clientY - offset.y
    };
    ignorePettingUntil.current = performance.now() + PETTING_AFTER_DRAG_SUPPRESS_MS;
  };

  const endManualDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    scheduleDragSettle();
  };

  useEffect(() => {
    let disposed = false;

    loadInteractionState()
      .then((state) => {
        if (!disposed) {
          manualDragAnchor.current = state.position;
          dragAnchorVersion.current += 1;
          setInteraction(state);
        }
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
      void applyWindowState(interaction)
        .then((stage) => {
          if (stage) {
            stageOrigin.current = { x: stage.x, y: stage.y };
          }
        })
        .catch(() => undefined);
    }
    void saveInteractionState(interaction).catch(() => undefined);
    void applyLaunchAtLogin(interaction.preferences.launchAtLogin).catch(() => undefined);
  }, [interaction, windowLabel]);

  useEffect(() => {
    let unlistenCommands: (() => void) | undefined;

    void listenForPetCommands((command) => {
      setInteraction((current) => reduceInteractionState(current, command));
    }).then((unlisten) => {
      unlistenCommands = unlisten;
    });

    return () => {
      unlistenCommands?.();
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
    let visiblePatrolPosition: Point | null = null;
    let refreshElapsedMs = SURFACE_REFRESH_MS;
    let typingGuardRefreshElapsedMs = TYPING_GUARD_REFRESH_MS;
    let migrationElapsedMs = SURFACE_REFRESH_MS;
    let restDecisionElapsedMs = 0;
    let frontWindowMissingMs = 0;
    let handledDragAnchorVersion = dragAnchorVersion.current;
    let typingAvoidanceZones: AvoidanceZone[] = [];
    let typingGuardRequestVersion = 0;
    let patrolSurfaceRefreshInFlight = false;
    let typingGuardRefreshInFlight = false;
    let disposed = false;
    let cursorHitTestElapsedMs = CURSOR_HIT_TEST_MS;
    let ignoringCursorEvents: boolean | null = null;

    const renderPetAt = (position: Point) => {
      renderedPetPosition.current = position;
      const localPosition = toOverlayLocalPosition(stageOrigin.current, position);
      canvas.style.transform = `translate3d(${localPosition.x}px, ${localPosition.y}px, 0)`;
    };

    const setCursorIgnoring = (ignore: boolean) => {
      if (ignoringCursorEvents === ignore) return;

      ignoringCursorEvents = ignore;
      void setPetWindowCursorIgnoring(ignore).catch(() => undefined);
    };

    const refreshCursorHandling = () => {
      void loadCursorLogicalPosition()
        .then((cursor) => {
          if (disposed) return;
          cursorPosition.current = cursor;

          if (interaction.preferences.clickThrough) {
            setCursorIgnoring(true);
            return;
          }

          if (manualDragging.current) {
            setCursorIgnoring(false);
            return;
          }

          const cursorOutsidePet = !isCursorInsidePetHitbox(
            cursor,
            renderedPetPosition.current,
            canvasSize
          );
          setCursorIgnoring(cursorOutsidePet);
        })
        .catch(() => {
          cursorPosition.current = null;
          setCursorIgnoring(true);
        });
    };

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

      if (patrolSurfaceRefreshInFlight) return;
      patrolSurfaceRefreshInFlight = true;

      const surfaceAnchor = renderedPetPosition.current;
      void Promise.all([
        loadFrontWindowSurface(),
        loadScreenPatrolSurfaces(surfaceAnchor)
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
            visiblePatrolPosition = patrolState.position;
            handledDragAnchorVersion = dragAnchorVersion.current;
            migrationElapsedMs = 0;
          }
        })
        .catch(() => undefined)
        .finally(() => {
          patrolSurfaceRefreshInFlight = false;
        });
    };

    const refreshTypingGuard = (nowMs: number) => {
      if (!interaction.preferences.typingGuardEnabled) {
        typingAvoidanceZones = [];
        return;
      }

      if (typingGuardRefreshInFlight) return;
      typingGuardRefreshInFlight = true;
      const requestVersion = (typingGuardRequestVersion += 1);

      void loadFocusedTypingBounds()
        .then((bounds) => {
          if (requestVersion !== typingGuardRequestVersion) return;

          const zone = bounds
            ? createTypingAvoidanceZone(bounds, {
                nowMs,
                petSize: canvasSize
              })
            : null;
          typingAvoidanceZones = zone ? [zone] : [];
        })
        .catch(() => {
          if (requestVersion === typingGuardRequestVersion) {
            typingAvoidanceZones = [];
          }
        })
        .finally(() => {
          typingGuardRefreshInFlight = false;
        });
    };

    refreshPatrolSurface();
    refreshTypingGuard(performance.now());

    const frame = (time: number) => {
      const deltaMs = time - previousTime;
      const animationDeltaMs = Math.min(Math.max(deltaMs, 0), MAX_ANIMATION_DELTA_MS);
      previousTime = time;
      refreshElapsedMs += deltaMs;
      typingGuardRefreshElapsedMs += deltaMs;
      migrationElapsedMs += deltaMs;
      restDecisionElapsedMs += deltaMs;
      cursorHitTestElapsedMs += deltaMs;

      if (refreshElapsedMs >= SURFACE_REFRESH_MS) {
        refreshElapsedMs = 0;
        refreshPatrolSurface();
      }

      if (!interaction.preferences.typingGuardEnabled) {
        typingAvoidanceZones = [];
      } else if (typingGuardRefreshElapsedMs >= TYPING_GUARD_REFRESH_MS) {
        typingGuardRefreshElapsedMs = 0;
        refreshTypingGuard(time);
      }
      typingAvoidanceZones = typingAvoidanceZones.filter((zone) => {
        return isAvoidanceZoneActive(zone, time);
      });

      petState.current = tickPet(petState.current, {
        deltaMs: animationDeltaMs,
        preferences: interaction.preferences,
        cursor: cursorPosition.current,
        screen: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });

      if (manualDragging.current) {
        const dragPosition =
          pendingManualDragAnchor.current ?? visiblePatrolPosition ?? renderedPetPosition.current;
        visiblePatrolPosition = dragPosition;
        petState.current = {
          ...petState.current,
          behavior: "look",
          target: null,
          position: dragPosition,
          elapsedInStateMs: 0
        };
      } else if (interaction.preferences.patrolEnabled && activeSurface) {
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
          visiblePatrolPosition = patrolState.position;
        }
        const activeTypingAvoidanceZones = interaction.preferences.typingGuardEnabled
          ? typingAvoidanceZones
          : [];
        const patrolStep = planPatrolStep({
          state: patrolState,
          surface: activeSurface,
          deltaMs: animationDeltaMs,
          petSize: canvasSize,
          restRoll:
            restDecisionElapsedMs >= REST_DECISION_MS ? Math.random() : undefined,
          restSurface: activeRestSurface,
          roamTarget:
            activeSurface.kind === "screen-roam" && !patrolState.roamTarget
              ? createRandomRoamTarget(activeSurface, canvasSize)
              : undefined,
          avoidanceZones: activeTypingAvoidanceZones,
          nowMs: time,
          speedPxPerMs: PATROL_SPEEDS[interaction.preferences.patrolIntensity]
        });
        patrolState = patrolStep;
        visiblePatrolPosition = advanceTrajectoryPosition(
          visiblePatrolPosition ?? patrolStep.position,
          patrolStep.position,
          animationDeltaMs,
          { maxSpeedPxPerMs: PATROL_TRAJECTORY_MAX_SPEED_PX_PER_MS }
        );
        restDecisionElapsedMs =
          restDecisionElapsedMs >= REST_DECISION_MS ? 0 : restDecisionElapsedMs;
        petState.current = {
          ...petState.current,
          behavior: patrolStep.behavior,
          facing: patrolStep.facing,
          position: visiblePatrolPosition
        };
      } else {
        const restingPosition = manualDragAnchor.current ?? interaction.position;
        visiblePatrolPosition = restingPosition;
        petState.current = {
          ...petState.current,
          position: restingPosition
        };
      }

      const companionResult = advanceCompanion(companionState.current, {
        deltaMs: animationDeltaMs,
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

      const cursorAwareness = selectCursorAwareness({
        currentBehavior: petState.current.behavior,
        currentFacing: petState.current.facing,
        cursor: cursorPosition.current,
        petPosition: petState.current.position,
        petSize: canvasSize
      });
      if (cursorAwareness.aware) {
        petState.current = {
          ...petState.current,
          behavior: cursorAwareness.behavior ?? petState.current.behavior,
          facing: cursorAwareness.facing,
          elapsedInStateMs: cursorAwareness.behavior ? 0 : petState.current.elapsedInStateMs
        };
      }

      renderPetAt(petState.current.position);
      if (cursorHitTestElapsedMs >= CURSOR_HIT_TEST_MS) {
        cursorHitTestElapsedMs = 0;
        refreshCursorHandling();
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
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
    };
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
        onPointerDown={(event) => {
          if (!interaction.preferences.clickThrough) {
            beginManualDrag(event);
          }
        }}
        onPointerUp={endManualDrag}
        onPointerCancel={endManualDrag}
        onPointerMove={(event) => {
          if (interaction.preferences.clickThrough) return;
          if (manualDragging.current) {
            updateManualDrag(event);
            return;
          }

          const now = performance.now();
          if (now <= ignorePettingUntil.current) return;

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
