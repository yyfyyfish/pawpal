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

export async function loadFrontWindowSurface(): Promise<PatrolSurface | null> {
  try {
    const bounds = await invoke<NativeWindowBounds | null>("frontmost_window_bounds");
    return nativeWindowBoundsToSurface(bounds);
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

function sanitizeSurfaceId(value: string): string {
  const safe = value.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
  return safe || "unknown";
}
