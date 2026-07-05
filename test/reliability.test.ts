import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_SAFE_AREA_INSETS,
  clampToSafeArea,
  chooseNearestMonitor,
  getSafeArea
} from "../src/core/screen";

test("safe area keeps the pet clear of macOS menu bar and dock zones", () => {
  const safeArea = getSafeArea({
    x: 0,
    y: 0,
    width: 1440,
    height: 900,
    scaleFactor: 2
  });

  assert.deepEqual(safeArea.insets, DEFAULT_SAFE_AREA_INSETS);
  assert.equal(safeArea.x, 8);
  assert.equal(safeArea.y, 32);
  assert.equal(safeArea.width, 1424);
  assert.equal(safeArea.height, 808);
});

test("window position clamps into safe monitor bounds", () => {
  const safeArea = getSafeArea({
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    scaleFactor: 2
  });

  assert.deepEqual(clampToSafeArea({ x: -100, y: 999 }, safeArea, { width: 192, height: 192 }), {
    x: 8,
    y: 348
  });
});

test("nearest monitor selection supports multi-monitor recovery", () => {
  const monitor = chooseNearestMonitor(
    { x: 1700, y: 400 },
    [
      { x: 0, y: 0, width: 1440, height: 900, scaleFactor: 2 },
      { x: 1440, y: 0, width: 1280, height: 720, scaleFactor: 1 }
    ]
  );

  assert.deepEqual(monitor, { x: 1440, y: 0, width: 1280, height: 720, scaleFactor: 1 });
});

test("runtime source does not introduce remote network calls", async () => {
  const files = [
    "src/ui/defaultAssets.ts",
    "src/ui/petWindow.ts",
    "src/ui/PetApp.tsx",
    "src-tauri/src/lib.rs"
  ];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /https?:\/\//, `${file} should stay local-only`);
  }
});

test("pet window uses a stable monitor overlay for smooth motion", async () => {
  const source = await readFile("src/ui/petWindow.ts", "utf8");
  const capability = await readFile("src-tauri/capabilities/default.json", "utf8");

  assert.match(source, /loadPetOverlayStage/);
  assert.match(source, /setSize\(new LogicalSize\(stage\.width, stage\.height\)\)/);
  assert.match(source, /setPosition\(new LogicalPosition\(stage\.x, stage\.y\)\)/);
  assert.match(source, /width: monitor\.width/);
  assert.match(source, /height: monitor\.height/);
  assert.match(source, /cursorPosition/);
  assert.match(source, /setPetWindowCursorIgnoring/);
  assert.match(capability, /core:window:allow-cursor-position/);
});

test("macOS reliability QA checklist is documented", async () => {
  const checklist = await readFile("docs/macos-qa.md", "utf8");

  for (const item of [
    "Long-run idle",
    "Multi-monitor",
    "Dock and menu bar",
    "Laptop sleep and wake",
    "Full-screen Spaces",
    "Typing Guard privacy",
    "No network traffic"
  ]) {
    assert.match(checklist, new RegExp(item));
  }

  assert.match(checklist, /focused editable geometry/);
  assert.match(checklist, /does not read typed text/);
});
