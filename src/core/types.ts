export type PetBehavior =
  | "idle"
  | "walk"
  | "sleep"
  | "wake"
  | "look"
  | "meow"
  | "scratch"
  | "groom"
  | "pounce"
  | "perch";

export type EnergyLevel = "calm" | "normal" | "playful";
export type PatrolSurfacePreference = "front-window" | "screen-edge";
export type PatrolIntensity = "lazy" | "normal" | "busy";

export interface Point {
  x: number;
  y: number;
}

export interface ScreenBounds {
  width: number;
  height: number;
}

export interface PetPreferences {
  muted: boolean;
  paused: boolean;
  scale: number;
  energy: EnergyLevel;
  clickThrough: boolean;
  launchAtLogin: boolean;
  patrolEnabled: boolean;
  patrolSurfacePreference: PatrolSurfacePreference;
  patrolIntensity: PatrolIntensity;
  typingGuardEnabled: boolean;
}

export interface PetState {
  behavior: PetBehavior;
  position: Point;
  target: Point | null;
  facing: "left" | "right";
  elapsedInStateMs: number;
  nextDecisionMs: number;
}

export interface PetTickInput {
  deltaMs: number;
  preferences: PetPreferences;
  cursor: Point | null;
  screen: ScreenBounds;
  random?: RandomSource;
}

export interface AnimationDefinition {
  id: PetBehavior;
  frameMs: number;
  loop: boolean;
  soundCue?: string;
}

export type RandomSource = () => number;
