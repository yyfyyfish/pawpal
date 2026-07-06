import type { PettingReaction } from "./petting";
import type { PetBehavior, RandomSource } from "./types";

export interface CompanionSoundInput {
  behavior: PetBehavior;
  atlasCue?: string;
  pettingReaction?: PettingReaction | null;
  muted: boolean;
  elapsedSinceLastCueMs: number;
  elapsedSinceCueMs?: Partial<Record<string, number>>;
  random?: RandomSource;
}

const MIN_SOUND_GAP_MS = 1_200;
const PER_CUE_COOLDOWN_MS: Record<string, number> = {
  "purr-short": 2_500,
  "meow-soft": 12_000,
  "scratch-soft": 8_000
};

export function selectCompanionSoundCue(input: CompanionSoundInput): string | null {
  if (input.muted || input.elapsedSinceLastCueMs < MIN_SOUND_GAP_MS) return null;

  if (input.pettingReaction === "pet" || input.pettingReaction === "scratch") {
    return cooldownFilteredCue("purr-short", input);
  }

  if (input.pettingReaction === "overstimulated") {
    return cooldownFilteredCue("scratch-soft", input);
  }

  if (input.behavior === "meow") {
    return cooldownFilteredCue(input.atlasCue ?? "meow-soft", input);
  }

  if (input.behavior === "groom") {
    const random = input.random ?? Math.random;
    return random() < 0.45 ? cooldownFilteredCue(input.atlasCue ?? "purr-short", input) : null;
  }

  return null;
}

function cooldownFilteredCue(cue: string, input: CompanionSoundInput): string | null {
  const cooldownMs = PER_CUE_COOLDOWN_MS[cue] ?? MIN_SOUND_GAP_MS;
  const elapsedSinceCueMs = input.elapsedSinceCueMs?.[cue] ?? Number.POSITIVE_INFINITY;

  return elapsedSinceCueMs >= cooldownMs ? cue : null;
}
