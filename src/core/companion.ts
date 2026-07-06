import {
  chooseCompanionBehavior,
  createInitialPetMindState,
  selectPetMood,
  tickPetMind,
  type PetMood,
  type PetMindState
} from "./mind";
import {
  createInitialCompanionMemory,
  recordDragMemory,
  recordPettingMemory,
  recordRestSpotVisit,
  type CompanionMemory
} from "./memory";
import {
  applyPettingReaction,
  pettingReactionToBehavior,
  type PettingReaction
} from "./petting";
import type { EnergyLevel, PetBehavior, RandomSource } from "./types";

export type CompanionIntent =
  | { type: "animate"; behavior: PetBehavior }
  | { type: "do_nothing" };

export interface CompanionState {
  mind: PetMindState;
  mood: PetMood;
  memory: CompanionMemory;
  lastRecordedRestSpotId: string | null;
  ambientIdleMs: number;
}

export interface CompanionInput {
  deltaMs: number;
  currentBehavior: PetBehavior;
  energyPreference: EnergyLevel;
  pettingReaction?: PettingReaction | null;
  dragged?: boolean;
  restSpotId?: string | null;
  nowMs: number;
  random?: RandomSource;
}

export interface CompanionResult {
  state: CompanionState;
  intent: CompanionIntent;
  memoryChanged: boolean;
}

const IDLE_LIFE_INTERVAL_MS = 4_000;

export function createInitialCompanionState(
  overrides: Partial<CompanionState> = {}
): CompanionState {
  const mind = overrides.mind ?? createInitialPetMindState();

  return {
    mind,
    mood: overrides.mood ?? selectPetMood(mind),
    memory: overrides.memory ?? createInitialCompanionMemory(),
    lastRecordedRestSpotId: overrides.lastRecordedRestSpotId ?? null,
    ambientIdleMs: overrides.ambientIdleMs ?? 0
  };
}

export function advanceCompanion(
  state: CompanionState,
  input: CompanionInput
): CompanionResult {
  let mind = tickPetMind(state.mind, {
    deltaMs: input.deltaMs,
    behavior: input.currentBehavior,
    energyPreference: input.energyPreference
  });
  let memory = state.memory;
  let memoryChanged = false;
  let lastRecordedRestSpotId =
    input.currentBehavior === "sleep" ? state.lastRecordedRestSpotId : null;
  let ambientIdleMs = isAmbientIdleBehavior(input.currentBehavior)
    ? state.ambientIdleMs + input.deltaMs
    : 0;

  if (input.pettingReaction) {
    mind = applyPettingReaction(mind, input.pettingReaction);
    memory = recordPettingMemory(memory, input.pettingReaction, input.nowMs);
    memoryChanged = true;

    return {
      state: {
        mind,
        mood: selectPetMood(mind, input.energyPreference),
        memory,
        lastRecordedRestSpotId,
        ambientIdleMs: 0
      },
      intent: {
        type: "animate",
        behavior: pettingReactionToBehavior(input.pettingReaction)
      },
      memoryChanged
    };
  }

  if (input.dragged) {
    mind = applyDragStress(mind);
    memory = recordDragMemory(memory, input.nowMs);
    memoryChanged = true;

    return {
      state: {
        mind,
        mood: selectPetMood(mind, input.energyPreference),
        memory,
        lastRecordedRestSpotId,
        ambientIdleMs: 0
      },
      intent: {
        type: "animate",
        behavior: "scratch"
      },
      memoryChanged
    };
  }

  if (
    input.currentBehavior === "sleep" &&
    input.restSpotId &&
    input.restSpotId !== lastRecordedRestSpotId
  ) {
    memory = recordRestSpotVisit(memory, input.restSpotId, input.nowMs);
    memoryChanged = true;
    lastRecordedRestSpotId = input.restSpotId;
  }

  const behavior = chooseCompanionBehavior(mind, {
    currentBehavior: input.currentBehavior,
    energyPreference: input.energyPreference,
    random: input.random
  });
  const mood = selectPetMood(mind, input.energyPreference);

  if (!behavior && ambientIdleMs >= IDLE_LIFE_INTERVAL_MS) {
    ambientIdleMs = 0;

    return {
      state: {
        mind,
        mood,
        memory,
        lastRecordedRestSpotId,
        ambientIdleMs
      },
      intent: {
        type: "animate",
        behavior: chooseIdleLifeBehavior(mood, input.random ?? Math.random)
      },
      memoryChanged
    };
  }

  return {
    state: {
      mind,
      mood,
      memory,
      lastRecordedRestSpotId,
      ambientIdleMs: behavior ? 0 : ambientIdleMs
    },
    intent: behavior ? { type: "animate", behavior } : { type: "do_nothing" },
    memoryChanged
  };
}

function chooseIdleLifeBehavior(mood: PetMood, random: RandomSource): PetBehavior {
  const roll = random();

  switch (mood) {
    case "annoyed":
      return roll < 0.75 ? "scratch" : "look";
    case "sleepy":
      return roll < 0.95 ? "sleep" : "perch";
    case "playful":
      return roll < 0.7 ? "pounce" : "look";
    case "cozy":
      return roll < 0.75 ? "groom" : "perch";
    case "curious":
      if (roll < 0.45) return "look";
      if (roll < 0.8) return "groom";
      return "scratch";
  }
}

function isAmbientIdleBehavior(behavior: PetBehavior): boolean {
  return behavior === "idle" || behavior === "look" || behavior === "groom";
}

function applyDragStress(mind: PetMindState): PetMindState {
  return {
    ...mind,
    comfort: clamp01(mind.comfort - 0.06),
    curiosity: clamp01(mind.curiosity + 0.04),
    irritation: clamp01(mind.irritation + 0.16)
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
