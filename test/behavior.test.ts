import assert from "node:assert/strict";
import test from "node:test";
import { createInitialPetState, tickPet } from "../src/core/behavior";
import { DEFAULT_PREFERENCES } from "../src/core/preferences";
import {
  chooseNextBehavior,
  createSeededRandom,
  nextDecisionDelay
} from "../src/core/scheduler";
import type { PetBehavior } from "../src/core/types";

test("seeded scheduler is deterministic", () => {
  const first = createSeededRandom("phase-1");
  const second = createSeededRandom("phase-1");

  const firstRun = Array.from({ length: 12 }, () => chooseNextBehavior("normal", first));
  const secondRun = Array.from({ length: 12 }, () => chooseNextBehavior("normal", second));

  assert.deepEqual(firstRun, secondRun);
  assert.ok(firstRun.every(isBehavior));
});

test("seeded decision delays are deterministic and profile bounded", () => {
  const first = createSeededRandom("delay");
  const second = createSeededRandom("delay");

  const calm = nextDecisionDelay("calm", first);
  const normal = nextDecisionDelay("normal", first);
  const playful = nextDecisionDelay("playful", first);

  assert.equal(calm, nextDecisionDelay("calm", second));
  assert.equal(normal, nextDecisionDelay("normal", second));
  assert.equal(playful, nextDecisionDelay("playful", second));

  assert.ok(calm >= 3500 && calm <= 9000);
  assert.ok(normal >= 2200 && normal <= 6500);
  assert.ok(playful >= 1400 && playful <= 4200);
});

test("tick chooses deterministic walk targets inside screen bounds", () => {
  const state = {
    ...createInitialPetState(),
    position: { x: 90, y: 50 },
    elapsedInStateMs: 100,
    nextDecisionMs: 100
  };

  const next = tickPet(state, {
    deltaMs: 1,
    preferences: DEFAULT_PREFERENCES,
    cursor: null,
    screen: { width: 100, height: 80 },
    random: fromSequence([0.39, 1, 0.5])
  });

  assert.equal(next.behavior, "walk");
  assert.deepEqual(next.target, { x: 68, y: 48 });
  assert.equal(next.facing, "left");
});

test("tick faces the cursor during quiet states", () => {
  const state = {
    ...createInitialPetState(),
    behavior: "idle" as const,
    position: { x: 50, y: 50 },
    facing: "left" as const,
    elapsedInStateMs: 0,
    nextDecisionMs: 5000
  };

  const next = tickPet(state, {
    deltaMs: 16,
    preferences: DEFAULT_PREFERENCES,
    cursor: { x: 80, y: 50 },
    screen: { width: 120, height: 120 },
    random: fromSequence([])
  });

  assert.equal(next.behavior, "idle");
  assert.equal(next.facing, "right");
});

test("one-shot behaviors return to idle after their duration", () => {
  const state = {
    ...createInitialPetState(),
    behavior: "scratch" as const,
    elapsedInStateMs: 799,
    nextDecisionMs: 5000
  };

  const next = tickPet(state, {
    deltaMs: 2,
    preferences: DEFAULT_PREFERENCES,
    cursor: null,
    screen: { width: 120, height: 120 },
    random: fromSequence([])
  });

  assert.equal(next.behavior, "idle");
  assert.equal(next.elapsedInStateMs, 0);
});

function fromSequence(values: number[]) {
  let index = 0;
  return () => values[index++] ?? 0;
}

function isBehavior(value: string): value is PetBehavior {
  return [
    "idle",
    "walk",
    "sleep",
    "wake",
    "look",
    "meow",
    "scratch",
    "groom",
    "pounce"
  ].includes(value);
}
