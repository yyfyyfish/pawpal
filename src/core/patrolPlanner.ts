import {
  createSurfaceRestSpots,
  positionPetOnSurface,
  positionPetOnSurfacePath,
  type SurfacePathEdge,
  type PatrolSurface,
  type SurfaceRestSpot
} from "./patrolSurface";
import {
  petRectOverlapsAvoidanceZones,
  type AvoidanceZone
} from "./typingGuard";
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
  roamTarget: Point | null;
}

export interface PatrolPlannerInput {
  state: PatrolState;
  surface: PatrolSurface;
  restSurface?: PatrolSurface | null;
  deltaMs: number;
  speedPxPerMs?: number;
  petSize?: number;
  restRoll?: number;
  roamTarget?: Point | null;
  avoidanceZones?: AvoidanceZone[];
  nowMs?: number;
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
const DRAG_ANCHOR_PAUSE_MS = 1_500;
const AVOIDANCE_RETREAT_SPEED_MULTIPLIER = 4;

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
    frameEdge: "top",
    roamTarget: null
  };
}

export function createAnchoredPatrolState(
  surface: PatrolSurface,
  position: Point,
  petSize: number = DEFAULT_PET_SIZE
): PatrolState {
  const initial = createInitialPatrolState(surface);
  const anchoredPosition =
    surface.kind === "screen-roam"
      ? clampToRoamBounds(position, surface, petSize)
      : positionPetOnSurface(surface, position.x, "walking", petSize);

  return {
    ...initial,
    position: anchoredPosition,
    direction: anchoredPosition.x >= initial.position.x ? "right" : "left",
    pauseMs: DRAG_ANCHOR_PAUSE_MS,
    mode: "perching",
    roamTarget: null
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
  const avoidanceZones = input.avoidanceZones ?? [];
  const nowMs = input.nowMs ?? 0;
  const appRestSurface =
    input.restSurface ?? (input.surface.kind !== "screen-roam" ? input.surface : null);
  const lanePosition = clampToLane(state.position, input.surface, petSize);
  const currentOverlapsAvoidance = overlapsAvoidance(
    state.position,
    petSize,
    avoidanceZones,
    nowMs
  );

  if (state.mode === "sleeping") {
    if (currentOverlapsAvoidance) {
      return {
        ...state,
        stableSurfaceMs,
        mode: "waking",
        modeMs: 0,
        position: state.position,
        frameProgress,
        behavior: "wake",
        facing: state.direction === "right" ? "right" : "left"
      };
    }

    const modeMs = state.modeMs + input.deltaMs;
    if (modeMs < SLEEP_DURATION_MS) {
      return {
        ...state,
        stableSurfaceMs,
        modeMs,
        position: state.position,
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
      position: state.position,
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
        position: state.position,
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
      position: input.surface.kind === "screen-roam" ? state.position : lanePosition,
      frameProgress,
      behavior: "walk",
      facing: state.direction === "right" ? "right" : "left"
    };
  }

  if (
    appRestSurface &&
    stableSurfaceMs >= MIN_SLEEP_SURFACE_STABLE_MS &&
    (input.restRoll ?? 1) < SLEEP_ROLL_THRESHOLD
  ) {
    const restSpot = chooseRestSpot(
      appRestSurface,
      state.position.x,
      petSize,
      avoidanceZones,
      nowMs
    );

    if (!restSpot) {
      return {
        ...state,
        stableSurfaceMs,
        position: input.surface.kind === "screen-roam" ? state.position : lanePosition,
        frameProgress,
        behavior: "look",
        facing: state.direction === "right" ? "right" : "left"
      };
    }

    return {
      ...state,
      stableSurfaceMs,
      mode: "sleeping",
      modeMs: 0,
      targetRestSpot: restSpot,
      position: positionPetOnSurface(appRestSurface, restSpot.x, "sleeping", petSize),
      frameProgress,
      pauseMs: 0,
      behavior: "sleep",
      facing: state.direction === "right" ? "right" : "left"
    };
  }

  if (state.pauseMs > 0 && !currentOverlapsAvoidance) {
    return {
      ...state,
      stableSurfaceMs,
      position: input.surface.kind === "screen-roam" ? state.position : lanePosition,
      pauseMs: Math.max(0, state.pauseMs - input.deltaMs),
      mode: "perching",
      modeMs: Math.min(PERCH_DURATION_MS, state.modeMs + input.deltaMs),
      frameProgress,
      behavior: "look",
      facing: state.direction === "right" ? "right" : "left"
    };
  }

  const speed = input.speedPxPerMs ?? DEFAULT_PATROL_SPEED_PX_PER_MS;

  if (input.surface.kind === "screen-roam") {
    const requestedTarget =
      state.roamTarget ?? input.roamTarget ?? screenRoamFallbackTarget(input.surface);
    const target = safeRoamTarget(
      requestedTarget,
      state.position,
      input.surface,
      petSize,
      avoidanceZones,
      nowMs
    );
    const nextPosition = moveToward(
      state.position,
      clampToRoamBounds(target, input.surface, petSize),
      input.deltaMs *
        speed *
        (currentOverlapsAvoidance ? AVOIDANCE_RETREAT_SPEED_MULTIPLIER : 1),
      input.surface,
      petSize
    );
    const reachedTarget = distance(nextPosition, target) < 8;

    return {
      surfaceId: input.surface.id,
      position: nextPosition,
      direction: nextPosition.x >= state.position.x ? "right" : "left",
      pauseMs: reachedTarget ? 500 : 0,
      mode: reachedTarget ? "perching" : "walking",
      modeMs: 0,
      stableSurfaceMs,
      targetRestSpot: null,
      frameProgress: 0,
      frameEdge: "top",
      roamTarget: reachedTarget ? null : target,
      behavior: reachedTarget ? "look" : "walk",
      facing: nextPosition.x >= state.position.x ? "right" : "left"
    };
  }

  if (input.surface.kind !== "screen-edge") {
    const nextProgress = frameProgress + input.deltaMs * speed;
    const pathPoint = safePathPoint(
      input.surface,
      nextProgress,
      Math.max(petSize * 0.75, input.deltaMs * speed),
      petSize,
      avoidanceZones,
      nowMs
    );

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
      roamTarget: null,
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
    roamTarget: null,
    behavior: reachedRight || reachedLeft ? "look" : "walk",
    facing: direction === "right" ? "right" : "left"
  };
}

function safeRoamTarget(
  requestedTarget: Point,
  current: Point,
  surface: PatrolSurface,
  petSize: number,
  avoidanceZones: AvoidanceZone[],
  nowMs: number
): Point {
  const target = clampToRoamBounds(requestedTarget, surface, petSize);
  if (!overlapsAvoidance(target, petSize, avoidanceZones, nowMs)) return target;

  return roamEscapeCandidates(surface, petSize)
    .filter((candidate) => !overlapsAvoidance(candidate, petSize, avoidanceZones, nowMs))
    .sort((a, b) => distance(b, current) - distance(a, current))[0] ?? target;
}

function safePathPoint(
  surface: PatrolSurface,
  progress: number,
  sampleStep: number,
  petSize: number,
  avoidanceZones: AvoidanceZone[],
  nowMs: number
): ReturnType<typeof positionPetOnSurfacePath> {
  for (let sample = 0; sample < 24; sample += 1) {
    const candidate = positionPetOnSurfacePath(
      surface,
      progress + sample * sampleStep,
      "walking",
      petSize
    );
    if (!overlapsAvoidance(candidate.position, petSize, avoidanceZones, nowMs)) {
      return candidate;
    }
  }

  return positionPetOnSurfacePath(surface, progress, "walking", petSize);
}

function roamEscapeCandidates(surface: PatrolSurface, petSize: number): Point[] {
  const left = surface.rect.x;
  const top = surface.rect.y;
  const right = surface.rect.x + surface.rect.width - petSize;
  const bottom = surface.rect.y + surface.rect.height - petSize;
  const centerX = left + (right - left) / 2;
  const centerY = top + (bottom - top) / 2;

  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
    { x: centerX, y: top },
    { x: centerX, y: bottom },
    { x: left, y: centerY },
    { x: right, y: centerY }
  ].map((candidate) => clampToRoamBounds(candidate, surface, petSize));
}

function overlapsAvoidance(
  position: Point,
  petSize: number,
  avoidanceZones: AvoidanceZone[],
  nowMs: number
): boolean {
  return petRectOverlapsAvoidanceZones(position, petSize, avoidanceZones, nowMs);
}

function moveToward(
  current: Point,
  target: Point,
  maxDistance: number,
  surface: PatrolSurface,
  petSize: number
): Point {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const remaining = Math.hypot(dx, dy);

  if (remaining <= maxDistance || remaining === 0) {
    return clampToRoamBounds(target, surface, petSize);
  }

  return clampToRoamBounds(
    {
      x: current.x + (dx / remaining) * maxDistance,
      y: current.y + (dy / remaining) * maxDistance
    },
    surface,
    petSize
  );
}

function clampToRoamBounds(point: Point, surface: PatrolSurface, petSize: number): Point {
  return {
    x: clamp(point.x, surface.rect.x, surface.rect.x + surface.rect.width - petSize),
    y: clamp(point.y, surface.rect.y, surface.rect.y + surface.rect.height - petSize)
  };
}

function screenRoamFallbackTarget(surface: PatrolSurface): Point {
  return {
    x: surface.rect.x + surface.rect.width * 0.72,
    y: surface.rect.y + surface.rect.height * 0.58
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function clampToLane(position: Point, surface: PatrolSurface, petSize: number): Point {
  return positionPetOnSurface(surface, position.x, "walking", petSize);
}

function chooseRestSpot(
  surface: PatrolSurface,
  currentX: number,
  petSize: number,
  avoidanceZones: AvoidanceZone[],
  nowMs: number
): SurfaceRestSpot | null {
  const spots = createSurfaceRestSpots(surface)
    .sort((first, second) => Math.abs(first.x - currentX) - Math.abs(second.x - currentX));

  return (
    spots.find((spot) => {
      const position = positionPetOnSurface(surface, spot.x, "sleeping", petSize);
      return !overlapsAvoidance(position, petSize, avoidanceZones, nowMs);
    }) ?? null
  );
}
