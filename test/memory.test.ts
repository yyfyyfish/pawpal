import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createInitialCompanionMemory,
  favoriteRestSpotId,
  normalizeCompanionMemory,
  recordDragMemory,
  recordPettingMemory,
  recordRestSpotVisit
} from "../src/core/memory";

test("companion memory records favorite rest spots", () => {
  let memory = createInitialCompanionMemory();

  memory = recordRestSpotVisit(memory, "front-window:Code:center", 1000);
  memory = recordRestSpotVisit(memory, "front-window:Code:center", 2000);
  memory = recordRestSpotVisit(memory, "screen-roam:corner", 3000);

  assert.equal(memory.restSpots["front-window:Code:center"].visits, 2);
  assert.equal(memory.restSpots["front-window:Code:center"].lastVisitedAt, 2000);
  assert.equal(favoriteRestSpotId(memory), "front-window:Code:center");
});

test("companion memory records petting and scratching care history", () => {
  let memory = createInitialCompanionMemory();

  memory = recordPettingMemory(memory, "pet", 1000);
  memory = recordPettingMemory(memory, "scratch", 2000);
  memory = recordPettingMemory(memory, "overstimulated", 3000);

  assert.equal(memory.care.pets, 1);
  assert.equal(memory.care.scratches, 1);
  assert.equal(memory.care.overstimulations, 1);
  assert.equal(memory.care.lastInteractionAt, 3000);
});

test("companion memory records drag care history", () => {
  let memory = createInitialCompanionMemory();

  memory = recordDragMemory(memory, 4_000);
  memory = recordDragMemory(memory, 4_500);

  assert.equal(memory.care.drags, 2);
  assert.equal(memory.care.lastInteractionAt, 4_500);
});

test("companion memory normalizes malformed stored data", () => {
  const memory = normalizeCompanionMemory({
    restSpots: {
      good: { visits: 3, lastVisitedAt: 50 },
      bad: { visits: -1, lastVisitedAt: "nope" }
    },
    care: {
      pets: 2,
      scratches: "many",
      overstimulations: 1,
      lastInteractionAt: 90
    }
  });

  assert.equal(memory.restSpots.good.visits, 3);
  assert.equal(memory.restSpots.bad, undefined);
  assert.equal(memory.care.pets, 2);
  assert.equal(memory.care.scratches, 0);
  assert.equal(memory.care.overstimulations, 1);
  assert.equal(memory.care.drags, 0);
});

test("pet window exposes local companion memory persistence helpers", async () => {
  const source = await readFile("src/ui/petWindow.ts", "utf8");

  assert.match(source, /loadCompanionMemory/);
  assert.match(source, /saveCompanionMemory/);
  assert.match(source, /companionMemory/);
});
