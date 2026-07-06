import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { selectCompanionSoundCue } from "../src/core/sound";

test("sound policy purrs for positive petting", () => {
  assert.equal(
    selectCompanionSoundCue({
      behavior: "look",
      pettingReaction: "pet",
      atlasCue: undefined,
      muted: false,
      elapsedSinceLastCueMs: 5_000
    }),
    "purr-short"
  );
});

test("sound policy uses scratch cue for overstimulation", () => {
  assert.equal(
    selectCompanionSoundCue({
      behavior: "scratch",
      pettingReaction: "overstimulated",
      atlasCue: "scratch-soft",
      muted: false,
      elapsedSinceLastCueMs: 5_000
    }),
    "scratch-soft"
  );
});

test("sound policy suppresses muted and too-frequent cues", () => {
  assert.equal(
    selectCompanionSoundCue({
      behavior: "meow",
      atlasCue: "meow-soft",
      muted: true,
      elapsedSinceLastCueMs: 5_000
    }),
    null
  );
  assert.equal(
    selectCompanionSoundCue({
      behavior: "meow",
      atlasCue: "meow-soft",
      muted: false,
      elapsedSinceLastCueMs: 300
    }),
    null
  );
});

test("sound policy keeps ordinary animation sounds contextual", () => {
  assert.equal(
    selectCompanionSoundCue({
      behavior: "meow",
      atlasCue: "meow-soft",
      muted: false,
      elapsedSinceLastCueMs: 5_000
    }),
    "meow-soft"
  );
  assert.equal(
    selectCompanionSoundCue({
      behavior: "sleep",
      atlasCue: undefined,
      muted: false,
      elapsedSinceLastCueMs: 5_000
    }),
    null
  );
});

test("sound policy does not loop scratch cue from animation state alone", () => {
  assert.equal(
    selectCompanionSoundCue({
      behavior: "scratch",
      atlasCue: "scratch-soft",
      muted: false,
      elapsedSinceLastCueMs: 5_000
    }),
    null
  );
});

test("pet runtime uses contextual sound policy", async () => {
  const source = await readFile("src/ui/PetApp.tsx", "utf8");

  assert.match(source, /selectCompanionSoundCue/);
  assert.match(source, /lastPettingReaction/);
  assert.match(source, /elapsedSinceLastCueMs/);
});
