# PawPal V1 Phase Roadmap

The V1 implementation is split into seven commits. Each phase should be
completed with a red/green TDD loop, verified locally, and committed before the
next phase begins.

## Phase 0: Foundation

- Transparent always-on-top pet window
- Canvas sprite renderer
- Tauri, Vite, React, TypeScript scaffold
- Preflight checks
- Test/check scripts
- Baseline documentation
- Placeholder cat render loop

## Phase 1: Real Pet Loop

- Deterministic behavior state machine
- Seedable scheduler
- Idle, walk, sleep, wake, look, scratch, groom, meow
- Movement bounds
- Cursor-aware facing
- Unit tests for state transitions

## Phase 2: Window And Interaction Polish

- Click-through toggle
- Drag-to-place flow
- Persisted position
- Menu bar controls
- Pause, mute, energy, size, reset, quit
- Fullscreen/Spaces behavior decision

## Phase 3: Art And Audio

- Sprite sheet format
- Default cat sprite sheet
- Animation metadata loader
- Local sound cues
- Crisp scaling
- Asset fallback behavior

## Phase 4: Preferences And Settings

- Local preference persistence
- Energy profiles
- Size control
- Mute and click-through settings
- Launch-at-login setting if feasible
- Settings window if needed

## Phase 5: Reliability And macOS Fit

- Long-run CPU/memory check
- Multi-monitor handling
- Dock/menu bar safe areas
- Laptop sleep/wake handling
- Full-screen Spaces QA
- No network calls or unnecessary permissions

## Phase 6: Brain-Ready Architecture

- BrainProvider interface
- Typed safe intent model
- Mock/rule-based brain
- Future DeepAgent service boundary
- Guardrail that brain cannot directly control native OS APIs

## Phase 7: V1 Packaging

- Signed and notarized macOS build
- Onboarding
- Accessibility permission explanation for optional advanced behaviors
- App update path
- Documentation for skins and sounds
