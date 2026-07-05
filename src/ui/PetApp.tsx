import { useEffect, useRef, useState } from "react";
import { createInitialPetState, tickPet } from "../core/behavior";
import { DEFAULT_PREFERENCES } from "../core/preferences";
import { createSpriteRenderer } from "../core/renderer";
import type { PetState } from "../core/types";
import { DEFAULT_WINDOW_POSITION, type InteractionState } from "../core/interaction";
import {
  applyWindowState,
  listenForPetCommands,
  listenForPetMoves,
  loadInteractionState,
  reduceInteractionState,
  saveInteractionState,
  startPetDrag
} from "./petWindow";
import { createSoundPlayer, loadDefaultSpriteAssets } from "./defaultAssets";
import { ANIMATIONS } from "../core/animations";

const CANVAS_SIZE = 192;

export function PetApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const petState = useRef<PetState>(createInitialPetState());
  const [interaction, setInteraction] = useState<InteractionState>({
    preferences: DEFAULT_PREFERENCES,
    position: DEFAULT_WINDOW_POSITION
  });

  useEffect(() => {
    let disposed = false;

    loadInteractionState()
      .then((state) => {
        if (!disposed) setInteraction(state);
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    void applyWindowState(interaction).catch(() => undefined);
    void saveInteractionState(interaction).catch(() => undefined);
  }, [interaction]);

  useEffect(() => {
    let unlistenCommands: (() => void) | undefined;
    let unlistenMoves: (() => void) | undefined;

    void listenForPetCommands((command) => {
      setInteraction((current) => reduceInteractionState(current, command));
    }).then((unlisten) => {
      unlistenCommands = unlisten;
    });

    void listenForPetMoves((position) => {
      setInteraction((current) => ({ ...current, position }));
    }).then((unlisten) => {
      unlistenMoves = unlisten;
    });

    return () => {
      unlistenCommands?.();
      unlistenMoves?.();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createSpriteRenderer(canvas);
    const soundPlayer = createSoundPlayer();
    let previousTime = performance.now();
    let frameId = 0;
    let previousCue: string | undefined;

    void loadDefaultSpriteAssets()
      .then((assets) => renderer.setSpriteAssets(assets))
      .catch(() => undefined);

    const frame = (time: number) => {
      const deltaMs = time - previousTime;
      previousTime = time;

      petState.current = tickPet(petState.current, {
        deltaMs,
        preferences: interaction.preferences,
        cursor: null,
        screen: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      });

      renderer.draw(petState.current);

      const cue = ANIMATIONS[petState.current.behavior]?.soundCue;
      if (cue && cue !== previousCue) {
        soundPlayer.play(cue, interaction.preferences.muted);
      }
      previousCue = cue;

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [interaction.preferences]);

  return (
    <main className="pet-stage" aria-label="PawPal desktop pet">
      <canvas
        ref={canvasRef}
        className="pet-canvas"
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{
          width: `${CANVAS_SIZE}px`,
          height: `${CANVAS_SIZE}px`
        }}
        onPointerDown={() => {
          if (!interaction.preferences.clickThrough) {
            void startPetDrag().catch(() => undefined);
          }
        }}
      />
    </main>
  );
}
