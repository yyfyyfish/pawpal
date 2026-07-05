import type { PetMindState } from "./mind";
import type { PetBehavior, Point } from "./types";

export type PettingReaction = "pet" | "scratch" | "overstimulated";

export interface PettingGestureState {
  lastPoint: Point | null;
  strokeDistance: number;
  strokeMs: number;
  reactionCount: number;
  quietMs: number;
}

export interface PettingGestureInput {
  point: Point;
  deltaMs: number;
}

export interface PettingGestureResult {
  state: PettingGestureState;
  reaction: PettingReaction | null;
}

const PET_DISTANCE = 48;
const SCRATCH_MAX_MS = 260;
const OVERSTIMULATION_COUNT = 4;
const QUIET_RESET_MS = 2_500;

export function createInitialPettingGestureState(): PettingGestureState {
  return {
    lastPoint: null,
    strokeDistance: 0,
    strokeMs: 0,
    reactionCount: 0,
    quietMs: 0
  };
}

export function updatePettingGesture(
  state: PettingGestureState,
  input: PettingGestureInput
): PettingGestureResult {
  const quietMs = state.quietMs + input.deltaMs;
  const reactionCount = quietMs >= QUIET_RESET_MS ? 0 : state.reactionCount;

  if (!state.lastPoint) {
    return {
      state: {
        ...state,
        lastPoint: input.point,
        reactionCount,
        quietMs: 0
      },
      reaction: null
    };
  }

  const distance = pointDistance(state.lastPoint, input.point);
  const strokeDistance = state.strokeDistance + distance;
  const strokeMs = state.strokeMs + input.deltaMs;

  if (strokeDistance < PET_DISTANCE) {
    return {
      state: {
        ...state,
        lastPoint: input.point,
        strokeDistance,
        strokeMs,
        reactionCount,
        quietMs: 0
      },
      reaction: null
    };
  }

  const nextCount = reactionCount + 1;
  const reaction =
    nextCount >= OVERSTIMULATION_COUNT
      ? "overstimulated"
      : strokeMs <= SCRATCH_MAX_MS
        ? "scratch"
        : "pet";

  return {
    state: {
      lastPoint: null,
      strokeDistance: 0,
      strokeMs: 0,
      reactionCount: reaction === "overstimulated" ? 0 : nextCount,
      quietMs: 0
    },
    reaction
  };
}

export function applyPettingReaction(
  mind: PetMindState,
  reaction: PettingReaction
): PetMindState {
  switch (reaction) {
    case "pet":
      return clampMind({
        ...mind,
        affection: mind.affection + 0.12,
        comfort: mind.comfort + 0.08,
        irritation: mind.irritation - 0.05
      });
    case "scratch":
      return clampMind({
        ...mind,
        affection: mind.affection + 0.08,
        curiosity: mind.curiosity + 0.05,
        comfort: mind.comfort + 0.04,
        irritation: mind.irritation - 0.02
      });
    case "overstimulated":
      return clampMind({
        ...mind,
        affection: mind.affection - 0.02,
        comfort: mind.comfort - 0.08,
        irritation: mind.irritation + 0.28
      });
  }
}

export function pettingReactionToBehavior(reaction: PettingReaction): PetBehavior {
  switch (reaction) {
    case "pet":
      return "look";
    case "scratch":
      return "meow";
    case "overstimulated":
      return "scratch";
  }
}

function pointDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clampMind(mind: PetMindState): PetMindState {
  return {
    energy: clamp01(mind.energy),
    affection: clamp01(mind.affection),
    curiosity: clamp01(mind.curiosity),
    comfort: clamp01(mind.comfort),
    irritation: clamp01(mind.irritation),
    sleepPressure: clamp01(mind.sleepPressure)
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
