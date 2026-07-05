import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DEFAULT_PREFERENCES } from "../src/core/preferences";
import {
  DEFAULT_WINDOW_POSITION,
  MAX_SCALE,
  MIN_SCALE,
  applyPetCommand,
  applyPetMove,
  isPetCommand,
  type PetCommand
} from "../src/core/interaction";

test("pet commands update interaction preferences predictably", () => {
  const paused = applyPetCommand(
    { preferences: DEFAULT_PREFERENCES, position: DEFAULT_WINDOW_POSITION },
    { type: "toggle-pause" }
  );

  assert.equal(paused.preferences.paused, true);

  const playful = applyPetCommand(paused, { type: "set-energy", energy: "playful" });
  assert.equal(playful.preferences.energy, "playful");

  const muted = applyPetCommand(playful, { type: "toggle-mute" });
  assert.equal(muted.preferences.muted, true);

  const clickThrough = applyPetCommand(muted, { type: "toggle-click-through" });
  assert.equal(clickThrough.preferences.clickThrough, true);
});

test("size commands clamp scale", () => {
  const base = {
    preferences: { ...DEFAULT_PREFERENCES, scale: MAX_SCALE },
    position: DEFAULT_WINDOW_POSITION
  };

  const larger = applyPetCommand(base, { type: "size-larger" });
  assert.equal(larger.preferences.scale, MAX_SCALE);

  const smaller = applyPetCommand(
    { preferences: { ...DEFAULT_PREFERENCES, scale: MIN_SCALE }, position: DEFAULT_WINDOW_POSITION },
    { type: "size-smaller" }
  );
  assert.equal(smaller.preferences.scale, MIN_SCALE);
});

test("pet canvas size follows the active scale preference", async () => {
  const source = await readFile("src/ui/PetApp.tsx", "utf8");

  assert.match(source, /interaction\.preferences\.scale/);
  assert.match(source, /width=\{canvasSize\}/);
  assert.match(source, /height=\{canvasSize\}/);
  assert.match(source, /width: `\$\{canvasSize\}px`/);
  assert.match(source, /height: `\$\{canvasSize\}px`/);
});

test("patrol runtime uses scaled pet size and timed rest chances", async () => {
  const source = await readFile("src/ui/PetApp.tsx", "utf8");

  assert.match(source, /const REST_DECISION_MS = 3_000/);
  assert.match(source, /restDecisionElapsedMs \+= deltaMs/);
  assert.match(source, /petSize: canvasSize/);
  assert.match(source, /restDecisionElapsedMs >= REST_DECISION_MS \? Math\.random\(\) : undefined/);
});

test("patrol runtime keeps front-window surfaces through brief detection gaps", async () => {
  const source = await readFile("src/ui/PetApp.tsx", "utf8");

  assert.match(source, /frontWindowMissingMs = frontWindow \? 0 : frontWindowMissingMs \+ SURFACE_REFRESH_MS/);
  assert.match(source, /currentSurface: activeSurface/);
  assert.match(source, /frontWindowMissingMs/);
});

test("patrol runtime roams the screen and treats apps as rest surfaces", async () => {
  const source = await readFile("src/ui/PetApp.tsx", "utf8");

  assert.match(source, /loadScreenPatrolSurfaces/);
  assert.match(source, /activeRestSurface/);
  assert.match(source, /restSurface: activeRestSurface/);
  assert.match(source, /createRandomRoamTarget/);
});

test("reset position command restores default window placement", () => {
  const reset = applyPetCommand(
    { preferences: DEFAULT_PREFERENCES, position: { x: 999, y: 111 } },
    { type: "reset-position" }
  );

  assert.deepEqual(reset.position, DEFAULT_WINDOW_POSITION);
});

test("patrol movement does not overwrite stored drag position", () => {
  const state = {
    preferences: { ...DEFAULT_PREFERENCES, patrolEnabled: true },
    position: { x: 400, y: 120 }
  };

  assert.deepEqual(applyPetMove(state, { x: 800, y: 240 }), state);
  assert.deepEqual(
    applyPetMove(state, { x: 820, y: 260 }, "drag").position,
    { x: 820, y: 260 }
  );
  assert.equal(applyPetMove(state, state.position, "drag"), state);
  assert.deepEqual(
    applyPetMove(
      { ...state, preferences: { ...state.preferences, patrolEnabled: false } },
      { x: 800, y: 240 }
    ).position,
    { x: 800, y: 240 }
  );
});

test("pet app treats user dragging as a new patrol anchor", async () => {
  const source = await readFile("src/ui/PetApp.tsx", "utf8");

  assert.match(source, /manualDragAnchor/);
  assert.match(source, /pendingManualDragAnchor/);
  assert.match(source, /commitManualDragAnchor/);
  assert.match(source, /createAnchoredPatrolState/);
  assert.match(source, /applyPetMove\(current, anchor, "drag"\)/);
  assert.match(source, /dragAnchorVersion/);
  assert.match(source, /!manualDragging\.current/);
  assert.match(source, /dragInteractionUntil/);
  assert.match(source, /isProgrammaticMoveEcho/);
  assert.match(source, /ignorePettingUntil/);
  assert.doesNotMatch(source, /setInteraction\(\(current\) => applyPetMove\(current, position, "drag"\)\)/);
});

test("native tray exposes every Phase 2 menu command", async () => {
  const source = await readFile("src-tauri/src/lib.rs", "utf8");
  const commands: PetCommand[] = [
    { type: "toggle-pause" },
    { type: "toggle-mute" },
    { type: "toggle-click-through" },
    { type: "set-energy", energy: "calm" },
    { type: "set-energy", energy: "normal" },
    { type: "set-energy", energy: "playful" },
    { type: "size-smaller" },
    { type: "size-larger" },
    { type: "reset-position" },
    { type: "quit" }
  ];

  for (const command of commands) {
    assert.equal(isPetCommand(command), true);
    assert.match(source, new RegExp(commandToMenuId(command)));
  }

  assert.match(source, /TrayIconBuilder/);
  assert.match(source, /pawpal:\/\/command/);
});

function commandToMenuId(command: PetCommand): string {
  if (command.type === "set-energy") return `energy-${command.energy}`;
  return command.type;
}
