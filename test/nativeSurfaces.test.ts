import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { nativeWindowBoundsToSurface } from "../src/ui/nativeSurfaces";

test("native window bounds map to a front-window patrol surface", () => {
  const surface = nativeWindowBoundsToSurface({
    x: 180,
    y: 110,
    width: 900,
    height: 600,
    appName: "Safari"
  });

  assert.equal(surface?.id, "front-window:Safari");
  assert.equal(surface?.kind, "window-top");
  assert.equal(surface?.walkY, 110);
  assert.equal(surface?.minX, 204);
  assert.equal(surface?.maxX, 1056);
});

test("native window bounds reject unusable app surfaces", () => {
  assert.equal(
    nativeWindowBoundsToSurface({
      x: 0,
      y: 0,
      width: 32,
      height: 500,
      appName: "Tiny"
    }),
    null
  );
});

test("tauri exposes a frontmost window bounds command", async () => {
  const source = await readFile("src-tauri/src/lib.rs", "utf8");

  assert.match(source, /frontmost_window_bounds/);
  assert.match(source, /generate_handler!\[[^\]]*frontmost_window_bounds/s);
});
