import type { EnergyLevel, PetBehavior } from "./types";

export type CatIntent =
  | { type: "animate"; behavior: PetBehavior }
  | { type: "say"; text: string; mood: "cozy" | "curious" | "sleepy" }
  | { type: "set_energy"; energy: EnergyLevel }
  | { type: "do_nothing" };

export interface BrainContext {
  behavior: PetBehavior;
  energy: EnergyLevel;
  muted: boolean;
  idleMs: number;
  localHour: number;
}

export interface BrainProvider {
  nextIntent(context: BrainContext): Promise<CatIntent>;
}

export function createRuleBasedBrain(): BrainProvider {
  return {
    async nextIntent(context) {
      if (context.idleMs >= 15 * 60 * 1000) {
        return { type: "animate", behavior: "sleep" };
      }

      if (context.localHour >= 22 || context.localHour < 6) {
        return { type: "set_energy", energy: "calm" };
      }

      if (!context.muted && context.energy === "playful" && context.behavior === "idle") {
        return { type: "animate", behavior: "meow" };
      }

      return { type: "do_nothing" };
    }
  };
}

export function isCatIntent(value: unknown): value is CatIntent {
  if (!value || typeof value !== "object" || !("type" in value)) return false;

  const intent = value as Partial<CatIntent>;

  switch (intent.type) {
    case "animate":
      return isPetBehavior((intent as { behavior?: unknown }).behavior);
    case "say":
      return (
        typeof (intent as { text?: unknown }).text === "string" &&
        ["cozy", "curious", "sleepy"].includes((intent as { mood?: string }).mood ?? "")
      );
    case "set_energy":
      return isEnergy((intent as { energy?: unknown }).energy);
    case "do_nothing":
      return true;
    default:
      return false;
  }
}

export function intentToBehavior(intent: CatIntent): PetBehavior | null {
  return intent.type === "animate" ? intent.behavior : null;
}

function isPetBehavior(value: unknown): value is PetBehavior {
  return [
    "idle",
    "walk",
    "sleep",
    "wake",
    "look",
    "meow",
    "scratch",
    "groom",
    "pounce"
  ].includes(String(value));
}

function isEnergy(value: unknown): value is EnergyLevel {
  return value === "calm" || value === "normal" || value === "playful";
}
