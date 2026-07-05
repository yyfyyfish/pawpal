import {
  chooseCompanionBehavior,
  createInitialPetMindState,
  tickPetMind,
  type PetMindState
} from "./mind";
import {
  createInitialCompanionMemory,
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
  memory: CompanionMemory;
  lastRecordedRestSpotId: string | null;
}

export interface CompanionInput {
  deltaMs: number;
  currentBehavior: PetBehavior;
  energyPreference: EnergyLevel;
  pettingReaction?: PettingReaction | null;
  restSpotId?: string | null;
  nowMs: number;
  random?: RandomSource;
}

export interface CompanionResult {
  state: CompanionState;
  intent: CompanionIntent;
  memoryChanged: boolean;
}

export function createInitialCompanionState(
  overrides: Partial<CompanionState> = {}
): CompanionState {
  return {
    mind: overrides.mind ?? createInitialPetMindState(),
    memory: overrides.memory ?? createInitialCompanionMemory(),
    lastRecordedRestSpotId: overrides.lastRecordedRestSpotId ?? null
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

  if (input.pettingReaction) {
    mind = applyPettingReaction(mind, input.pettingReaction);
    memory = recordPettingMemory(memory, input.pettingReaction, input.nowMs);
    memoryChanged = true;

    return {
      state: {
        mind,
        memory,
        lastRecordedRestSpotId
      },
      intent: {
        type: "animate",
        behavior: pettingReactionToBehavior(input.pettingReaction)
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

  return {
    state: {
      mind,
      memory,
      lastRecordedRestSpotId
    },
    intent: behavior ? { type: "animate", behavior } : { type: "do_nothing" },
    memoryChanged
  };
}
