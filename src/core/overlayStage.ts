import type { Point } from "./types";

export interface OverlayStage {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PET_HITBOX_PADDING = 10;

export function toOverlayLocalPosition(stage: Pick<OverlayStage, "x" | "y">, position: Point): Point {
  return {
    x: position.x - stage.x,
    y: position.y - stage.y
  };
}

export function isCursorInsidePetHitbox(
  cursor: Point,
  petPosition: Point,
  petSize: number,
  padding: number = PET_HITBOX_PADDING
): boolean {
  return (
    cursor.x >= petPosition.x - padding &&
    cursor.x <= petPosition.x + petSize + padding &&
    cursor.y >= petPosition.y - padding &&
    cursor.y <= petPosition.y + petSize + padding
  );
}
