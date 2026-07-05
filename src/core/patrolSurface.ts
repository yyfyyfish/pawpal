import type { Point } from "./types";
import type { SafeArea } from "./screen";

export type PatrolSurfaceKind = "window-top" | "tab-bar" | "screen-edge" | "custom";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PatrolSurface {
  id: string;
  kind: PatrolSurfaceKind;
  rect: Rect;
  walkY: number;
  minX: number;
  maxX: number;
}

export type SurfaceRestSpotKind = "left-corner" | "center" | "right-corner";
export type SurfacePose = "walking" | "perching" | "sleeping";
export type SurfacePathEdge = "top" | "right" | "bottom" | "left";

export interface SurfaceRestSpot {
  id: string;
  surfaceId: string;
  x: number;
  y: number;
  kind: SurfaceRestSpotKind;
  weight: number;
}

export interface SurfacePathPoint {
  position: Point;
  edge: SurfacePathEdge;
  progress: number;
  length: number;
}

export const SURFACE_EDGE_PADDING = 24;
const REST_SPOT_EDGE_OFFSET = 84;
const SURFACE_POSE_OFFSETS: Record<SurfacePose, number> = {
  walking: 0.78,
  perching: 0.68,
  sleeping: 0.58
};

export function createWindowTopSurface(id: string, rect: Rect): PatrolSurface {
  return createHorizontalSurface(id, "window-top", rect, rect.y);
}

export function createTabBarSurface(id: string, rect: Rect): PatrolSurface {
  return createHorizontalSurface(id, "tab-bar", rect, rect.y + Math.min(32, rect.height / 2));
}

export function createScreenEdgeSurface(id: string, rect: Rect): PatrolSurface {
  return createHorizontalSurface(id, "screen-edge", rect, rect.y + rect.height - SURFACE_EDGE_PADDING);
}

export function createScreenEdgeSurfaces(safeArea: SafeArea): PatrolSurface[] {
  const rect = {
    x: safeArea.x,
    y: safeArea.y,
    width: safeArea.width,
    height: safeArea.height
  };

  return [
    createHorizontalSurface("screen-top", "screen-edge", rect, safeArea.y),
    createScreenEdgeSurface("screen-bottom", rect)
  ].filter(isPatrolSurface);
}

export function createCustomSurface(
  id: string,
  rect: Rect,
  walkY: number
): PatrolSurface {
  return createHorizontalSurface(id, "custom", rect, walkY);
}

export function surfaceCenter(surface: PatrolSurface): Point {
  return {
    x: surface.minX + (surface.maxX - surface.minX) / 2,
    y: surface.walkY
  };
}

export function createSurfaceRestSpots(surface: PatrolSurface): SurfaceRestSpot[] {
  const centerX = surface.minX + (surface.maxX - surface.minX) / 2;
  const leftX = Math.min(surface.maxX, surface.minX + REST_SPOT_EDGE_OFFSET - SURFACE_EDGE_PADDING);
  const rightX = Math.max(surface.minX, surface.maxX - REST_SPOT_EDGE_OFFSET - SURFACE_EDGE_PADDING);

  return [
    createRestSpot(surface, "left-corner", leftX, 0.8),
    createRestSpot(surface, "center", centerX, 1),
    createRestSpot(surface, "right-corner", rightX, 0.8)
  ];
}

export function positionPetOnSurface(
  surface: PatrolSurface,
  x: number,
  pose: SurfacePose,
  petSize: number
): Point {
  return {
    x: Math.min(surface.maxX, Math.max(surface.minX, x)),
    y: surface.walkY - petSize * SURFACE_POSE_OFFSETS[pose]
  };
}

export function surfacePatrolPathLength(surface: PatrolSurface): number {
  if (surface.kind === "screen-edge") return surface.maxX - surface.minX;

  const horizontal = surface.maxX - surface.minX;
  const vertical = surface.rect.height;

  return horizontal * 2 + vertical * 2;
}

export function positionPetOnSurfacePath(
  surface: PatrolSurface,
  progress: number,
  pose: SurfacePose,
  petSize: number
): SurfacePathPoint {
  const length = surfacePatrolPathLength(surface);
  const normalizedProgress = normalizePathProgress(progress, length);

  if (surface.kind === "screen-edge") {
    return {
      position: positionPetOnSurface(surface, surface.minX + normalizedProgress, pose, petSize),
      edge: "top",
      progress: normalizedProgress,
      length
    };
  }

  const topLength = surface.maxX - surface.minX;
  const rightLength = surface.rect.height;
  const bottomLength = topLength;
  const rightX = surface.rect.x + surface.rect.width;
  const bottomY = surface.rect.y + surface.rect.height;
  const poseOffset = SURFACE_POSE_OFFSETS[pose];

  if (normalizedProgress < topLength) {
    return {
      position: {
        x: surface.minX + normalizedProgress,
        y: surface.rect.y - petSize * poseOffset
      },
      edge: "top",
      progress: normalizedProgress,
      length
    };
  }

  if (normalizedProgress < topLength + rightLength) {
    return {
      position: {
        x: rightX - petSize * (1 - poseOffset),
        y: surface.rect.y + (normalizedProgress - topLength) - petSize / 2
      },
      edge: "right",
      progress: normalizedProgress,
      length
    };
  }

  if (normalizedProgress < topLength + rightLength + bottomLength) {
    return {
      position: {
        x: surface.maxX - (normalizedProgress - topLength - rightLength),
        y: bottomY - petSize * (1 - poseOffset)
      },
      edge: "bottom",
      progress: normalizedProgress,
      length
    };
  }

  return {
    position: {
      x: surface.rect.x - petSize * poseOffset,
      y: bottomY - (normalizedProgress - topLength - rightLength - bottomLength) - petSize / 2
    },
    edge: "left",
    progress: normalizedProgress,
    length
  };
}

export function isPatrolSurface(value: unknown): value is PatrolSurface {
  if (!value || typeof value !== "object") return false;

  const surface = value as Partial<PatrolSurface>;
  const rect = surface.rect as Partial<Rect> | undefined;

  return (
    typeof surface.id === "string" &&
    ["window-top", "tab-bar", "screen-edge", "custom"].includes(surface.kind ?? "") &&
    !!rect &&
    isFiniteNumber(rect.x) &&
    isFiniteNumber(rect.y) &&
    isFiniteNumber(rect.width) &&
    isFiniteNumber(rect.height) &&
    rect.width > SURFACE_EDGE_PADDING * 2 &&
    rect.height > 0 &&
    isFiniteNumber(surface.walkY) &&
    isFiniteNumber(surface.minX) &&
    isFiniteNumber(surface.maxX) &&
    surface.maxX > surface.minX
  );
}

function normalizePathProgress(progress: number, length: number): number {
  if (length <= 0) return 0;
  return ((progress % length) + length) % length;
}

function createRestSpot(
  surface: PatrolSurface,
  kind: SurfaceRestSpotKind,
  x: number,
  weight: number
): SurfaceRestSpot {
  return {
    id: `${surface.id}:${kind}`,
    surfaceId: surface.id,
    x,
    y: surface.walkY,
    kind,
    weight
  };
}

function createHorizontalSurface(
  id: string,
  kind: PatrolSurfaceKind,
  rect: Rect,
  walkY: number
): PatrolSurface {
  return {
    id,
    kind,
    rect,
    walkY,
    minX: rect.x + SURFACE_EDGE_PADDING,
    maxX: rect.x + rect.width - SURFACE_EDGE_PADDING
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
