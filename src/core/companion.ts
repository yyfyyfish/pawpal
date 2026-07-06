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
  ambientIdleMs: number;
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

const IDLE_LIFE_INTERVAL_MS = 4_000;

export function createInitialCompanionState(
  overrides: Partial<CompanionState> = {}
): CompanionState {
  return {
    mind: overrides.mind ?? createInitialPetMindState(),
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

  if (!behavior && ambientIdleMs >= IDLE_LIFE_INTERVAL_MS) {
    ambientIdleMs = 0;

    return {
      state: {
        mind,
        memory,
        lastRecordedRestSpotId,
        ambientIdleMs
      },
      intent: {
        type: "animate",
        behavior: chooseIdleLifeBehavior(input.random ?? Math.random)
      },
      memoryChanged
    };
  }

  return {
    state: {
      mind,
      memory,
      lastRecordedRestSpotId,
      ambientIdleMs: behavior ? 0 : ambientIdleMs
    },
    intent: behavior ? { type: "animate", behavior } : { type: "do_nothing" },
    memoryChanged
  };
}

function chooseIdleLifeBehavior(random: RandomSource): PetBehavior {
  const roll = random();
  if (roll < 0.45) return "look";
  if (roll < 0.8) return "groom";
  return "scratch";
}

function isAmbientIdleBehavior(behavior: PetBehavior): boolean {
  return behavior === "idle" || behavior === "look" || behavior === "groom";
}
