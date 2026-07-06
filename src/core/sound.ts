import type { PettingReaction } from "./petting";
import type { PetBehavior, RandomSource } from "./types";

export interface CompanionSoundInput {
  behavior: PetBehavior;
  atlasCue?: string;
  pettingReaction?: PettingReaction | null;
  muted: boolean;
  elapsedSinceLastCueMs: number;
  random?: RandomSource;
}

const MIN_SOUND_GAP_MS = 1_200;

export function selectCompanionSoundCue(input: CompanionSoundInput): string | null {
  if (input.muted || input.elapsedSinceLastCueMs < MIN_SOUND_GAP_MS) return null;

  if (input.pettingReaction === "pet" || input.pettingReaction === "scratch") {
    return "purr-short";
  }

  if (input.pettingReaction === "overstimulated") {
    return "scratch-soft";
  }

  if (input.behavior === "meow") {
    return input.atlasCue ?? "meow-soft";
  }

  if (input.behavior === "groom") {
    const random = input.random ?? Math.random;
    return random() < 0.45 ? input.atlasCue ?? "purr-short" : null;
  }

  return null;
}
