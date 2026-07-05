import {
  createSurfaceRestSpots,
  positionPetOnSurface,
  positionPetOnSurfacePath,
  type SurfacePathEdge,
  type PatrolSurface,
  type SurfaceRestSpot
} from "./patrolSurface";
import type { PetBehavior, PetState, Point } from "./types";

export type PatrolDirection = "left" | "right";
export type PatrolMode = "walking" | "perching" | "sleeping" | "waking";

export interface PatrolState {
  surfaceId: string;
  position: Point;
  direction: PatrolDirection;
  pauseMs: number;
  mode: PatrolMode;
  modeMs: number;
  stableSurfaceMs: number;
  targetRestSpot: SurfaceRestSpot | null;
  frameProgress: number;
  frameEdge: SurfacePathEdge;
}

export interface PatrolPlannerInput {
  state: PatrolState;
  surface: PatrolSurface;
  deltaMs: number;
  speedPxPerMs?: number;
  petSize?: number;
  restRoll?: number;
}

export interface PatrolStep extends PatrolState {
  behavior: PetBehavior;
  facing: PetState["facing"];
}

const DEFAULT_PATROL_SPEED_PX_PER_MS = 0.045;
const DEFAULT_PET_SIZE = 96;
const MIN_SLEEP_SURFACE_STABLE_MS = 8_000;
const SLEEP_ROLL_THRESHOLD = 0.08;
const PERCH_DURATION_MS = 1_400;
const SLEEP_DURATION_MS = 5_000;
const WAKE_DURATION_MS = 700;

export function createInitialPatrolState(surface: PatrolSurface): PatrolState {
  return {
    surfaceId: surface.id,
    position: positionPetOnSurface(surface, surface.minX, "walking", DEFAULT_PET_SIZE),
    direction: "right",
    pauseMs: 0,
    mode: "walking",
    modeMs: 0,
    stableSurfaceMs: 0,
    targetRestSpot: null,
    frameProgress: 0,
    frameEdge: "top"
  };
}

export function planPatrolStep(input: PatrolPlannerInput): PatrolStep {
  const petSize = input.petSize ?? DEFAULT_PET_SIZE;
  const surfaceChanged = input.state.surfaceId !== input.surface.id;
  const state = surfaceChanged ? createInitialPatrolState(input.surface) : input.state;
  const stableSurfaceMs = surfaceChanged
    ? input.deltaMs
    : state.stableSurfaceMs + input.deltaMs;
  const frameProgress = state.frameProgress ?? 0;
  const lanePosition = clampToLane(state.position, input.surface, petSize);

  if (state.mode === "sleeping") {
    const modeMs = state.modeMs + input.deltaMs;
    if (modeMs < SLEEP_DURATION_MS) {
      return {
        ...state,
        stableSurfaceMs,
        modeMs,
        position: positionPetOnSurface(input.surface, lanePosition.x, "sleeping", petSize),
        frameProgress,
        behavior: "sleep",
        facing: state.direction === "right" ? "right" : "left"
      };
    }

    return {
      ...state,
      stableSurfaceMs,
      mode: "waking",
      modeMs: 0,
      position: positionPetOnSurface(input.surface, lanePosition.x, "perching", petSize),
      frameProgress,
      behavior: "wake",
      facing: state.direction === "right" ? "right" : "left"
    };
  }

  if (state.mode === "waking") {
    const modeMs = state.modeMs + input.deltaMs;
    if (modeMs < WAKE_DURATION_MS) {
      return {
        ...state,
        stableSurfaceMs,
        modeMs,
        position: positionPetOnSurface(input.surface, lanePosition.x, "perching", petSize),
        frameProgress,
        behavior: "wake",
        facing: state.direction === "right" ? "right" : "left"
      };
    }

    return {
      ...state,
      stableSurfaceMs,
      mode: "walking",
      modeMs: 0,
      targetRestSpot: null,
      position: positionPetOnSurface(input.surface, lanePosition.x, "walking", petSize),
      frameProgress,
      behavior: "walk",
      facing: state.direction === "right" ? "right" : "left"
    };
  }

  if (
    input.surface.kind !== "screen-edge" &&
    stableSurfaceMs >= MIN_SLEEP_SURFACE_STABLE_MS &&
    (input.restRoll ?? 1) < SLEEP_ROLL_THRESHOLD
  ) {
    const restSpot = chooseRestSpot(input.surface, lanePosition.x);

    return {
      ...state,
      stableSurfaceMs,
      mode: "sleeping",
      modeMs: 0,
      targetRestSpot: restSpot,
      position: positionPetOnSurface(input.surface, restSpot.x, "sleeping", petSize),
      frameProgress,
      pauseMs: 0,
      behavior: "sleep",
      facing: state.direction === "right" ? "right" : "left"
    };
  }

  if (state.pauseMs > 0) {
    return {
      ...state,
      stableSurfaceMs,
      position: lanePosition,
      pauseMs: Math.max(0, state.pauseMs - input.deltaMs),
      mode: "perching",
      modeMs: Math.min(PERCH_DURATION_MS, state.modeMs + input.deltaMs),
      frameProgress,
      behavior: "look",
      facing: state.direction === "right" ? "right" : "left"
    };
  }

  const speed = input.speedPxPerMs ?? DEFAULT_PATROL_SPEED_PX_PER_MS;

  if (input.surface.kind !== "screen-edge") {
    const nextProgress = frameProgress + input.deltaMs * speed;
    const pathPoint = positionPetOnSurfacePath(input.surface, nextProgress, "walking", petSize);

    return {
      surfaceId: input.surface.id,
      position: pathPoint.position,
      direction: pathPoint.edge === "left" || pathPoint.edge === "bottom" ? "left" : "right",
      pauseMs: 0,
      mode: "walking",
      modeMs: 0,
      stableSurfaceMs,
      targetRestSpot: null,
      frameProgress: pathPoint.progress,
      frameEdge: pathPoint.edge,
      behavior: "walk",
      facing: pathPoint.edge === "left" || pathPoint.edge === "bottom" ? "left" : "right"
    };
  }

  const signedStep = input.deltaMs * speed * (state.direction === "right" ? 1 : -1);
  const nextX = lanePosition.x + signedStep;
  const reachedRight = nextX >= input.surface.maxX;
  const reachedLeft = nextX <= input.surface.minX;
  const direction = reachedRight ? "left" : reachedLeft ? "right" : state.direction;
  const x = reachedRight ? input.surface.maxX : reachedLeft ? input.surface.minX : nextX;

  return {
    surfaceId: input.surface.id,
    position: positionPetOnSurface(input.surface, x, "walking", petSize),
    direction,
    pauseMs: reachedRight || reachedLeft ? 350 : 0,
    mode: reachedRight || reachedLeft ? "perching" : "walking",
    modeMs: 0,
    stableSurfaceMs,
    targetRestSpot: null,
    frameProgress: 0,
    frameEdge: "top",
    behavior: reachedRight || reachedLeft ? "look" : "walk",
    facing: direction === "right" ? "right" : "left"
  };
}

function clampToLane(position: Point, surface: PatrolSurface, petSize: number): Point {
  return positionPetOnSurface(surface, position.x, "walking", petSize);
}

function chooseRestSpot(surface: PatrolSurface, currentX: number): SurfaceRestSpot {
  return createSurfaceRestSpots(surface).reduce((nearest, spot) => {
    return Math.abs(spot.x - currentX) < Math.abs(nearest.x - currentX) ? spot : nearest;
  });
}
