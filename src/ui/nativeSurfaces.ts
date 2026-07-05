import { invoke } from "@tauri-apps/api/core";
import {
  createWindowTopSurface,
  isPatrolSurface,
  type PatrolSurface,
  type Rect
} from "../core/patrolSurface";

export interface NativeWindowBounds extends Rect {
  appName?: string | null;
}

export type NativeTypingBoundsSource = "caret" | "focused-element";

export interface NativeTypingBounds extends Rect {
  source: NativeTypingBoundsSource;
  appName?: string | null;
  role?: string | null;
}

export async function loadFrontWindowSurface(): Promise<PatrolSurface | null> {
  try {
    const bounds = await invoke<NativeWindowBounds | null>("frontmost_window_bounds");
    return nativeWindowBoundsToSurface(bounds);
  } catch {
    return null;
  }
}

export async function loadFocusedTypingBounds(): Promise<NativeTypingBounds | null> {
  try {
    const bounds = await invoke<NativeTypingBounds | null>("focused_typing_bounds");
    return nativeTypingBoundsOrNull(bounds);
  } catch {
    return null;
  }
}

export function nativeWindowBoundsToSurface(
  bounds: NativeWindowBounds | null | undefined
): PatrolSurface | null {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

  const appName = sanitizeSurfaceId(bounds.appName ?? "unknown");
  const surface = createWindowTopSurface(`front-window:${appName}`, bounds);

  return isPatrolSurface(surface) ? surface : null;
}

export function nativeTypingBoundsOrNull(
  bounds: Partial<NativeTypingBounds> | null | undefined
): NativeTypingBounds | null {
  if (
    !bounds ||
    typeof bounds.x !== "number" ||
    typeof bounds.y !== "number" ||
    typeof bounds.width !== "number" ||
    typeof bounds.height !== "number" ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    return null;
  }

  if (bounds.source !== "caret" && bounds.source !== "focused-element") {
    return null;
  }

  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    source: bounds.source,
    role: bounds.role ?? null,
    appName: bounds.appName ?? null
  };
}

function sanitizeSurfaceId(value: string): string {
  const safe = value.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
  return safe || "unknown";
}
