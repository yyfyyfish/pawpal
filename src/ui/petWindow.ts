import {
  LogicalPosition,
  LogicalSize,
  availableMonitors,
  getCurrentWindow
} from "@tauri-apps/api/window";
import { emitTo } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  toStoredPreferences
} from "../core/preferences";
import {
  DEFAULT_WINDOW_POSITION,
  applyPetCommand,
  isPetCommand,
  menuIdToCommand,
  type InteractionState,
  type PetCommand
} from "../core/interaction";
import { chooseNearestMonitor, clampToSafeArea, getSafeArea } from "../core/screen";
import {
  createScreenEdgeSurfaces,
  createScreenRoamSurface,
  type PatrolSurface
} from "../core/patrolSurface";
import {
  normalizeCompanionMemory,
  toStoredCompanionMemory,
  type CompanionMemory
} from "../core/memory";
import type { Point } from "../core/types";

const STORE_PATH = "pawpal.json";
const COMMAND_EVENT = "pawpal://command";
const BASE_WINDOW_SIZE = 96;
const PREFERENCE_SCHEMA_VERSION = 2;
const LEGACY_DEFAULT_SCALE = 2;

export async function loadInteractionState(): Promise<InteractionState> {
  const store = await load(STORE_PATH, { autoSave: true, defaults: {} });
  const storedPreferences = await store.get("preferences");
  const preferenceVersion = await store.get("preferenceVersion");
  const preferences = normalizePreferences(
    migratePreferences(storedPreferences, preferenceVersion)
  );
  const position = normalizePosition(await store.get("position"));

  return { preferences, position };
}

export async function saveInteractionState(state: InteractionState): Promise<void> {
  const store = await load(STORE_PATH, { autoSave: true, defaults: {} });
  await store.set("preferences", toStoredPreferences(state.preferences));
  await store.set("preferenceVersion", PREFERENCE_SCHEMA_VERSION);
  await store.set("position", state.position);
  await store.save();
}

export async function loadCompanionMemory(): Promise<CompanionMemory> {
  const store = await load(STORE_PATH, { autoSave: true, defaults: {} });
  return normalizeCompanionMemory(await store.get("companionMemory"));
}

export async function saveCompanionMemory(memory: CompanionMemory): Promise<void> {
  const store = await load(STORE_PATH, { autoSave: true, defaults: {} });
  await store.set("companionMemory", toStoredCompanionMemory(memory));
  await store.save();
}

export async function applyWindowState(state: InteractionState): Promise<void> {
  const window = getCurrentWindow();
  const size = BASE_WINDOW_SIZE * state.preferences.scale;
  const position = await getClampedWindowPosition(state.position, {
    width: size,
    height: size
  });

  await window.setIgnoreCursorEvents(state.preferences.clickThrough);
  await window.setSize(new LogicalSize(size, size));
  await window.setPosition(new LogicalPosition(position.x, position.y));
}

export async function applyLaunchAtLogin(enabled: boolean): Promise<void> {
  const current = await isEnabled();
  if (enabled && !current) {
    await enable();
  }
  if (!enabled && current) {
    await disable();
  }
}

export async function startPetDrag(): Promise<void> {
  await getCurrentWindow().startDragging();
}

export async function listenForPetCommands(
  onCommand: (command: PetCommand) => void
): Promise<() => void> {
  const window = getCurrentWindow();

  return window.listen<string | PetCommand>(COMMAND_EVENT, (event) => {
    const command =
      typeof event.payload === "string" ? menuIdToCommand(event.payload) : event.payload;

    if (isPetCommand(command)) {
      onCommand(command);
    }
  });
}

export async function sendPetCommandToPet(command: PetCommand): Promise<void> {
  await emitTo("pet", COMMAND_EVENT, command);
}

export async function listenForPetMoves(
  onMove: (position: Point) => void
): Promise<() => void> {
  const window = getCurrentWindow();

  return window.onMoved(async (event) => {
    const scaleFactor = await window.scaleFactor();
    const logicalPosition = event.payload.toLogical(scaleFactor);

    onMove({
      x: logicalPosition.x,
      y: logicalPosition.y
    });
  });
}

export async function loadScreenEdgePatrolSurfaces(
  position: Point
): Promise<PatrolSurface[]> {
  const monitors = await availableMonitors();
  const normalizedMonitors = monitors.map((candidate) => {
    const logicalPosition = candidate.position.toLogical(candidate.scaleFactor);
    const logicalSize = candidate.size.toLogical(candidate.scaleFactor);

    return {
      x: logicalPosition.x,
      y: logicalPosition.y,
      width: logicalSize.width,
      height: logicalSize.height,
      scaleFactor: candidate.scaleFactor
    };
  });
  const monitor = chooseNearestMonitor(position, normalizedMonitors);

  return monitor ? createScreenEdgeSurfaces(getSafeArea(monitor)) : [];
}

export async function loadScreenPatrolSurfaces(position: Point): Promise<PatrolSurface[]> {
  const monitors = await availableMonitors();
  const normalizedMonitors = monitors.map((candidate) => {
    const logicalPosition = candidate.position.toLogical(candidate.scaleFactor);
    const logicalSize = candidate.size.toLogical(candidate.scaleFactor);

    return {
      x: logicalPosition.x,
      y: logicalPosition.y,
      width: logicalSize.width,
      height: logicalSize.height,
      scaleFactor: candidate.scaleFactor
    };
  });
  const monitor = chooseNearestMonitor(position, normalizedMonitors);

  if (!monitor) return [];

  const safeArea = getSafeArea(monitor);
  return [createScreenRoamSurface(safeArea), ...createScreenEdgeSurfaces(safeArea)];
}

export function reduceInteractionState(
  state: InteractionState,
  command: PetCommand
): InteractionState {
  return applyPetCommand(state, command);
}

function normalizePosition(value: unknown): Point {
  if (!value || typeof value !== "object") return DEFAULT_WINDOW_POSITION;

  const position = value as Partial<Point>;
  if (typeof position.x !== "number" || typeof position.y !== "number") {
    return DEFAULT_WINDOW_POSITION;
  }

  return {
    x: position.x,
    y: position.y
  };
}

function migratePreferences(value: unknown, version: unknown): unknown {
  if (version === PREFERENCE_SCHEMA_VERSION || !value || typeof value !== "object") {
    return value;
  }

  const preferences = value as Partial<typeof DEFAULT_PREFERENCES>;
  const storedScale = preferences.scale;
  if (storedScale === LEGACY_DEFAULT_SCALE) {
    return {
      ...preferences,
      scale: DEFAULT_PREFERENCES.scale
    };
  }

  return value;
}

async function getClampedWindowPosition(
  position: Point,
  windowSize: { width: number; height: number }
): Promise<Point> {
  const monitors = await availableMonitors();
  const monitor = chooseNearestMonitor(
    position,
    monitors.map((candidate) => {
      const logicalPosition = candidate.position.toLogical(candidate.scaleFactor);
      const logicalSize = candidate.size.toLogical(candidate.scaleFactor);

      return {
        x: logicalPosition.x,
        y: logicalPosition.y,
        width: logicalSize.width,
        height: logicalSize.height,
        scaleFactor: candidate.scaleFactor
      };
    })
  );

  if (!monitor) return position;

  return clampToSafeArea(position, getSafeArea(monitor), windowSize);
}
