import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

test("release checklist and notarization plan exist", async () => {
  const release = await readFile("docs/release.md", "utf8");

  for (const section of [
    "Build Gate",
    "Manual QA",
    "Signing",
    "Notarization",
    "Known Limitations"
  ]) {
    assert.match(release, new RegExp(`## ${section}`));
  }
});

test("bundle metadata is V1-ready and app bundle target remains enabled", async () => {
  const config = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));

  assert.equal(config.productName, "PawPal");
  assert.equal(config.identifier, "com.pawpal.desktop");
  assert.equal(config.bundle.active, true);
  assert.ok(config.bundle.targets.includes("app"));
});

test("readme includes V1 install and build guidance", async () => {
  const readme = await readFile("README.md", "utf8");

  assert.match(readme, /V1/);
  assert.match(readme, /npm run tauri:build/);
  assert.match(readme, /PawPal\.app/);
});

test("app icon asset is present for bundling", async () => {
  await access("src-tauri/icons/icon.png", constants.R_OK);
});
