import type { EnergyLevel, PetPreferences, Point } from "./types";

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
  | { type: "size-smaller" }
  | { type: "size-larger" }
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
    case "reset-position":
    case "quit":
      return true;
    case "set-energy":
      return ["calm", "normal", "playful"].includes((command as { energy?: string }).energy ?? "");
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
      return { type: id };
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
