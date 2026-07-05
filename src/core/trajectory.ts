import type { Point } from "./types";

export interface TrajectorySmoothingOptions {
  halfLifeMs?: number;
  snapDistance?: number;
}

export interface TrajectoryAdvanceOptions {
  maxSpeedPxPerMs?: number;
  snapDistance?: number;
}

export const DEFAULT_TRAJECTORY_HALF_LIFE_MS = 90;
export const DEFAULT_TRAJECTORY_SNAP_DISTANCE = 0.75;
export const DEFAULT_TRAJECTORY_MAX_SPEED_PX_PER_MS = 0.25;

export function smoothTrajectoryPosition(
  current: Point,
  target: Point,
  deltaMs: number,
  options: TrajectorySmoothingOptions = {}
): Point {
  const distance = trajectoryDistance(current, target);
  const snapDistance = options.snapDistance ?? DEFAULT_TRAJECTORY_SNAP_DISTANCE;
  if (distance <= snapDistance) return target;
  if (deltaMs <= 0) return current;

  const halfLifeMs = Math.max(1, options.halfLifeMs ?? DEFAULT_TRAJECTORY_HALF_LIFE_MS);
  const alpha = 1 - Math.pow(0.5, deltaMs / halfLifeMs);

  return {
    x: current.x + (target.x - current.x) * alpha,
    y: current.y + (target.y - current.y) * alpha
  };
}

export function advanceTrajectoryPosition(
  current: Point,
  target: Point,
  deltaMs: number,
  options: TrajectoryAdvanceOptions = {}
): Point {
  const distance = trajectoryDistance(current, target);
  const snapDistance = options.snapDistance ?? DEFAULT_TRAJECTORY_SNAP_DISTANCE;
  if (distance <= snapDistance) return target;
  if (deltaMs <= 0) return current;

  const maxSpeedPxPerMs = Math.max(
    0.001,
    options.maxSpeedPxPerMs ?? DEFAULT_TRAJECTORY_MAX_SPEED_PX_PER_MS
  );
  const maxDistance = maxSpeedPxPerMs * deltaMs;
  if (distance <= maxDistance) return target;

  const ratio = maxDistance / distance;
  return {
    x: current.x + (target.x - current.x) * ratio,
    y: current.y + (target.y - current.y) * ratio
  };
}

export function roundTrajectoryPosition(point: Point): Point {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y)
  };
}

export function sameRoundedPosition(first: Point | null, second: Point): boolean {
  if (!first) return false;
  return first.x === second.x && first.y === second.y;
}

export function trajectoryDistance(first: Point, second: Point): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}
