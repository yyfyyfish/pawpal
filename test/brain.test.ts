import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createRuleBasedBrain,
  isCatIntent,
  type BrainContext,
  type CatIntent
} from "../src/core/brain";

test("cat intents are a narrow safe command language", () => {
  const valid: CatIntent[] = [
    { type: "animate", behavior: "sleep" },
    { type: "say", text: "tiny nap", mood: "sleepy" },
    { type: "set_energy", energy: "calm" },
    { type: "patrol", surfacePreference: "front-window", intensity: "lazy" },
    { type: "do_nothing" }
  ];

  for (const intent of valid) {
    assert.equal(isCatIntent(intent), true);
  }

  assert.equal(isCatIntent({ type: "shell", command: "open -a Finder" }), false);
  assert.equal(isCatIntent({ type: "animate", behavior: "delete-files" }), false);
  assert.equal(isCatIntent({ type: "patrol", surfacePreference: "filesystem" }), false);
});

test("brain docs describe patrol as a safe intent", async () => {
  const doc = await readFile("docs/brain.md", "utf8");

  assert.match(doc, /patrol/);
  assert.match(doc, /DeepAgent/);
  assert.match(doc, /must not.*native/i);
});

test("rule-based brain emits safe ambient intents", async () => {
  const brain = createRuleBasedBrain();
  const sleepyContext: BrainContext = {
    behavior: "idle",
    energy: "normal",
    muted: false,
    idleMs: 16 * 60 * 1000,
    localHour: 23
  };

  assert.deepEqual(await brain.nextIntent(sleepyContext), {
    type: "animate",
    behavior: "sleep"
  });
});

test("brain layer does not import native OS or Tauri APIs", async () => {
  const source = await readFile("src/core/brain.ts", "utf8");

  assert.doesNotMatch(source, /@tauri-apps/);
  assert.doesNotMatch(source, /child_process|fs|shell|command/i);
});
