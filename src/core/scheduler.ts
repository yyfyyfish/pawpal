import type { EnergyLevel, PetBehavior } from "./types";

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

export function chooseNextBehavior(energy: EnergyLevel): PetBehavior {
  const weights = BASE_WEIGHTS[energy];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [behavior, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return behavior;
  }

  return "idle";
}

export function nextDecisionDelay(energy: EnergyLevel): number {
  switch (energy) {
    case "calm":
      return randomBetween(3500, 9000);
    case "playful":
      return randomBetween(1400, 4200);
    default:
      return randomBetween(2200, 6500);
  }
}

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}
