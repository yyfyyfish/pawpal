import type { PatrolSurface } from "./patrolSurface";
import type { PetBehavior, PetState, Point } from "./types";

export type PatrolDirection = "left" | "right";

export interface PatrolState {
  surfaceId: string;
  position: Point;
  direction: PatrolDirection;
  pauseMs: number;
}

export interface PatrolPlannerInput {
  state: PatrolState;
  surface: PatrolSurface;
  deltaMs: number;
  speedPxPerMs?: number;
}

export interface PatrolStep extends PatrolState {
  behavior: PetBehavior;
  facing: PetState["facing"];
}

const DEFAULT_PATROL_SPEED_PX_PER_MS = 0.045;

export function createInitialPatrolState(surface: PatrolSurface): PatrolState {
  return {
    surfaceId: surface.id,
    position: {
      x: surface.minX,
      y: surface.walkY
    },
    direction: "right",
    pauseMs: 0
  };
}

export function planPatrolStep(input: PatrolPlannerInput): PatrolStep {
  const state =
    input.state.surfaceId === input.surface.id
      ? input.state
      : createInitialPatrolState(input.surface);
  const lanePosition = clampToLane(state.position, input.surface);

  if (state.pauseMs > 0) {
    return {
      ...state,
      position: lanePosition,
      pauseMs: Math.max(0, state.pauseMs - input.deltaMs),
      behavior: "look",
      facing: state.direction === "right" ? "right" : "left"
    };
  }

  const speed = input.speedPxPerMs ?? DEFAULT_PATROL_SPEED_PX_PER_MS;
  const signedStep = input.deltaMs * speed * (state.direction === "right" ? 1 : -1);
  const nextX = lanePosition.x + signedStep;
  const reachedRight = nextX >= input.surface.maxX;
  const reachedLeft = nextX <= input.surface.minX;
  const direction = reachedRight ? "left" : reachedLeft ? "right" : state.direction;
  const x = reachedRight ? input.surface.maxX : reachedLeft ? input.surface.minX : nextX;

  return {
    surfaceId: input.surface.id,
    position: {
      x,
      y: input.surface.walkY
    },
    direction,
    pauseMs: reachedRight || reachedLeft ? 350 : 0,
    behavior: reachedRight || reachedLeft ? "look" : "walk",
    facing: direction === "right" ? "right" : "left"
  };
}

function clampToLane(position: Point, surface: PatrolSurface): Point {
  return {
    x: Math.min(surface.maxX, Math.max(surface.minX, position.x)),
    y: surface.walkY
  };
}
