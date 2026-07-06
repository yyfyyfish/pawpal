import type { PetState } from "./types";
import { resolveAnimationFrames, type SpriteAtlas } from "./spriteAtlas";

export interface SpriteRuntimeAssets {
  atlas: SpriteAtlas;
  image: CanvasImageSource;
}

export function createSpriteRenderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas 2D context is unavailable.");
  }

  let assets: SpriteRuntimeAssets | null = null;
  context.imageSmoothingEnabled = true;

  return {
    setSpriteAssets(nextAssets: SpriteRuntimeAssets) {
      assets = nextAssets;
    },
    draw(state: PetState) {
      context.clearRect(0, 0, canvas.width, canvas.height);

      if (!assets) {
        return;
      }

      drawSprite(context, canvas, state, assets);
    }
  };
}

function drawSprite(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  state: PetState,
  assets: SpriteRuntimeAssets
) {
  const animation = assets.atlas.animations[state.behavior];
  const frames = resolveAnimationFrames(assets.atlas, state.behavior);
  const frameIndex = animation.loop
    ? Math.floor(state.elapsedInStateMs / animation.frameMs) % frames.length
    : Math.min(frames.length - 1, Math.floor(state.elapsedInStateMs / animation.frameMs));
  const frame = frames[frameIndex];
  const scale = Math.min(canvas.width / frame.width, canvas.height / frame.height);
  const width = frame.width * scale;
  const height = frame.height * scale;

  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  if (state.facing === "left") context.scale(-1, 1);
  context.drawImage(
    assets.image,
    frame.x,
    frame.y,
    frame.width,
    frame.height,
    -width / 2,
    -height / 2,
    width,
    height
  );
  context.restore();
}
