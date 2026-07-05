import type { PetBehavior } from "./types";

export const DEFAULT_CAT_ATLAS_PATH = "/assets/sprites/cat/cat.json";

export const DEFAULT_SOUND_CUES = [
  { id: "meow-soft", path: "/assets/sounds/meow-soft.wav" },
  { id: "purr-short", path: "/assets/sounds/purr-short.wav" },
  { id: "scratch-soft", path: "/assets/sounds/scratch-soft.wav" }
] as const;

export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteAnimation {
  frames: string[];
  frameMs: number;
  loop: boolean;
  soundCue?: string;
}

export interface SpriteAtlas {
  image: string;
  cellWidth: number;
  cellHeight: number;
  frames: Record<string, SpriteFrame>;
  animations: Record<PetBehavior, SpriteAnimation>;
}

export function validateSpriteAtlas(
  atlas: Partial<SpriteAtlas>,
  requiredAnimations: PetBehavior[]
): string[] {
  const errors: string[] = [];

  for (const animation of requiredAnimations) {
    const defaultFrame = `${animation}-0`;
    if (!atlas.frames?.[defaultFrame]) {
      errors.push(`missing frame ${defaultFrame}`);
    }

    const definition = atlas.animations?.[animation];
    if (!definition) {
      errors.push(`missing animation ${animation}`);
      continue;
    }

    for (const frame of definition.frames) {
      if (!atlas.frames?.[frame]) {
        errors.push(`missing frame ${frame}`);
      }
    }
  }

  return errors;
}

export function resolveAnimationFrames(
  atlas: SpriteAtlas,
  animation: PetBehavior
): SpriteFrame[] {
  return atlas.animations[animation].frames.map((frame) => atlas.frames[frame]);
}
