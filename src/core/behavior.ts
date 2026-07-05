import { chooseNextBehavior, nextDecisionDelay } from "./scheduler";
import type { PetState, PetTickInput, Point } from "./types";

const ONE_SHOT_DURATIONS_MS = {
  wake: 600,
  look: 700,
  meow: 650,
  scratch: 800,
  groom: 1200,
  pounce: 500
} as const;

export function createInitialPetState(): PetState {
  return {
    behavior: "idle",
    position: { x: 96, y: 96 },
    target: null,
    facing: "left",
    elapsedInStateMs: 0,
    nextDecisionMs: 1800
  };
}

export function tickPet(state: PetState, input: PetTickInput): PetState {
  const random = input.random ?? Math.random;

  if (input.preferences.paused) {
    return {
      ...state,
      behavior: "sleep",
      elapsedInStateMs: state.elapsedInStateMs + input.deltaMs
    };
  }

  const elapsedInStateMs = state.elapsedInStateMs + input.deltaMs;

  if (isOneShotBehavior(state.behavior) && elapsedInStateMs >= ONE_SHOT_DURATIONS_MS[state.behavior]) {
    return {
      ...state,
      behavior: "idle",
      target: null,
      facing: faceCursor(state.facing, state.position, input.cursor),
      elapsedInStateMs: 0,
      nextDecisionMs: nextDecisionDelay(input.preferences.energy, random)
    };
  }

  if (elapsedInStateMs >= state.nextDecisionMs) {
    const behavior = chooseNextBehavior(input.preferences.energy, random);
    const target = behavior === "walk" ? chooseWalkTarget(state.position, input) : null;

    return {
      ...state,
      behavior,
      target,
      facing: target
        ? target.x < state.position.x
          ? "left"
          : "right"
        : faceCursor(state.facing, state.position, input.cursor),
      elapsedInStateMs: 0,
      nextDecisionMs: nextDecisionDelay(input.preferences.energy, random)
    };
  }

  if (state.behavior === "walk" && state.target) {
    const position = moveToward(state.position, state.target, input.deltaMs * 0.035);
    const arrived = distance(position, state.target) < 2;

    return {
      ...state,
      behavior: arrived ? "idle" : state.behavior,
      position,
      target: arrived ? null : state.target,
      elapsedInStateMs
    };
  }

  return {
    ...state,
    facing: faceCursor(state.facing, state.position, input.cursor),
    elapsedInStateMs
  };
}

function chooseWalkTarget(position: Point, input: PetTickInput): Point {
  const random = input.random ?? Math.random;
  const range = input.preferences.energy === "playful" ? 120 : 72;
  const offset = Math.round((random() * 2 - 1) * range);
  const x = clamp(position.x + offset, 32, Math.max(32, input.screen.width - 32));

  return {
    x,
    y: clamp(position.y, 32, Math.max(32, input.screen.height - 32))
  };
}

function moveToward(position: Point, target: Point, step: number): Point {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const length = Math.hypot(dx, dy);

  if (length === 0 || length <= step) return target;

  return {
    x: position.x + (dx / length) * step,
    y: position.y + (dy / length) * step
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function faceCursor(current: PetState["facing"], position: Point, cursor: Point | null): PetState["facing"] {
  if (!cursor) return current;
  return cursor.x < position.x ? "left" : "right";
}

function isOneShotBehavior(
  behavior: PetState["behavior"]
): behavior is keyof typeof ONE_SHOT_DURATIONS_MS {
  return behavior in ONE_SHOT_DURATIONS_MS;
}
