# Architecture

PawPal is split into a small native desktop shell and a frontend runtime.

```mermaid
flowchart LR
  User["User Activity"] --> Input["Input Signals"]
  Input --> Engine["Behavior Engine"]
  Prefs["Preferences"] --> Engine
  Screen["Screen Model"] --> Engine
  Engine --> Renderer["Canvas Renderer"]
  Engine --> Audio["Sound Cues"]
  Renderer --> Window["Transparent Tauri Window"]
  Tray["Menu Bar Controls"] --> Prefs
  Tray --> Engine
```

## Boundaries

- Rust owns native windows, tray/menu commands, and OS integration.
- TypeScript owns pet behavior, rendering, preferences shape, and animation.
- Assets are data, not hardcoded behavior.

## Repository Contracts

- `src/core` is framework-light logic and should be easy to test.
- `src/ui` is React and canvas integration.
- `src-tauri` should stay small until native behavior truly needs Rust.
