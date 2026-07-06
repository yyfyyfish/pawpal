import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  advanceCompanion,
  createInitialCompanionState
} from "../src/core/companion";

test("companion runtime emits lifelike animation intents from needs", () => {
  const state = createInitialCompanionState({
    mind: {
      energy: 0.18,
      affection: 0.55,
      curiosity: 0.45,
      comfort: 0.6,
      irritation: 0,
      sleepPressure: 0.9
    }
  });

  const result = advanceCompanion(state, {
    deltaMs: 1000,
    currentBehavior: "idle",
    energyPreference: "normal",
    nowMs: 1000,
    random: () => 0.9
  });

  assert.deepEqual(result.intent, { type: "animate", behavior: "sleep" });
  assert.ok(result.state.mind.sleepPressure > state.mind.sleepPressure);
});

test("companion runtime turns petting into memory and animation intent", () => {
  const state = createInitialCompanionState();

  const result = advanceCompanion(state, {
    deltaMs: 250,
    currentBehavior: "idle",
    energyPreference: "normal",
    pettingReaction: "pet",
    nowMs: 2000
  });

  assert.deepEqual(result.intent, { type: "animate", behavior: "look" });
  assert.equal(result.state.memory.care.pets, 1);
  assert.equal(result.state.memory.care.lastInteractionAt, 2000);
  assert.ok(result.state.mind.affection > state.mind.affection);
  assert.equal(result.memoryChanged, true);
});

test("companion runtime turns dragging into cautious personality state", () => {
  const state = createInitialCompanionState();

  const result = advanceCompanion(state, {
    deltaMs: 250,
    currentBehavior: "idle",
    energyPreference: "normal",
    dragged: true,
    nowMs: 2_500
  });

  assert.deepEqual(result.intent, { type: "animate", behavior: "scratch" });
  assert.equal(result.state.memory.care.drags, 1);
  assert.equal(result.state.memory.care.lastInteractionAt, 2_500);
  assert.ok(result.state.mind.irritation > state.mind.irritation);
  assert.equal(result.memoryChanged, true);
});

test("companion runtime records a rest spot only once per sleep stay", () => {
  let state = createInitialCompanionState();

  let result = advanceCompanion(state, {
    deltaMs: 1000,
    currentBehavior: "sleep",
    energyPreference: "calm",
    restSpotId: "front-window:Code:center",
    nowMs: 3000
  });
  state = result.state;

  result = advanceCompanion(state, {
    deltaMs: 1000,
    currentBehavior: "sleep",
    energyPreference: "calm",
    restSpotId: "front-window:Code:center",
    nowMs: 4000
  });

  assert.equal(result.state.memory.restSpots["front-window:Code:center"].visits, 1);
});

test("companion runtime adds small idle life animations after quiet time", () => {
  const state = createInitialCompanionState({
    ambientIdleMs: 3_900
  });

  const result = advanceCompanion(state, {
    deltaMs: 200,
    currentBehavior: "look",
    energyPreference: "normal",
    nowMs: 5_000,
    random: () => 0.55
  });

  assert.deepEqual(result.intent, { type: "animate", behavior: "groom" });
  assert.equal(result.state.ambientIdleMs, 0);
  assert.equal(result.memoryChanged, false);
});

test("companion runtime resets idle life timing while walking", () => {
  const state = createInitialCompanionState({
    ambientIdleMs: 3_900
  });

  const result = advanceCompanion(state, {
    deltaMs: 500,
    currentBehavior: "walk",
    energyPreference: "normal",
    nowMs: 5_500,
    random: () => 0
  });

  assert.deepEqual(result.intent, { type: "do_nothing" });
  assert.equal(result.state.ambientIdleMs, 0);
});

test("companion runtime keeps native APIs outside the core boundary", async () => {
  const source = await readFile("src/core/companion.ts", "utf8");

  assert.doesNotMatch(source, /@tauri-apps/);
  assert.doesNotMatch(source, /availableMonitors|getCurrentWindow|invoke/);
});

test("pet app wires companion mind and memory into runtime", async () => {
  const source = await readFile("src/ui/PetApp.tsx", "utf8");

  assert.match(source, /advanceCompanion/);
  assert.match(source, /createInitialCompanionState/);
  assert.match(source, /loadCompanionMemory/);
  assert.match(source, /saveCompanionMemory/);
  assert.match(source, /pendingPettingReaction/);
});
