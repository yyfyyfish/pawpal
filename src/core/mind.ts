import type { EnergyLevel, PetBehavior } from "./types";

export interface PetMindState {
  energy: number;
  affection: number;
  curiosity: number;
  comfort: number;
  irritation: number;
  sleepPressure: number;
}

export interface PetMindTickInput {
  deltaMs: number;
  behavior: PetBehavior;
  energyPreference: EnergyLevel;
}

const MINUTE_MS = 60_000;

export function createInitialPetMindState(): PetMindState {
  return {
    energy: 0.68,
    affection: 0.55,
    curiosity: 0.45,
    comfort: 0.6,
    irritation: 0,
    sleepPressure: 0.18
  };
}

export function tickPetMind(
  state: PetMindState,
  input: PetMindTickInput
): PetMindState {
  const minutes = Math.max(0, input.deltaMs / MINUTE_MS);
  const profile = energyProfile(input.energyPreference);
  const sleeping = input.behavior === "sleep";

  return clampMind({
    energy: state.energy + (sleeping ? 0.02 : -0.004 * profile.energyUse) * minutes,
    affection: state.affection - 0.0015 * minutes,
    curiosity:
      state.curiosity +
      (sleeping ? -0.006 : 0.003 * profile.curiosityGain) * minutes,
    comfort: state.comfort + (sleeping ? 0.01 : input.behavior === "groom" ? 0.006 : -0.001) * minutes,
    irritation: state.irritation - 0.012 * minutes,
    sleepPressure: state.sleepPressure + (sleeping ? -0.028 : 0.006 * profile.sleepBuild) * minutes
  });
}

function energyProfile(energy: EnergyLevel): {
  energyUse: number;
  curiosityGain: number;
  sleepBuild: number;
} {
  switch (energy) {
    case "calm":
      return { energyUse: 0.75, curiosityGain: 0.65, sleepBuild: 0.85 };
    case "playful":
      return { energyUse: 1.35, curiosityGain: 1.45, sleepBuild: 1.2 };
    case "normal":
      return { energyUse: 1, curiosityGain: 1, sleepBuild: 1 };
  }
}

function clampMind(state: PetMindState): PetMindState {
  return {
    energy: clamp01(state.energy),
    affection: clamp01(state.affection),
    curiosity: clamp01(state.curiosity),
    comfort: clamp01(state.comfort),
    irritation: clamp01(state.irritation),
    sleepPressure: clamp01(state.sleepPressure)
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
