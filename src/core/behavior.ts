import { chooseNextBehavior, nextDecisionDelay } from "./scheduler";
import type { PetState, PetTickInput, Point } from "./types";

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
  if (input.preferences.paused) {
    return {
      ...state,
      behavior: "sleep",
      elapsedInStateMs: state.elapsedInStateMs + input.deltaMs
    };
  }

  const elapsedInStateMs = state.elapsedInStateMs + input.deltaMs;

  if (elapsedInStateMs >= state.nextDecisionMs) {
    const behavior = chooseNextBehavior(input.preferences.energy);
    const target = behavior === "walk" ? chooseWalkTarget(state.position, input) : null;

    return {
      ...state,
      behavior,
      target,
      facing: target ? (target.x < state.position.x ? "left" : "right") : state.facing,
      elapsedInStateMs: 0,
      nextDecisionMs: nextDecisionDelay(input.preferences.energy)
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
    elapsedInStateMs
  };
}

function chooseWalkTarget(position: Point, input: PetTickInput): Point {
  const range = input.preferences.energy === "playful" ? 120 : 72;
  const offset = Math.round((Math.random() * 2 - 1) * range);
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
