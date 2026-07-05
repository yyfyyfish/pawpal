import { useEffect, useMemo, useRef } from "react";
import { createInitialPetState, tickPet } from "../core/behavior";
import { DEFAULT_PREFERENCES } from "../core/preferences";
import { createSpriteRenderer } from "../core/renderer";
import type { PetState } from "../core/types";

const CANVAS_SIZE = 192;

export function PetApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const petState = useRef<PetState>(createInitialPetState());
  const preferences = useMemo(() => DEFAULT_PREFERENCES, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createSpriteRenderer(canvas);
    let previousTime = performance.now();
    let frameId = 0;

    const frame = (time: number) => {
      const deltaMs = time - previousTime;
      previousTime = time;

      petState.current = tickPet(petState.current, {
        deltaMs,
        preferences,
        cursor: null,
        screen: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });

      renderer.draw(petState.current);
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [preferences]);

  return (
    <main className="pet-stage" aria-label="PawPal desktop pet">
      <canvas
        ref={canvasRef}
        className="pet-canvas"
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
      />
    </main>
  );
}
