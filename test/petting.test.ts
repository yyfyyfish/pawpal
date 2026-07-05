import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyPettingReaction,
  createInitialPettingGestureState,
  updatePettingGesture
} from "../src/core/petting";
import { createInitialPetMindState } from "../src/core/mind";

test("slow pointer strokes register as petting", () => {
  let gesture = createInitialPettingGestureState();

  let result = updatePettingGesture(gesture, {
    point: { x: 20, y: 20 },
    deltaMs: 0
  });
  gesture = result.state;

  result = updatePettingGesture(gesture, {
    point: { x: 82, y: 24 },
    deltaMs: 700
  });

  assert.equal(result.reaction, "pet");
});

test("quick pointer strokes register as scratching", () => {
  let gesture = createInitialPettingGestureState();

  let result = updatePettingGesture(gesture, {
    point: { x: 20, y: 20 },
    deltaMs: 0
  });
  gesture = result.state;

  result = updatePettingGesture(gesture, {
    point: { x: 98, y: 20 },
    deltaMs: 180
  });

  assert.equal(result.reaction, "scratch");
});

test("too much repeated petting becomes overstimulation", () => {
  let gesture = createInitialPettingGestureState();
  let reaction: string | null = null;

  for (let index = 0; index < 4; index += 1) {
    const start = updatePettingGesture(gesture, {
      point: { x: 20, y: 20 },
      deltaMs: 80
    });
    const end = updatePettingGesture(start.state, {
      point: { x: 82, y: 24 },
      deltaMs: 520
    });
    gesture = end.state;
    reaction = end.reaction;
  }

  assert.equal(reaction, "overstimulated");
});

test("petting reactions update the hidden needs state", () => {
  const mind = createInitialPetMindState();
  const petted = applyPettingReaction(mind, "pet");
  const overstimulated = applyPettingReaction(petted, "overstimulated");

  assert.ok(petted.affection > mind.affection);
  assert.ok(petted.comfort > mind.comfort);
  assert.ok(overstimulated.irritation > petted.irritation);
});

test("pet app wires pointer movement into petting reactions", async () => {
  const source = await readFile("src/ui/PetApp.tsx", "utf8");

  assert.match(source, /updatePettingGesture/);
  assert.match(source, /pettingReactionToBehavior/);
  assert.match(source, /onPointerMove/);
});
