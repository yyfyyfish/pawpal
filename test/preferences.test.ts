import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  toStoredPreferences
} from "../src/core/preferences";
import {
  DEFAULT_WINDOW_POSITION,
  MAX_SCALE,
  MIN_SCALE,
  applyPetCommand,
  isPetCommand,
  menuIdToCommand,
  type PetCommand
} from "../src/core/interaction";

test("stored preferences are normalized and clamped", () => {
  const preferences = normalizePreferences({
    muted: true,
    paused: "yes",
    scale: 99,
    energy: "zoomies",
    clickThrough: false,
    launchAtLogin: true
  });

  assert.deepEqual(preferences, {
    ...DEFAULT_PREFERENCES,
    muted: true,
    scale: MAX_SCALE,
    clickThrough: false,
    launchAtLogin: true
  });

  assert.deepEqual(toStoredPreferences(preferences), preferences);
});

test("settings commands can set exact scale and launch-at-login", () => {
  const state = {
    preferences: DEFAULT_PREFERENCES,
    position: DEFAULT_WINDOW_POSITION
  };

  const scaled = applyPetCommand(state, { type: "set-scale", scale: MIN_SCALE - 5 });
  assert.equal(scaled.preferences.scale, MIN_SCALE);

  const autostart = applyPetCommand(scaled, {
    type: "set-launch-at-login",
    launchAtLogin: true
  });
  assert.equal(autostart.preferences.launchAtLogin, true);
});

test("settings command ids map to typed pet commands", () => {
  const commands: Array<[string, PetCommand]> = [
    ["open-settings", { type: "open-settings" }],
    ["launch-at-login-on", { type: "set-launch-at-login", launchAtLogin: true }],
    ["launch-at-login-off", { type: "set-launch-at-login", launchAtLogin: false }]
  ];

  for (const [id, command] of commands) {
    assert.deepEqual(menuIdToCommand(id), command);
    assert.equal(isPetCommand(command), true);
  }
});

test("tauri config and native tray expose the settings window", async () => {
  const config = JSON.parse(await readFile("src-tauri/tauri.conf.json", "utf8"));
  const rust = await readFile("src-tauri/src/lib.rs", "utf8");
  const settingsWindow = config.app.windows.find((window: { label: string }) => {
    return window.label === "settings";
  });

  assert.ok(settingsWindow);
  assert.equal(settingsWindow.visible, false);
  assert.equal(settingsWindow.width >= 320, true);
  assert.match(rust, /open-settings/);
  assert.match(rust, /tauri_plugin_autostart/);
});
