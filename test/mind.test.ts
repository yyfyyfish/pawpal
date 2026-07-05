import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialPetMindState,
  tickPetMind,
  type PetMindState
} from "../src/core/mind";

test("pet mind starts with calm bounded needs", () => {
  const mind = createInitialPetMindState();

  assert.equal(mind.energy, 0.68);
  assert.equal(mind.affection, 0.55);
  assert.equal(mind.curiosity, 0.45);
  assert.equal(mind.comfort, 0.6);
  assert.equal(mind.irritation, 0);
  assert.equal(mind.sleepPressure, 0.18);
});

test("pet mind drifts toward sleepiness while awake", () => {
  const mind = tickPetMind(createInitialPetMindState(), {
    deltaMs: 30 * 60 * 1000,
    behavior: "walk",
    energyPreference: "normal"
  });

  assert.ok(mind.energy < 0.68);
  assert.ok(mind.sleepPressure > 0.18);
  assert.ok(mind.curiosity > 0.45);
});

test("pet mind recovers while sleeping", () => {
  const tired: PetMindState = {
    ...createInitialPetMindState(),
    energy: 0.2,
    sleepPressure: 0.9,
    comfort: 0.4
  };

  const mind = tickPetMind(tired, {
    deltaMs: 20 * 60 * 1000,
    behavior: "sleep",
    energyPreference: "calm"
  });

  assert.ok(mind.energy > tired.energy);
  assert.ok(mind.sleepPressure < tired.sleepPressure);
  assert.ok(mind.comfort > tired.comfort);
});

test("pet mind clamps every need meter", () => {
  const wild: PetMindState = {
    energy: 5,
    affection: -2,
    curiosity: 5,
    comfort: -1,
    irritation: 2,
    sleepPressure: 3
  };

  const mind = tickPetMind(wild, {
    deltaMs: 1000,
    behavior: "idle",
    energyPreference: "playful"
  });

  for (const value of Object.values(mind)) {
    assert.ok(value >= 0 && value <= 1);
  }
});
