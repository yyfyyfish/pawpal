import type { EnergyLevel, PetBehavior, RandomSource } from "./types";

const BASE_WEIGHTS: Record<EnergyLevel, Array<[PetBehavior, number]>> = {
  calm: [
    ["idle", 50],
    ["walk", 12],
    ["sleep", 18],
    ["look", 10],
    ["groom", 8],
    ["meow", 2]
  ],
  normal: [
    ["idle", 38],
    ["walk", 20],
    ["sleep", 12],
    ["look", 12],
    ["groom", 8],
    ["scratch", 6],
    ["meow", 3],
    ["pounce", 1]
  ],
  playful: [
    ["idle", 26],
    ["walk", 24],
    ["sleep", 6],
    ["look", 14],
    ["groom", 6],
    ["scratch", 10],
    ["meow", 5],
    ["pounce", 9]
  ]
};

export function chooseNextBehavior(
  energy: EnergyLevel,
  random: RandomSource = Math.random
): PetBehavior {
  const weights = BASE_WEIGHTS[energy];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;

  for (const [behavior, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return behavior;
  }

  return "idle";
}

export function nextDecisionDelay(
  energy: EnergyLevel,
  random: RandomSource = Math.random
): number {
  switch (energy) {
    case "calm":
      return randomBetween(3500, 9000, random);
    case "playful":
      return randomBetween(1400, 4200, random);
    default:
      return randomBetween(2200, 6500, random);
  }
}

export function createSeededRandom(seed: string): RandomSource {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return () => {
    hash += 0x6d2b79f5;
    let value = hash;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(min: number, max: number, random: RandomSource): number {
  return Math.round(min + random() * (max - min));
}
