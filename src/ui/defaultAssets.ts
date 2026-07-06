import {
  DEFAULT_CAT_ATLAS_PATH,
  DEFAULT_SOUND_CUES,
  validateSpriteAtlas,
  type SpriteAtlas
} from "../core/spriteAtlas";
import type { PetBehavior } from "../core/types";
import type { SpriteRuntimeAssets } from "../core/renderer";

const REQUIRED_ANIMATIONS: PetBehavior[] = [
  "idle",
  "walk",
  "sleep",
  "wake",
  "look",
  "meow",
  "scratch",
  "groom",
  "pounce",
  "perch"
];

export async function loadDefaultSpriteAssets(): Promise<SpriteRuntimeAssets> {
  const atlas = (await fetchJson(DEFAULT_CAT_ATLAS_PATH)) as SpriteAtlas;
  const errors = validateSpriteAtlas(atlas, REQUIRED_ANIMATIONS);

  if (errors.length > 0) {
    throw new Error(`Invalid PawPal sprite atlas: ${errors.join(", ")}`);
  }

  return {
    atlas,
    image: await loadImage(atlas.image)
  };
}

export function createSoundPlayer() {
  const sounds = new Map<string, HTMLAudioElement>(
    DEFAULT_SOUND_CUES.map((cue) => [cue.id, new Audio(cue.path)])
  );

  return {
    play(cue: string, muted: boolean) {
      if (muted) return;
      const sound = sounds.get(cue);
      if (!sound) return;

      sound.currentTime = 0;
      void sound.play().catch(() => undefined);
    }
  };
}

async function fetchJson(path: string): Promise<unknown> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load ${path}`);
  return response.json();
}

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load ${path}`));
    image.src = path;
  });
}
