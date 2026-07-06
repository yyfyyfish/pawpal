import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  nativeWindowBoundsToSurfaces,
  nativeTypingBoundsOrNull,
  nativeWindowBoundsToSurface
} from "../src/ui/nativeSurfaces";

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

test("visible native window bounds map to unique app patrol surfaces", () => {
  const surfaces = nativeWindowBoundsToSurfaces([
    {
      x: 180,
      y: 110,
      width: 900,
      height: 600,
      appName: "Safari"
    },
    {
      x: 260,
      y: 180,
      width: 700,
      height: 500,
      appName: "Safari"
    },
    {
      x: 0,
      y: 0,
      width: 32,
      height: 500,
      appName: "Tiny"
    }
  ]);

  assert.deepEqual(
    surfaces.map((surface) => surface.id),
    ["visible-window:Safari", "visible-window:Safari-2"]
  );
  assert.ok(surfaces.every((surface) => surface.kind === "window-top"));
});

test("tauri exposes a frontmost window bounds command", async () => {
  const source = await readFile("src-tauri/src/lib.rs", "utf8");

  assert.match(source, /frontmost_window_bounds/);
  assert.match(source, /async fn frontmost_window_bounds\(\)/);
  assert.match(source, /spawn_blocking\(query_frontmost_window_bounds\)/);
  assert.match(source, /generate_handler!\[[^\]]*frontmost_window_bounds/s);
  assert.match(source, /osascript/);
  assert.match(source, /AXFullScreen/);
  assert.match(source, /bestArea/);
  assert.doesNotMatch(source, /fn frontmost_window_bounds\(\) -> Option<NativeWindowBounds> \{\s*None\s*\}/);
});

test("tauri exposes visible window bounds without reading window titles", async () => {
  const source = await readFile("src-tauri/src/lib.rs", "utf8");

  assert.match(source, /visible_window_bounds/);
  assert.match(source, /async fn visible_window_bounds\(\) -> Vec<NativeWindowBounds>/);
  assert.match(source, /spawn_blocking\(query_visible_window_bounds\)/);
  assert.match(source, /generate_handler!\[[^\]]*visible_window_bounds/s);
  assert.match(source, /application processes/);
  assert.match(source, /AXMinimized/);
  assert.match(source, /parse_window_bounds_list/);
  assert.doesNotMatch(source, /AXTitle/);
});

test("native typing bounds normalize only privacy-safe focused geometry", () => {
  assert.deepEqual(
    nativeTypingBoundsOrNull({
      x: 240,
      y: 320,
      width: 620,
      height: 180,
      source: "focused-element",
      role: "AXTextArea",
      appName: "Terminal"
    }),
    {
      x: 240,
      y: 320,
      width: 620,
      height: 180,
      source: "focused-element",
      role: "AXTextArea",
      appName: "Terminal"
    }
  );

  assert.equal(
    nativeTypingBoundsOrNull({
      x: 240,
      y: 320,
      width: 0,
      height: 180,
      source: "focused-element"
    }),
    null
  );
  assert.equal(
    nativeTypingBoundsOrNull({
      x: 240,
      y: 320,
      width: 620,
      height: 180,
      source: "window"
    }),
    null
  );
});

test("tauri exposes focused typing bounds without reading typed text", async () => {
  const source = await readFile("src-tauri/src/lib.rs", "utf8");

  assert.match(source, /focused_typing_bounds/);
  assert.match(source, /async fn focused_typing_bounds\(\)/);
  assert.match(source, /spawn_blocking\(query_focused_typing_bounds\)/);
  assert.match(source, /NativeTypingBounds/);
  assert.match(source, /generate_handler!\[[^\]]*focused_typing_bounds/s);
  assert.match(source, /AXFocusedUIElement/);
  assert.match(source, /AXTextArea/);
  assert.match(source, /AXTextField/);
  assert.match(source, /AXEditable/);
  assert.match(source, /parse_typing_bounds/);
  assert.doesNotMatch(source, /AXValue/);
  assert.doesNotMatch(source, /AXSelectedText/);
});
