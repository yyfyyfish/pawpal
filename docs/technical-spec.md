# PawPal Technical Spec

## Stack

- Desktop shell: Tauri 2
- Native layer: Rust
- Frontend: React, TypeScript, Vite
- Rendering: HTML canvas
- Assets: sprite sheets and short local audio files
- Storage: local Tauri store plugin

Tauri is chosen because it gives us transparent windows, always-on-top control,
window positioning, local storage, and lightweight packaging without shipping a
full Chromium runtime like Electron.

## App Windows

### Pet Window

The primary window is transparent, frameless, always on top, hidden from the
taskbar/dock where possible, and sized to the pet's active bounding box plus
interaction padding.

Initial properties:

- transparent: true
- decorations: false
- alwaysOnTop: true
- resizable: false
- shadow: false
- skipTaskbar: true
- visibleOnAllWorkspaces: true
- focusable: false by default

The pet window should support click-through mode using Tauri's cursor-event
ignore API. When the user holds a modifier or picks "Move Cat", interaction can
be re-enabled temporarily.

### Control Surface

v0.1 uses a menu bar/tray entry for controls. A small settings window can be
added in v0.2 if the tray menu becomes crowded.

## Runtime Modules

### Behavior Engine

The behavior engine owns high-level pet state. It receives input signals and
emits animation intents.

Inputs:

- cursor position
- elapsed time
- coarse user activity
- screen bounds
- preferences

Outputs:

- current behavior state
- facing direction
- target position
- animation id
- sound cue

### Scheduler

The scheduler chooses the next ambient behavior using weighted randomness.
Weights are affected by:

- energy level
- recent behavior history
- user idle time
- current position
- muted/paused settings

### Renderer

The renderer draws the active sprite frame to canvas, advances animation frames,
and exposes hit testing for interaction. Rendering logic should not decide
behavior.

### Screen Model

The screen model tracks safe bounds for the active monitor. v0.1 uses the
current monitor size. Later versions can add Dock/menu bar exclusion zones and
multi-monitor migration.

## State Model

```ts
type PetBehavior =
  | "idle"
  | "walk"
  | "sleep"
  | "wake"
  | "look"
  | "meow"
  | "scratch"
  | "groom"
  | "pounce";
```

The state machine should be deterministic once given a random seed, elapsed
time, and input stream. This makes behavior tests possible.

## Preferences

Initial preferences:

- muted: boolean
- paused: boolean
- scale: number
- energy: "calm" | "normal" | "playful"
- clickThrough: boolean
- launchAtLogin: boolean

Preferences should be persisted locally and applied at startup before the first
animation loop begins.

## Asset Format

The default sprite sheet uses a simple grid. Each animation declares:

- id
- frame coordinates
- frame duration
- loop mode
- optional sound cue
- optional movement speed

Example:

```ts
{
  id: "idle",
  frames: ["idle-0", "idle-1", "idle-2"],
  frameMs: 180,
  loop: true
}
```

## macOS Notes

- Always-on-top should use normal floating window behavior first.
- Click-through must be user-controlled and easy to disable.
- Accessibility permission is not required for v0.1.
- Global keyboard monitoring is not required for v0.1.
- App notarization is out of scope until packaging hardening.

## Testing Strategy

- Unit tests for scheduler and state transitions
- Visual smoke test for nonblank canvas and transparent background
- Manual macOS QA for always-on-top, click-through, menu controls, sleep/wake
- Long-run idle test for CPU and memory usage

## Brain-Ready Boundary

V1 should not ship a DeepAgent-powered runtime, but it should leave a clean
integration point for it. The behavior engine can depend on a small
`BrainProvider` interface that returns safe typed intents, while native OS and
window APIs remain outside the brain's reach.

Initial intent shape:

```ts
type CatIntent =
  | { type: "animate"; behavior: PetBehavior }
  | { type: "say"; text: string; mood: "cozy" | "curious" | "sleepy" }
  | { type: "set_energy"; energy: EnergyLevel }
  | { type: "do_nothing" };
```

Future DeepAgent work should run behind a local adapter or service boundary and
map agent output into these intents instead of granting general desktop control.

## Open Questions

- Should the cat live on the screen floor only, or roam freely?
- Should meows be enabled by default?
- Should the pet be visible across full-screen spaces?
- Should v1 be macOS-only or keep cross-platform constraints from day one?
