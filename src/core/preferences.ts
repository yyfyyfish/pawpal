import type { PetPreferences } from "./types";
import { MAX_SCALE, MIN_SCALE } from "./interaction";

export const DEFAULT_PREFERENCES: PetPreferences = {
  muted: false,
  paused: false,
  scale: 2,
  energy: "normal",
  clickThrough: false,
  launchAtLogin: false,
  patrolEnabled: true,
  patrolSurfacePreference: "front-window",
  patrolIntensity: "normal"
};

export function normalizePreferences(value: unknown): PetPreferences {
  if (!value || typeof value !== "object") return DEFAULT_PREFERENCES;

  const preferences = value as Partial<PetPreferences>;

  return {
    muted: booleanOrDefault(preferences.muted, DEFAULT_PREFERENCES.muted),
    paused: booleanOrDefault(preferences.paused, DEFAULT_PREFERENCES.paused),
    scale: normalizeScale(preferences.scale),
    energy: normalizeEnergy(preferences.energy),
    clickThrough: booleanOrDefault(
      preferences.clickThrough,
      DEFAULT_PREFERENCES.clickThrough
    ),
    launchAtLogin: booleanOrDefault(
      preferences.launchAtLogin,
      DEFAULT_PREFERENCES.launchAtLogin
    ),
    patrolEnabled: booleanOrDefault(
      preferences.patrolEnabled,
      DEFAULT_PREFERENCES.patrolEnabled
    ),
    patrolSurfacePreference: normalizePatrolSurfacePreference(
      preferences.patrolSurfacePreference
    ),
    patrolIntensity: normalizePatrolIntensity(preferences.patrolIntensity)
  };
}

export function toStoredPreferences(preferences: PetPreferences): PetPreferences {
  return normalizePreferences(preferences);
}

function normalizeScale(scale: unknown): number {
  if (typeof scale !== "number" || Number.isNaN(scale)) {
    return DEFAULT_PREFERENCES.scale;
  }

  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function normalizeEnergy(energy: unknown): PetPreferences["energy"] {
  if (energy === "calm" || energy === "normal" || energy === "playful") {
    return energy;
  }

  return DEFAULT_PREFERENCES.energy;
}

function normalizePatrolSurfacePreference(
  preference: unknown
): PetPreferences["patrolSurfacePreference"] {
  if (preference === "front-window" || preference === "screen-edge") {
    return preference;
  }

  return DEFAULT_PREFERENCES.patrolSurfacePreference;
}

function normalizePatrolIntensity(intensity: unknown): PetPreferences["patrolIntensity"] {
  if (intensity === "lazy" || intensity === "normal" || intensity === "busy") {
    return intensity;
  }

  return DEFAULT_PREFERENCES.patrolIntensity;
}

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}
