import assert from "node:assert/strict";
import test from "node:test";
import {
  isCursorInsidePetHitbox,
  toOverlayLocalPosition
} from "../src/core/overlayStage";

test("overlay stage converts screen coordinates to local canvas coordinates", () => {
  assert.deepEqual(
    toOverlayLocalPosition({ x: 8, y: 32 }, { x: 108.5, y: 82.25 }),
    { x: 100.5, y: 50.25 }
  );
});

test("overlay hitbox only enables pointer handling near the pet", () => {
  const petPosition = { x: 400, y: 220 };

  assert.equal(isCursorInsidePetHitbox({ x: 395, y: 215 }, petPosition, 96), true);
  assert.equal(isCursorInsidePetHitbox({ x: 506, y: 326 }, petPosition, 96), true);
  assert.equal(isCursorInsidePetHitbox({ x: 520, y: 340 }, petPosition, 96), false);
  assert.equal(isCursorInsidePetHitbox({ x: 200, y: 220 }, petPosition, 96), false);
});
