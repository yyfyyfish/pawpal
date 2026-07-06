import type { PettingReaction } from "./petting";

export interface RestSpotMemory {
  visits: number;
  lastVisitedAt: number;
}

export interface CareMemory {
  pets: number;
  scratches: number;
  overstimulations: number;
  drags: number;
  lastInteractionAt: number | null;
}

export interface CompanionMemory {
  restSpots: Record<string, RestSpotMemory>;
  care: CareMemory;
}

export function createInitialCompanionMemory(): CompanionMemory {
  return {
    restSpots: {},
    care: {
      pets: 0,
      scratches: 0,
      overstimulations: 0,
      drags: 0,
      lastInteractionAt: null
    }
  };
}

export function recordRestSpotVisit(
  memory: CompanionMemory,
  restSpotId: string,
  nowMs: number
): CompanionMemory {
  const current = memory.restSpots[restSpotId] ?? {
    visits: 0,
    lastVisitedAt: 0
  };

  return {
    ...memory,
    restSpots: {
      ...memory.restSpots,
      [restSpotId]: {
        visits: current.visits + 1,
        lastVisitedAt: nowMs
      }
    }
  };
}

export function recordDragMemory(
  memory: CompanionMemory,
  nowMs: number
): CompanionMemory {
  return {
    ...memory,
    care: {
      ...memory.care,
      drags: memory.care.drags + 1,
      lastInteractionAt: nowMs
    }
  };
}

export function recordPettingMemory(
  memory: CompanionMemory,
  reaction: PettingReaction,
  nowMs: number
): CompanionMemory {
  return {
    ...memory,
    care: {
      pets: memory.care.pets + (reaction === "pet" ? 1 : 0),
      scratches: memory.care.scratches + (reaction === "scratch" ? 1 : 0),
      overstimulations:
        memory.care.overstimulations + (reaction === "overstimulated" ? 1 : 0),
      drags: memory.care.drags,
      lastInteractionAt: nowMs
    }
  };
}

export function favoriteRestSpotId(memory: CompanionMemory): string | null {
  const entries = Object.entries(memory.restSpots);
  if (entries.length === 0) return null;

  return entries.reduce((favorite, candidate) => {
    const [, favoriteValue] = favorite;
    const [, candidateValue] = candidate;

    if (candidateValue.visits > favoriteValue.visits) return candidate;
    if (
      candidateValue.visits === favoriteValue.visits &&
      candidateValue.lastVisitedAt > favoriteValue.lastVisitedAt
    ) {
      return candidate;
    }

    return favorite;
  })[0];
}

export function normalizeCompanionMemory(value: unknown): CompanionMemory {
  if (!value || typeof value !== "object") return createInitialCompanionMemory();

  const stored = value as {
    restSpots?: unknown;
    care?: unknown;
  };

  return {
    restSpots: normalizeRestSpots(stored.restSpots),
    care: normalizeCare(stored.care)
  };
}

export function toStoredCompanionMemory(memory: CompanionMemory): CompanionMemory {
  return normalizeCompanionMemory(memory);
}

function normalizeRestSpots(value: unknown): Record<string, RestSpotMemory> {
  if (!value || typeof value !== "object") return {};

  const spots: Record<string, RestSpotMemory> = {};
  for (const [id, rawSpot] of Object.entries(value)) {
    if (!rawSpot || typeof rawSpot !== "object") continue;

    const spot = rawSpot as Partial<RestSpotMemory>;
    if (!isNonNegativeNumber(spot.visits) || !isNonNegativeNumber(spot.lastVisitedAt)) {
      continue;
    }

    spots[id] = {
      visits: Math.floor(spot.visits),
      lastVisitedAt: spot.lastVisitedAt
    };
  }

  return spots;
}

function normalizeCare(value: unknown): CareMemory {
  const defaults = createInitialCompanionMemory().care;
  if (!value || typeof value !== "object") return defaults;

  const care = value as Partial<CareMemory>;

  return {
    pets: isNonNegativeNumber(care.pets) ? Math.floor(care.pets) : defaults.pets,
    scratches: isNonNegativeNumber(care.scratches)
      ? Math.floor(care.scratches)
      : defaults.scratches,
    overstimulations: isNonNegativeNumber(care.overstimulations)
      ? Math.floor(care.overstimulations)
      : defaults.overstimulations,
    drags: isNonNegativeNumber(care.drags) ? Math.floor(care.drags) : defaults.drags,
    lastInteractionAt:
      care.lastInteractionAt === null || isNonNegativeNumber(care.lastInteractionAt)
        ? care.lastInteractionAt
        : defaults.lastInteractionAt
  };
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
