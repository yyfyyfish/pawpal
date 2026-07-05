import type { AnimationDefinition } from "./types";

export const ANIMATIONS: Record<string, AnimationDefinition> = {
  idle: { id: "idle", frameMs: 180, loop: true },
  walk: { id: "walk", frameMs: 120, loop: true },
  sleep: { id: "sleep", frameMs: 240, loop: true },
  wake: { id: "wake", frameMs: 140, loop: false },
  look: { id: "look", frameMs: 180, loop: false },
  meow: { id: "meow", frameMs: 140, loop: false, soundCue: "meow-soft" },
  scratch: { id: "scratch", frameMs: 90, loop: false },
  groom: { id: "groom", frameMs: 130, loop: false },
  pounce: { id: "pounce", frameMs: 80, loop: false }
};
