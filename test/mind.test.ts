import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseCompanionBehavior,
  createInitialPetMindState,
  selectPetMood,
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

test("companion routine chooses sleep when the cat is tired", () => {
  const behavior = chooseCompanionBehavior(
    {
      ...createInitialPetMindState(),
      energy: 0.18,
      sleepPressure: 0.86
    },
    {
      currentBehavior: "idle",
      energyPreference: "normal",
      random: () => 0.9
    }
  );

  assert.equal(behavior, "sleep");
});

test("companion routine wakes after enough sleep recovery", () => {
  const behavior = chooseCompanionBehavior(
    {
      ...createInitialPetMindState(),
      energy: 0.82,
      sleepPressure: 0.12
    },
    {
      currentBehavior: "sleep",
      energyPreference: "normal",
      random: () => 0.9
    }
  );

  assert.equal(behavior, "wake");
});

test("companion routine prefers grooming when calm and comfortable", () => {
  const behavior = chooseCompanionBehavior(
    {
      ...createInitialPetMindState(),
      comfort: 0.86,
      irritation: 0.02
    },
    {
      currentBehavior: "idle",
      energyPreference: "calm",
      random: () => 0.12
    }
  );

  assert.equal(behavior, "groom");
});

test("companion routine scratches when irritated", () => {
  const behavior = chooseCompanionBehavior(
    {
      ...createInitialPetMindState(),
      irritation: 0.78
    },
    {
      currentBehavior: "idle",
      energyPreference: "normal",
      random: () => 0.9
    }
  );

  assert.equal(behavior, "scratch");
});

test("companion routine pounces when playful and curious", () => {
  const behavior = chooseCompanionBehavior(
    {
      ...createInitialPetMindState(),
      energy: 0.8,
      curiosity: 0.88
    },
    {
      currentBehavior: "idle",
      energyPreference: "playful",
      random: () => 0.18
    }
  );

  assert.equal(behavior, "pounce");
});

test("pet mood exposes visible personality from hidden needs", () => {
  assert.equal(
    selectPetMood({
      ...createInitialPetMindState(),
      irritation: 0.78
    }),
    "annoyed"
  );
  assert.equal(
    selectPetMood({
      ...createInitialPetMindState(),
      energy: 0.22,
      sleepPressure: 0.76
    }),
    "sleepy"
  );
  assert.equal(
    selectPetMood(
      {
        ...createInitialPetMindState(),
        energy: 0.78,
        curiosity: 0.82
      },
      "playful"
    ),
    "playful"
  );
  assert.equal(
    selectPetMood({
      ...createInitialPetMindState(),
      comfort: 0.84,
      affection: 0.7
    }),
    "cozy"
  );
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
