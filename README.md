# PawPal

PawPal is a cozy macOS desktop cat that stays above your work, wanders around
quietly, reacts to your cursor, and knows when to nap.

This repo is a Tauri desktop app with a TypeScript frontend and a Rust shell.
The current target is V1: a transparent always-on-top pet window, a small
behavior engine, sprite-based animation, local settings, macOS-friendly
controls, and a brain-ready intent boundary.

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

The macOS V1 app bundle is written to:

```text
src-tauri/target/release/bundle/macos/PawPal.app
```

## V1

The V1 build includes:

- Show a transparent, frameless cat window
- Keep the cat above normal app windows
- Let clicks pass through except when interacting with the cat
- Use Typing Guard to keep the cat away from active text input areas
- Animate idle, walk, sleep, wake, look, meow, scratch, and groom states
- Provide menu/tray controls for pause, mute, size, energy, settings, and quit
- Store preferences locally
- Keep runtime assets local
- Expose a safe `BrainProvider` contract for future DeepAgent work
