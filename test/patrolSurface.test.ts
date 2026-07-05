import assert from "node:assert/strict";
import test from "node:test";
import {
  createScreenEdgeSurfaces,
  createScreenEdgeSurface,
  createSurfaceRestSpots,
  createWindowTopSurface,
  positionPetOnSurface,
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

test("window surfaces expose weighted rest spots inside the frame", () => {
  const surface = createWindowTopSurface("front-window:Editor", {
    x: 100,
    y: 80,
    width: 700,
    height: 480
  });

  const spots = createSurfaceRestSpots(surface);

  assert.deepEqual(
    spots.map((spot) => [spot.kind, spot.x, spot.y, spot.weight]),
    [
      ["left-corner", 184, 80, 0.8],
      ["center", 450, 80, 1],
      ["right-corner", 668, 80, 0.8]
    ]
  );
});

test("surface pose offsets make the cat overlap an app frame instead of floating on a line", () => {
  const surface = createWindowTopSurface("front-window:Editor", {
    x: 100,
    y: 80,
    width: 700,
    height: 480
  });
  const walking = positionPetOnSurface(surface, 320, "walking", 120);
  const sleeping = positionPetOnSurface(surface, 320, "sleeping", 120);

  assert.equal(walking.x, 320);
  assert.ok(walking.y < surface.walkY);
  assert.ok(walking.y + 120 > surface.walkY);
  assert.ok(sleeping.y > walking.y);
  assert.ok(sleeping.y + 120 > surface.walkY);
});
