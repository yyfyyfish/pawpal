import type {
  EnergyLevel,
  PatrolIntensity,
  PatrolSurfacePreference,
  PetPreferences,
  Point
} from "./types";

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const SCALE_STEP = 0.25;

export const DEFAULT_WINDOW_POSITION: Point = {
  x: 32,
  y: 32
};

export type PetCommand =
  | { type: "toggle-pause" }
  | { type: "toggle-mute" }
  | { type: "toggle-click-through" }
  | { type: "set-energy"; energy: EnergyLevel }
  | { type: "set-scale"; scale: number }
  | { type: "set-launch-at-login"; launchAtLogin: boolean }
  | {
      type: "set-patrol-settings";
      patrol: {
        enabled?: boolean;
        surfacePreference?: PatrolSurfacePreference;
        intensity?: PatrolIntensity;
      };
    }
  | { type: "size-smaller" }
  | { type: "size-larger" }
  | { type: "open-settings" }
  | { type: "reset-position" }
  | { type: "quit" };

export interface InteractionState {
  preferences: PetPreferences;
  position: Point;
}

export function applyPetCommand(state: InteractionState, command: PetCommand): InteractionState {
  switch (command.type) {
    case "toggle-pause":
      return withPreferences(state, { paused: !state.preferences.paused });
    case "toggle-mute":
      return withPreferences(state, { muted: !state.preferences.muted });
    case "toggle-click-through":
      return withPreferences(state, { clickThrough: !state.preferences.clickThrough });
    case "set-energy":
      return withPreferences(state, { energy: command.energy });
    case "set-scale":
      return withPreferences(state, { scale: clampScale(command.scale) });
    case "set-launch-at-login":
      return withPreferences(state, { launchAtLogin: command.launchAtLogin });
    case "set-patrol-settings":
      return withPreferences(state, {
        patrolEnabled: command.patrol.enabled ?? state.preferences.patrolEnabled,
        patrolSurfacePreference:
          command.patrol.surfacePreference ?? state.preferences.patrolSurfacePreference,
        patrolIntensity: command.patrol.intensity ?? state.preferences.patrolIntensity
      });
    case "size-smaller":
      return withPreferences(state, {
        scale: clampScale(state.preferences.scale - SCALE_STEP)
      });
    case "size-larger":
      return withPreferences(state, {
        scale: clampScale(state.preferences.scale + SCALE_STEP)
      });
    case "reset-position":
      return { ...state, position: DEFAULT_WINDOW_POSITION };
    case "open-settings":
    case "quit":
      return state;
  }
}

export function isPetCommand(value: unknown): value is PetCommand {
  if (!value || typeof value !== "object" || !("type" in value)) return false;

  const command = value as Partial<PetCommand>;

  switch (command.type) {
    case "toggle-pause":
    case "toggle-mute":
    case "toggle-click-through":
    case "size-smaller":
    case "size-larger":
    case "open-settings":
    case "reset-position":
    case "quit":
      return true;
    case "set-energy":
      return ["calm", "normal", "playful"].includes((command as { energy?: string }).energy ?? "");
    case "set-scale":
      return typeof (command as { scale?: unknown }).scale === "number";
    case "set-launch-at-login":
      return typeof (command as { launchAtLogin?: unknown }).launchAtLogin === "boolean";
    case "set-patrol-settings":
      return isPatrolSettings((command as { patrol?: unknown }).patrol);
    default:
      return false;
  }
}

export function menuIdToCommand(id: string): PetCommand | null {
  switch (id) {
    case "toggle-pause":
    case "toggle-mute":
    case "toggle-click-through":
    case "size-smaller":
    case "size-larger":
    case "reset-position":
    case "quit":
    case "open-settings":
      return { type: id };
    case "launch-at-login-on":
      return { type: "set-launch-at-login", launchAtLogin: true };
    case "launch-at-login-off":
      return { type: "set-launch-at-login", launchAtLogin: false };
    case "patrol-on":
      return { type: "set-patrol-settings", patrol: { enabled: true } };
    case "patrol-off":
      return { type: "set-patrol-settings", patrol: { enabled: false } };
    case "patrol-surface-front-window":
      return {
        type: "set-patrol-settings",
        patrol: { surfacePreference: "front-window" }
      };
    case "patrol-surface-screen-edge":
      return {
        type: "set-patrol-settings",
        patrol: { surfacePreference: "screen-edge" }
      };
    case "patrol-intensity-lazy":
      return { type: "set-patrol-settings", patrol: { intensity: "lazy" } };
    case "patrol-intensity-normal":
      return { type: "set-patrol-settings", patrol: { intensity: "normal" } };
    case "patrol-intensity-busy":
      return { type: "set-patrol-settings", patrol: { intensity: "busy" } };
    case "energy-calm":
      return { type: "set-energy", energy: "calm" };
    case "energy-normal":
      return { type: "set-energy", energy: "normal" };
    case "energy-playful":
      return { type: "set-energy", energy: "playful" };
    default:
      return null;
  }
}

function withPreferences(
  state: InteractionState,
  preferences: Partial<PetPreferences>
): InteractionState {
  return {
    ...state,
    preferences: {
      ...state.preferences,
      ...preferences
    }
  };
}

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function isPatrolSettings(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const settings = value as {
    enabled?: unknown;
    surfacePreference?: unknown;
    intensity?: unknown;
  };

  return (
    (settings.enabled === undefined || typeof settings.enabled === "boolean") &&
    (settings.surfacePreference === undefined ||
      settings.surfacePreference === "front-window" ||
      settings.surfacePreference === "screen-edge") &&
    (settings.intensity === undefined ||
      settings.intensity === "lazy" ||
      settings.intensity === "normal" ||
      settings.intensity === "busy")
  );
}
