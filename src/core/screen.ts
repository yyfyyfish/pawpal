import type { Point } from "./types";

export interface MonitorBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  scaleFactor: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SafeArea extends MonitorBounds {
  insets: SafeAreaInsets;
}

export const DEFAULT_SAFE_AREA_INSETS: SafeAreaInsets = {
  top: 32,
  right: 8,
  bottom: 60,
  left: 8
};

export function getSafeArea(
  monitor: MonitorBounds,
  insets: SafeAreaInsets = DEFAULT_SAFE_AREA_INSETS
): SafeArea {
  return {
    x: monitor.x + insets.left,
    y: monitor.y + insets.top,
    width: Math.max(0, monitor.width - insets.left - insets.right),
    height: Math.max(0, monitor.height - insets.top - insets.bottom),
    scaleFactor: monitor.scaleFactor,
    insets
  };
}

export function clampToSafeArea(
  position: Point,
  safeArea: SafeArea,
  windowSize: WindowSize
): Point {
  return {
    x: clamp(position.x, safeArea.x, safeArea.x + safeArea.width - windowSize.width),
    y: clamp(position.y, safeArea.y, safeArea.y + safeArea.height - windowSize.height)
  };
}

export function chooseNearestMonitor(
  position: Point,
  monitors: MonitorBounds[]
): MonitorBounds | null {
  if (monitors.length === 0) return null;

  return monitors.reduce((nearest, monitor) => {
    return distanceToMonitor(position, monitor) < distanceToMonitor(position, nearest)
      ? monitor
      : nearest;
  });
}

function distanceToMonitor(position: Point, monitor: MonitorBounds): number {
  const center = {
    x: monitor.x + monitor.width / 2,
    y: monitor.y + monitor.height / 2
  };

  return Math.hypot(position.x - center.x, position.y - center.y);
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}
