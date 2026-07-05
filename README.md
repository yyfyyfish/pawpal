# PawPal

PawPal is a cozy macOS desktop cat that stays above your work, wanders around
quietly, reacts to your cursor, and knows when to nap.

This repo is scaffolded as a Tauri desktop app with a TypeScript frontend and a
Rust shell. The current focus is the v0.1 MVP: a transparent always-on-top pet
window, a small behavior engine, sprite-based animation, and macOS-friendly
controls.

## Project Shape

- `docs/product-spec.md`: detailed product requirements and user experience
- `docs/technical-spec.md`: desktop, rendering, state, and packaging design
- `docs/roadmap.md`: phased delivery plan
- `src/`: TypeScript pet runtime and canvas UI
- `src-tauri/`: Tauri desktop shell and macOS window behavior
- `src/assets/`: sprite and sound placeholders

## Development

Prerequisites:

- Node.js 20+
- Rust stable
- Tauri system dependencies for macOS

Install and run:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run tauri:build
```

## MVP

The first playable build should:

- Show a transparent, frameless cat window
- Keep the cat above normal app windows
- Let clicks pass through except when interacting with the cat
- Animate idle, walk, sleep, wake, look, meow, scratch, and groom states
- Provide menu/tray controls for pause, mute, size, energy, and quit
- Store preferences locally
