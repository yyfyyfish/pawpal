import type { PatrolSurface } from "./patrolSurface";

export type PatrolSurfacePreference = "front-window" | "screen-edge";

export interface PatrolSurfaceSelectionInput {
  preferred: PatrolSurfacePreference;
  currentSurface?: PatrolSurface | null;
  frontWindow: PatrolSurface | null;
  frontWindowMissingMs?: number;
  fallbackSurfaces: PatrolSurface[];
}

export const SURFACE_MIGRATION_COOLDOWN_MS = 3_000;
export const FRONT_WINDOW_DETECTION_GRACE_MS = 9_000;

export function choosePatrolSurface(input: PatrolSurfaceSelectionInput): PatrolSurface {
  const roam = input.fallbackSurfaces.find((surface) => surface.id === "screen-roam");

  if (input.preferred === "front-window" && roam) {
    return roam;
  }

  if (
    input.preferred === "front-window" &&
    input.currentSurface &&
    input.currentSurface.kind === "screen-roam" &&
    (input.frontWindowMissingMs ?? FRONT_WINDOW_DETECTION_GRACE_MS) <
      FRONT_WINDOW_DETECTION_GRACE_MS
  ) {
    return input.currentSurface;
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
