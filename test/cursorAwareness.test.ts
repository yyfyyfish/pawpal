import assert from "node:assert/strict";
import test from "node:test";
import { selectCursorAwareness } from "../src/core/cursorAwareness";

test("cursor awareness makes an idle cat look toward nearby cursor", () => {
  const awareness = selectCursorAwareness({
    currentBehavior: "idle",
    currentFacing: "right",
    cursor: { x: 90, y: 130 },
    petPosition: { x: 160, y: 120 },
    petSize: 96
  });

  assert.deepEqual(awareness, {
    aware: true,
    behavior: "look",
    facing: "left"
  });
});

test("cursor awareness leaves distant cursor alone", () => {
  const awareness = selectCursorAwareness({
    currentBehavior: "idle",
    currentFacing: "right",
    cursor: { x: 900, y: 900 },
    petPosition: { x: 160, y: 120 },
    petSize: 96
  });

  assert.deepEqual(awareness, {
    aware: false,
    facing: "right"
  });
});

test("cursor awareness turns a nearby cursor wiggle into a paw swipe", () => {
  const awareness = selectCursorAwareness({
    currentBehavior: "idle",
    currentFacing: "right",
    cursor: { x: 210, y: 135 },
    petPosition: { x: 160, y: 120 },
    petSize: 96,
    cursorSpeedPxPerMs: 1.2
  });

  assert.deepEqual(awareness, {
    aware: true,
    behavior: "scratch",
    facing: "right"
  });
});

test("cursor awareness lets a walking cat watch a nearby cursor", () => {
  const awareness = selectCursorAwareness({
    currentBehavior: "walk",
    currentFacing: "right",
    cursor: { x: 210, y: 135 },
    petPosition: { x: 160, y: 120 },
    petSize: 96
  });

  assert.deepEqual(awareness, {
    aware: true,
    behavior: "look",
    facing: "right"
  });
});

test("cursor awareness lets a walking cat paw swipe a nearby cursor wiggle", () => {
  const awareness = selectCursorAwareness({
    currentBehavior: "walk",
    currentFacing: "right",
    cursor: { x: 210, y: 135 },
    petPosition: { x: 160, y: 120 },
    petSize: 96,
    cursorSpeedPxPerMs: 1.2
  });

  assert.deepEqual(awareness, {
    aware: true,
    behavior: "scratch",
    facing: "right"
  });
});

test("cursor awareness does not interrupt sleep or hop animations", () => {
  for (const behavior of ["sleep", "pounce"] as const) {
    const awareness = selectCursorAwareness({
      currentBehavior: behavior,
      currentFacing: "left",
      cursor: { x: 180, y: 130 },
      petPosition: { x: 160, y: 120 },
      petSize: 96
    });

    assert.equal(awareness.aware, true);
    assert.equal(awareness.behavior, undefined);
    assert.equal(awareness.facing, "left");
  }
});
