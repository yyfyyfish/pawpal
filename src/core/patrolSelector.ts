import type { PatrolSurface } from "./patrolSurface";
import type { Point } from "./types";

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

export function chooseRestSurface(
  surfaces: PatrolSurface[],
  position: Point,
  favoriteRestSpotId?: string | null
): PatrolSurface | null {
  if (surfaces.length === 0) return null;

  if (favoriteRestSpotId) {
    const favorite = surfaces.find((surface) => favoriteRestSpotId.startsWith(`${surface.id}:`));
    if (favorite) return favorite;
  }

  return surfaces
    .slice()
    .sort(
      (first, second) =>
        distanceToSurface(first, position) - distanceToSurface(second, position)
    )[0] ?? null;
}

function distanceToSurface(surface: PatrolSurface, position: Point): number {
  const nearestX = clamp(position.x, surface.rect.x, surface.rect.x + surface.rect.width);
  const nearestY = clamp(position.y, surface.rect.y, surface.rect.y + surface.rect.height);

  return Math.hypot(position.x - nearestX, position.y - nearestY);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
