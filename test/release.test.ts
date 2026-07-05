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
  assert.match(readme, /Typing Guard/);
});

test("app icon uses cat artwork for native bundling", async () => {
  const config = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));
  const icons = config.bundle.icon as string[];

  assert.ok(icons.length > 0);
  assert.ok(icons.includes("icons/icon.icns"));
  assert.ok(icons.includes("icons/icon.ico"));

  for (const icon of icons) {
    await access(`src-tauri/${icon}`, constants.R_OK);
  }

  const source = await readFile("src-tauri/icons/app-icon.svg", "utf8");
  assert.match(source, /pawpal-app-cat/);
  assert.match(source, /#7a5a48/i);
});
