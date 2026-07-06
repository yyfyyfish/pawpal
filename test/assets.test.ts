import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";
import {
  DEFAULT_CAT_ATLAS_PATH,
  DEFAULT_SOUND_CUES,
  resolveAnimationFrames,
  validateSpriteAtlas
} from "../src/core/spriteAtlas";
import type { PetBehavior } from "../src/core/types";

const REQUIRED_ANIMATIONS: PetBehavior[] = [
  "idle",
  "walk",
  "sleep",
  "wake",
  "look",
  "meow",
  "scratch",
  "groom",
  "pounce",
  "perch"
];

test("default cat atlas metadata covers every Phase 3 animation", async () => {
  const atlas = JSON.parse(await readFile(`public${DEFAULT_CAT_ATLAS_PATH}`, "utf8"));
  const result = validateSpriteAtlas(atlas, REQUIRED_ANIMATIONS);

  assert.deepEqual(result, []);

  for (const animation of REQUIRED_ANIMATIONS) {
    const frames = resolveAnimationFrames(atlas, animation);
    assert.ok(frames.length > 0, `${animation} should resolve at least one frame`);
  }
});

test("default cat sprite sheet and sound cues are local assets", async () => {
  const atlas = JSON.parse(await readFile(`public${DEFAULT_CAT_ATLAS_PATH}`, "utf8"));

  await access(`public${atlas.image}`, constants.R_OK);

  for (const cue of DEFAULT_SOUND_CUES) {
    await access(`public${cue.path}`, constants.R_OK);
  }

  assert.equal(atlas.animations.meow.soundCue, "meow-soft");
  assert.equal(atlas.animations.scratch.soundCue, "scratch-soft");
  assert.equal(atlas.animations.groom.soundCue, "purr-short");
});

test("default cat atlas includes multi-frame motion polish", async () => {
  const atlas = JSON.parse(await readFile(`public${DEFAULT_CAT_ATLAS_PATH}`, "utf8"));

  assert.ok(atlas.animations.walk.frames.length >= 3);
  assert.ok(atlas.animations.sleep.frames.length >= 2);
  assert.ok(atlas.animations.wake.frames.length >= 2);
  assert.ok(atlas.animations.look.frames.length >= 2);
  assert.ok(atlas.animations.scratch.frames.length >= 2);
});

test("pet runtime reads sound cues from loaded sprite assets", async () => {
  const source = await readFile("src/ui/PetApp.tsx", "utf8");

  assert.match(source, /spriteAssetsRef/);
  assert.match(source, /atlas\.animations\[petState\.current\.behavior\]\?\.soundCue/);
});

test("atlas validation reports missing animations and frames", () => {
  const errors = validateSpriteAtlas(
    {
      image: "/assets/sprites/cat/missing.png",
      cellWidth: 32,
      cellHeight: 32,
      frames: {},
      animations: {}
    },
    ["idle"]
  );

  assert.deepEqual(errors, [
    "missing frame idle-0",
    "missing animation idle"
  ]);
});

test("sprite renderer scales frames continuously with the canvas", async () => {
  const source = await readFile("src/core/renderer.ts", "utf8");

  assert.match(source, /const scale = Math\.min\(canvas\.width \/ frame\.width, canvas\.height \/ frame\.height\)/);
  assert.doesNotMatch(source, /Math\.floor\(Math\.min\(canvas\.width \/ frame\.width/);
});

test("sprite renderer stays transparent while sprite assets load", async () => {
  const source = await readFile("src/core/renderer.ts", "utf8");

  assert.match(source, /if \(!assets\) {\s*return;\s*}/);
  assert.doesNotMatch(source, /drawPlaceholderCat/);
});
