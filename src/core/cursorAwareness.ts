import type { PetBehavior, PetState, Point } from "./types";

export interface CursorAwarenessInput {
  currentBehavior: PetBehavior;
  currentFacing: PetState["facing"];
  cursor: Point | null;
  petPosition: Point;
  petSize: number;
  watchDistance?: number;
}

export interface CursorAwarenessResult {
  aware: boolean;
  behavior?: PetBehavior;
  facing: PetState["facing"];
}

const DEFAULT_CURSOR_WATCH_DISTANCE = 180;
const NON_INTERRUPTIBLE_BEHAVIORS = new Set<PetBehavior>(["sleep", "wake", "pounce"]);

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

  return {
    aware: true,
    behavior: input.currentBehavior === "walk" ? undefined : "look",
    facing
  };
}
