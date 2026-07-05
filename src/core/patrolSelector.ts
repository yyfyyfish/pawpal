import type { PatrolSurface } from "./patrolSurface";

export type PatrolSurfacePreference = "front-window" | "screen-edge";

export interface PatrolSurfaceSelectionInput {
  preferred: PatrolSurfacePreference;
  frontWindow: PatrolSurface | null;
  fallbackSurfaces: PatrolSurface[];
}

export const SURFACE_MIGRATION_COOLDOWN_MS = 3_000;

export function choosePatrolSurface(input: PatrolSurfaceSelectionInput): PatrolSurface {
  if (input.preferred === "front-window" && input.frontWindow) {
    return input.frontWindow;
  }

  const bottom = input.fallbackSurfaces.find((surface) => surface.id === "screen-bottom");
  const first = input.fallbackSurfaces[0];

  if (!bottom && !first) {
    throw new Error("PawPal needs at least one fallback patrol surface.");
  }

  return bottom ?? first;
}

export function shouldMigrateSurface(
  currentSurfaceId: string | null,
  nextSurfaceId: string,
  elapsedSinceMigrationMs: number
): boolean {
  return (
    currentSurfaceId !== nextSurfaceId &&
    elapsedSinceMigrationMs >= SURFACE_MIGRATION_COOLDOWN_MS
  );
}
