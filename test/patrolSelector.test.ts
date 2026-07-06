import assert from "node:assert/strict";
import test from "node:test";
import {
  createScreenEdgeSurfaces,
  createScreenRoamSurface,
  createWindowTopSurface
} from "../src/core/patrolSurface";
import {
  choosePatrolSurface,
  chooseRestSurface,
  shouldMigrateSurface
} from "../src/core/patrolSelector";
import { getSafeArea } from "../src/core/screen";

const safeArea = getSafeArea({
  x: 0,
  y: 0,
  width: 1440,
  height: 900,
  scaleFactor: 2
});

test("surface selector prefers screen roam while keeping apps available for rest", () => {
  const frontWindow = createWindowTopSurface("front-window:Safari", {
    x: 200,
    y: 120,
    width: 800,
    height: 600
  });

  const selected = choosePatrolSurface({
    preferred: "front-window",
    frontWindow,
    fallbackSurfaces: [createScreenRoamSurface(safeArea), ...createScreenEdgeSurfaces(safeArea)]
  });

  assert.equal(selected.id, "screen-roam");
});

test("surface selector falls back to screen edges when no app surface exists", () => {
  const selected = choosePatrolSurface({
    preferred: "front-window",
    frontWindow: null,
    fallbackSurfaces: [createScreenRoamSurface(safeArea), ...createScreenEdgeSurfaces(safeArea)]
  });

  assert.equal(selected.id, "screen-roam");
});

test("surface selector holds the current app surface during brief detection gaps", () => {
  const currentSurface = createWindowTopSurface("front-window:Safari", {
    x: 200,
    y: 120,
    width: 800,
    height: 600
  });

  const selected = choosePatrolSurface({
    preferred: "front-window",
    currentSurface,
    frontWindow: null,
    frontWindowMissingMs: 3_000,
    fallbackSurfaces: [createScreenRoamSurface(safeArea), ...createScreenEdgeSurfaces(safeArea)]
  });

  assert.equal(selected.id, "screen-roam");
});

test("surface selector falls back after a sustained front-window detection gap", () => {
  const currentSurface = createWindowTopSurface("front-window:Safari", {
    x: 200,
    y: 120,
    width: 800,
    height: 600
  });

  const selected = choosePatrolSurface({
    preferred: "front-window",
    currentSurface,
    frontWindow: null,
    frontWindowMissingMs: 12_000,
    fallbackSurfaces: [createScreenRoamSurface(safeArea), ...createScreenEdgeSurfaces(safeArea)]
  });

  assert.equal(selected.id, "screen-roam");
});

test("surface migration waits until the target changes and cooldown has elapsed", () => {
  assert.equal(shouldMigrateSurface("screen-bottom", "front-window:Safari", 10_000), true);
  assert.equal(shouldMigrateSurface("screen-bottom", "front-window:Safari", 500), false);
  assert.equal(shouldMigrateSurface("front-window:Safari", "front-window:Safari", 10_000), false);
});

test("rest surface selector chooses nearby visible app windows", () => {
  const notes = createWindowTopSurface("visible-window:Notes", {
    x: 80,
    y: 120,
    width: 480,
    height: 420
  });
  const browser = createWindowTopSurface("visible-window:Browser", {
    x: 900,
    y: 140,
    width: 420,
    height: 420
  });

  const selected = chooseRestSurface([notes, browser], { x: 980, y: 180 });

  assert.equal(selected?.id, browser.id);
});

test("rest surface selector prefers remembered app rest spots", () => {
  const notes = createWindowTopSurface("visible-window:Notes", {
    x: 80,
    y: 120,
    width: 480,
    height: 420
  });
  const browser = createWindowTopSurface("visible-window:Browser", {
    x: 900,
    y: 140,
    width: 420,
    height: 420
  });

  const selected = chooseRestSurface(
    [notes, browser],
    { x: 120, y: 140 },
    "visible-window:Browser:center"
  );

  assert.equal(selected?.id, browser.id);
});
