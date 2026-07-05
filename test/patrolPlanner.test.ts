import assert from "node:assert/strict";
import test from "node:test";
import {
  createScreenEdgeSurface,
  createScreenRoamSurface,
  createWindowTopSurface
} from "../src/core/patrolSurface";
import { getSafeArea } from "../src/core/screen";
import {
  createAnchoredPatrolState,
  createInitialPatrolState,
  planPatrolStep,
  type PatrolPlannerInput
} from "../src/core/patrolPlanner";

const surface = createWindowTopSurface("front-window", {
  x: 100,
  y: 80,
  width: 500,
  height: 400
});

const roamSurface = createScreenRoamSurface(
  getSafeArea({
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
    scaleFactor: 2
  })
);

test("patrol planner keeps the cat walking on the selected surface lane", () => {
  const input: PatrolPlannerInput = {
    state: createInitialPatrolState(surface),
    surface,
    deltaMs: 1000,
    petSize: 96
  };

  const next = planPatrolStep(input);

  assert.ok(next.position.y < surface.walkY);
  assert.ok(next.position.y + 96 > surface.walkY);
  assert.equal(next.behavior, "walk");
  assert.equal(next.facing, "right");
  assert.ok(next.position.x > surface.minX);
});

test("patrol planner roams freely across the screen instead of following a line", () => {
  const state = {
    ...createInitialPatrolState(roamSurface),
    position: { x: 100, y: 100 },
    roamTarget: { x: 500, y: 420 }
  };

  const next = planPatrolStep({
    state,
    surface: roamSurface,
    deltaMs: 2_000,
    petSize: 96,
    speedPxPerMs: 0.1
  });

  assert.equal(next.behavior, "walk");
  assert.ok(next.position.x > state.position.x);
  assert.ok(next.position.y > state.position.y);
  assert.deepEqual(next.roamTarget, state.roamTarget);
});

test("patrol planner can start roaming from a user-dragged anchor", () => {
  const state = createAnchoredPatrolState(roamSurface, { x: 420, y: 360 }, 96);

  assert.equal(state.position.x, 420);
  assert.equal(state.position.y, 360);
  assert.equal(state.mode, "perching");
  assert.equal(state.pauseMs, 1_500);

  const paused = planPatrolStep({
    state,
    surface: roamSurface,
    deltaMs: 500,
    petSize: 96
  });

  assert.equal(paused.behavior, "look");
  assert.deepEqual(paused.position, state.position);
});

test("patrol planner can sit on a visible app top frame while roaming", () => {
  const state = {
    ...createInitialPatrolState(roamSurface),
    stableSurfaceMs: 9_000,
    position: { x: 320, y: 280 },
    roamTarget: { x: 900, y: 600 }
  };

  const next = planPatrolStep({
    state,
    surface: roamSurface,
    restSurface: surface,
    deltaMs: 500,
    petSize: 96,
    restRoll: 0.03
  });

  assert.equal(next.mode, "sleeping");
  assert.equal(next.behavior, "sleep");
  assert.equal(next.targetRestSpot?.surfaceId, surface.id);
  assert.ok(next.position.y < surface.walkY);
  assert.ok(next.position.y + 96 > surface.walkY);
});

test("patrol planner moves around an app frame instead of only along one line", () => {
  const state = createInitialPatrolState(surface);

  const next = planPatrolStep({
    state,
    surface,
    deltaMs: 14_000,
    petSize: 96,
    speedPxPerMs: 0.045
  });

  assert.equal(next.behavior, "walk");
  assert.ok(next.position.y > state.position.y);
  assert.notEqual(next.frameEdge, "top");
});

test("patrol planner turns around at screen edges", () => {
  const screenSurface = createScreenEdgeSurface("screen-bottom", {
    x: 0,
    y: 24,
    width: 800,
    height: 600
  });
  const state = {
    ...createInitialPatrolState(screenSurface),
    position: { x: screenSurface.maxX - 1, y: screenSurface.walkY },
    direction: "right" as const
  };

  const next = planPatrolStep({ state, surface: screenSurface, deltaMs: 1000, petSize: 96 });

  assert.equal(next.direction, "left");
  assert.equal(next.facing, "left");
  assert.equal(next.position.x, screenSurface.maxX);
});

test("patrol planner can pause without leaving the lane", () => {
  const state = {
    ...createInitialPatrolState(surface),
    pauseMs: 500
  };

  const next = planPatrolStep({ state, surface, deltaMs: 200, petSize: 96 });

  assert.equal(next.behavior, "look");
  assert.equal(next.pauseMs, 300);
  assert.deepEqual(next.position, state.position);
});

test("patrol planner can sleep on a stable app frame rest spot", () => {
  const state = {
    ...createInitialPatrolState(surface),
    stableSurfaceMs: 9_000,
    position: { x: 300, y: surface.walkY - 80 }
  };

  const next = planPatrolStep({
    state,
    surface,
    deltaMs: 500,
    petSize: 96,
    restRoll: 0.03
  });

  assert.equal(next.mode, "sleeping");
  assert.equal(next.behavior, "sleep");
  assert.equal(next.targetRestSpot?.kind, "center");
  assert.ok(next.position.y < surface.walkY);
  assert.ok(next.position.y + 96 > surface.walkY);
});

test("patrol planner wakes and resets when the app surface changes", () => {
  const nextSurface = createWindowTopSurface("front-window:Browser", {
    x: 300,
    y: 120,
    width: 600,
    height: 400
  });
  const sleeping = {
    ...createInitialPatrolState(surface),
    mode: "sleeping" as const,
    behavior: "sleep" as const,
    stableSurfaceMs: 12_000
  };

  const next = planPatrolStep({
    state: sleeping,
    surface: nextSurface,
    deltaMs: 250,
    petSize: 96
  });

  assert.equal(next.surfaceId, nextSurface.id);
  assert.equal(next.mode, "walking");
  assert.equal(next.behavior, "walk");
  assert.equal(next.stableSurfaceMs, 250);
});
