import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

test("package exposes phase-0 foundation scripts", async () => {
  const packageJson = await readJson("package.json");

  assert.equal(packageJson.scripts.test, "node --test");
  assert.equal(packageJson.scripts.preflight, "node scripts/preflight.mjs");
  assert.equal(packageJson.scripts.check, "npm run preflight && npm run typecheck && npm test");
  assert.equal(packageJson.scripts.dev, "tauri dev");
});

test("tauri pet window is configured as a desktop overlay", async () => {
  const config = await readJson("src-tauri/tauri.conf.json");
  const petWindow = config.app.windows.find((window) => window.label === "pet");

  assert.ok(petWindow, "expected a pet window");
  assert.equal(petWindow.transparent, true);
  assert.equal(petWindow.decorations, false);
  assert.equal(petWindow.alwaysOnTop, true);
  assert.equal(petWindow.resizable, false);
  assert.equal(petWindow.skipTaskbar, true);
  assert.equal(petWindow.visible, true);
});

test("phase documentation exists for the v1 implementation plan", async () => {
  const roadmap = await readFile("docs/roadmap.md", "utf8");
  const technicalSpec = await readFile("docs/technical-spec.md", "utf8");

  for (const phase of ["Phase 0", "Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6"]) {
    assert.match(roadmap, new RegExp(`## ${phase}:`));
  }

  assert.match(technicalSpec, /BrainProvider/);
  assert.match(technicalSpec, /DeepAgent/);
});

test("preflight script exists and is executable by node", async () => {
  await access("scripts/preflight.mjs", constants.R_OK);
});
