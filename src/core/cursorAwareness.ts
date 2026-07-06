import type { PetBehavior, PetState, Point } from "./types";

export interface CursorAwarenessInput {
  currentBehavior: PetBehavior;
  currentFacing: PetState["facing"];
  cursor: Point | null;
  petPosition: Point;
  petSize: number;
  watchDistance?: number;
  cursorSpeedPxPerMs?: number;
  pawSwipeSpeedPxPerMs?: number;
}

export interface CursorAwarenessResult {
  aware: boolean;
  behavior?: PetBehavior;
  facing: PetState["facing"];
}

const DEFAULT_CURSOR_WATCH_DISTANCE = 180;
const DEFAULT_PAW_SWIPE_SPEED_PX_PER_MS = 0.85;
const NON_INTERRUPTIBLE_BEHAVIORS = new Set<PetBehavior>(["sleep", "wake", "pounce", "perch"]);

export function selectCursorAwareness(
  input: CursorAwarenessInput
): CursorAwarenessResult {
  if (!input.cursor) {
    return {
      aware: false,
      facing: input.currentFacing
    };
  }

  const center = {
    x: input.petPosition.x + input.petSize / 2,
    y: input.petPosition.y + input.petSize / 2
  };
  const distance = Math.hypot(input.cursor.x - center.x, input.cursor.y - center.y);
  const aware = distance <= (input.watchDistance ?? DEFAULT_CURSOR_WATCH_DISTANCE);
  if (!aware) {
    return {
      aware: false,
      facing: input.currentFacing
    };
  }

  const facing = input.cursor.x < center.x ? "left" : "right";
  if (NON_INTERRUPTIBLE_BEHAVIORS.has(input.currentBehavior)) {
    return {
      aware: true,
      facing: input.currentFacing
    };
  }

  const cursorSpeedPxPerMs = input.cursorSpeedPxPerMs ?? 0;
  const pawSwipeSpeedPxPerMs =
    input.pawSwipeSpeedPxPerMs ?? DEFAULT_PAW_SWIPE_SPEED_PX_PER_MS;
  if (input.currentBehavior !== "walk" && cursorSpeedPxPerMs >= pawSwipeSpeedPxPerMs) {
    return {
      aware: true,
      behavior: "scratch",
      facing
    };
  }

  return {
    aware: true,
    behavior: input.currentBehavior === "walk" ? undefined : "look",
    facing
  };
}
