import assert from "node:assert/strict";
import test from "node:test";
import {
  createScreenEdgeSurfaces,
  createScreenEdgeSurface,
  createWindowTopSurface,
  isPatrolSurface,
  type PatrolSurface
} from "../src/core/patrolSurface";
import { getSafeArea } from "../src/core/screen";

test("patrol surfaces expose a safe horizontal walking lane", () => {
  const surface = createWindowTopSurface("front-window", {
    x: 120,
    y: 90,
    width: 640,
    height: 420
  });

  assert.deepEqual(surface, {
    id: "front-window",
    kind: "window-top",
    rect: { x: 120, y: 90, width: 640, height: 420 },
    walkY: 90,
    minX: 144,
    maxX: 736
  });
  assert.equal(isPatrolSurface(surface), true);
});

test("screen edge surfaces reserve room for the pet body", () => {
  const surface = createScreenEdgeSurface("screen-bottom", {
    x: 0,
    y: 24,
    width: 1440,
    height: 820
  });

  assert.equal(surface.kind, "screen-edge");
  assert.equal(surface.walkY, 820);
  assert.equal(surface.minX, 24);
  assert.equal(surface.maxX, 1416);
});

test("patrol surface validation rejects tiny or malformed lanes", () => {
  const tiny: PatrolSurface = {
    id: "tiny",
    kind: "window-top",
    rect: { x: 0, y: 0, width: 20, height: 20 },
    walkY: 0,
    minX: 24,
    maxX: -4
  };

  assert.equal(isPatrolSurface(tiny), false);
  assert.equal(isPatrolSurface({ type: "walk-to", x: 10, y: 10 }), false);
});

test("screen edge fallback creates safe top and bottom patrol lanes", () => {
  const safeArea = getSafeArea({
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
    scaleFactor: 2
  });

  const surfaces = createScreenEdgeSurfaces(safeArea);

  assert.deepEqual(
    surfaces.map((surface) => surface.id),
    ["screen-top", "screen-bottom"]
  );
  assert.equal(surfaces[0].walkY, 32);
  assert.equal(surfaces[1].walkY, 816);
  assert.ok(surfaces.every(isPatrolSurface));
});
