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
  SCALE_STEP,
  applyPetCommand,
  isPetCommand,
  menuIdToCommand,
  type PetCommand
} from "../src/core/interaction";

test("default size range keeps the pet compact on launch", () => {
  assert.equal(DEFAULT_PREFERENCES.scale, 1.25);
  assert.equal(MIN_SCALE, 0.75);
  assert.equal(MAX_SCALE, 2.5);
  assert.equal(SCALE_STEP, 0.125);
});

test("stored preferences are normalized and clamped", () => {
  const preferences = normalizePreferences({
    muted: true,
    paused: "yes",
    scale: 99,
    energy: "zoomies",
    clickThrough: false,
    launchAtLogin: true,
    patrolEnabled: false,
    patrolSurfacePreference: "screen-edge",
    patrolIntensity: "busy",
    typingGuardEnabled: false
  });

  assert.deepEqual(preferences, {
    ...DEFAULT_PREFERENCES,
    muted: true,
    scale: MAX_SCALE,
    clickThrough: false,
    launchAtLogin: true,
    patrolEnabled: false,
    patrolSurfacePreference: "screen-edge",
    patrolIntensity: "busy",
    typingGuardEnabled: false
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

  const patrol = applyPetCommand(autostart, {
    type: "set-patrol-settings",
    patrol: {
      enabled: false,
      surfacePreference: "screen-edge",
      intensity: "busy"
    }
  });
  assert.equal(patrol.preferences.patrolEnabled, false);
  assert.equal(patrol.preferences.patrolSurfacePreference, "screen-edge");
  assert.equal(patrol.preferences.patrolIntensity, "busy");

  const typingGuard = applyPetCommand(patrol, {
    type: "set-typing-guard",
    enabled: false
  });
  assert.equal(typingGuard.preferences.typingGuardEnabled, false);
});

test("settings command ids map to typed pet commands", () => {
  const commands: Array<[string, PetCommand]> = [
    ["open-settings", { type: "open-settings" }],
    ["launch-at-login-on", { type: "set-launch-at-login", launchAtLogin: true }],
    ["launch-at-login-off", { type: "set-launch-at-login", launchAtLogin: false }],
    ["typing-guard-on", { type: "set-typing-guard", enabled: true }],
    ["typing-guard-off", { type: "set-typing-guard", enabled: false }],
    ["patrol-on", { type: "set-patrol-settings", patrol: { enabled: true } }],
    ["patrol-off", { type: "set-patrol-settings", patrol: { enabled: false } }],
    [
      "patrol-surface-screen-edge",
      {
        type: "set-patrol-settings",
        patrol: { surfacePreference: "screen-edge" }
      }
    ]
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
  assert.match(rust, /patrol-on/);
  assert.match(rust, /typing-guard-on/);
  assert.match(rust, /tauri_plugin_autostart/);
});

test("settings UI exposes the typing guard toggle", async () => {
  const source = await readFile("src/ui/SettingsApp.tsx", "utf8");

  assert.match(source, /preferences\.typingGuardEnabled/);
  assert.match(source, /set-typing-guard/);
  assert.match(source, /Typing guard/);
});

test("stored legacy default scale migrates to the compact default once", async () => {
  const source = await readFile("src/ui/petWindow.ts", "utf8");

  assert.match(source, /PREFERENCE_SCHEMA_VERSION = 2/);
  assert.match(source, /LEGACY_DEFAULT_SCALE = 2/);
  assert.match(source, /preferenceVersion/);
  assert.match(source, /storedScale === LEGACY_DEFAULT_SCALE/);
  assert.match(source, /scale: DEFAULT_PREFERENCES\.scale/);
});
