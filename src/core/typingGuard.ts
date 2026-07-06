import type { Rect } from "./patrolSurface";
import type { Point } from "./types";

export type TypingBoundsSource = "caret" | "focused-element";

export interface FocusedTypingBounds extends Rect {
  source: TypingBoundsSource;
  appName?: string | null;
  role?: string | null;
}

export interface AvoidanceZone extends Rect {
  id: string;
  reason: "typing";
  source: TypingBoundsSource;
  activeUntilMs: number;
}

export interface TypingAvoidanceOptions {
  nowMs: number;
  petSize: number;
}

export const TYPING_GUARD_TTL_MS = 2_500;
const MIN_CARET_ZONE_WIDTH = 260;
const MIN_CARET_ZONE_HEIGHT = 160;
const MIN_PADDING = 48;

export function createTypingAvoidanceZone(
  bounds: FocusedTypingBounds,
  options: TypingAvoidanceOptions
): AvoidanceZone | null {
  if (!isUsableRect(bounds)) return null;

  const padding = Math.max(MIN_PADDING, Math.ceil(options.petSize * 0.35));
  const expanded = ensureMinimumRect(
    expandRect(bounds, padding),
    bounds.source === "caret" ? MIN_CARET_ZONE_WIDTH : 0,
    bounds.source === "caret" ? MIN_CARET_ZONE_HEIGHT : 0
  );

  return {
    id: `typing:${sanitizeId(bounds.appName ?? "unknown")}:${bounds.source}`,
    reason: "typing",
    source: bounds.source,
    ...expanded,
    activeUntilMs: options.nowMs + TYPING_GUARD_TTL_MS
  };
}

export function isAvoidanceZoneActive(zone: AvoidanceZone, nowMs: number): boolean {
  return nowMs < zone.activeUntilMs;
}

export function petRectOverlapsAvoidanceZones(
  position: Point,
  petSize: number,
  zones: AvoidanceZone[],
  nowMs: number
): boolean {
  const petRect = {
    x: position.x,
    y: position.y,
    width: petSize,
    height: petSize
  };

  return zones.some((zone) => {
    return isAvoidanceZoneActive(zone, nowMs) && rectsOverlap(petRect, zone);
  });
}

export function chooseTypingCompanionSpot(
  zone: AvoidanceZone,
  bounds: Rect,
  petSize: number
): Point | null {
  const gap = Math.max(24, Math.round(petSize * 0.25));
  const candidates = [
    {
      x: zone.x - petSize - gap,
      y: zone.y + zone.height / 2 - petSize / 2
    },
    {
      x: zone.x + zone.width + gap,
      y: zone.y + zone.height / 2 - petSize / 2
    },
    {
      x: zone.x + zone.width / 2 - petSize / 2,
      y: zone.y - petSize - gap
    },
    {
      x: zone.x + zone.width / 2 - petSize / 2,
      y: zone.y + zone.height + gap
    }
  ].map((candidate) => clampPointToRect(candidate, bounds, petSize));

  return (
    candidates
      .filter((candidate) => {
        return !petRectOverlapsAvoidanceZones(candidate, petSize, [zone], zone.activeUntilMs - 1);
      })
      .sort((first, second) => {
        return distanceToZone(first, zone, petSize) - distanceToZone(second, zone, petSize);
      })[0] ?? null
  );
}

export function rectsOverlap(first: Rect, second: Rect): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function clampPointToRect(point: Point, rect: Rect, petSize: number): Point {
  return {
    x: clamp(point.x, rect.x, rect.x + rect.width - petSize),
    y: clamp(point.y, rect.y, rect.y + rect.height - petSize)
  };
}

function distanceToZone(point: Point, zone: AvoidanceZone, petSize: number): number {
  const petCenter = {
    x: point.x + petSize / 2,
    y: point.y + petSize / 2
  };
  const zoneCenter = {
    x: zone.x + zone.width / 2,
    y: zone.y + zone.height / 2
  };

  return Math.hypot(petCenter.x - zoneCenter.x, petCenter.y - zoneCenter.y);
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function expandRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2
  };
}

function ensureMinimumRect(rect: Rect, minWidth: number, minHeight: number): Rect {
  const width = Math.max(rect.width, minWidth);
  const height = Math.max(rect.height, minHeight);

  return {
    x: Math.round(rect.x + rect.width / 2 - width / 2),
    y: Math.round(rect.y + rect.height / 2 - height / 2),
    width,
    height
  };
}

function isUsableRect(rect: Rect): boolean {
  return (
    Number.isFinite(rect.x) &&
    Number.isFinite(rect.y) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function sanitizeId(value: string): string {
  const safe = value.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
  return safe || "unknown";
}
