import assert from "node:assert/strict";
import test from "node:test";
import { createScreenEdgeSurfaces, createWindowTopSurface } from "../src/core/patrolSurface";
import { choosePatrolSurface, shouldMigrateSurface } from "../src/core/patrolSelector";
import { getSafeArea } from "../src/core/screen";

const safeArea = getSafeArea({
  x: 0,
  y: 0,
  width: 1440,
  height: 900,
  scaleFactor: 2
});

test("surface selector prefers front app surfaces over screen fallback", () => {
  const frontWindow = createWindowTopSurface("front-window:Safari", {
    x: 200,
    y: 120,
    width: 800,
    height: 600
  });

  const selected = choosePatrolSurface({
    preferred: "front-window",
    frontWindow,
    fallbackSurfaces: createScreenEdgeSurfaces(safeArea)
  });

  assert.equal(selected.id, "front-window:Safari");
});

test("surface selector falls back to screen edges when no app surface exists", () => {
  const selected = choosePatrolSurface({
    preferred: "front-window",
    frontWindow: null,
    fallbackSurfaces: createScreenEdgeSurfaces(safeArea)
  });

  assert.equal(selected.id, "screen-bottom");
});

test("surface migration waits until the target changes and cooldown has elapsed", () => {
  assert.equal(shouldMigrateSurface("screen-bottom", "front-window:Safari", 10_000), true);
  assert.equal(shouldMigrateSurface("screen-bottom", "front-window:Safari", 500), false);
  assert.equal(shouldMigrateSurface("front-window:Safari", "front-window:Safari", 10_000), false);
});
