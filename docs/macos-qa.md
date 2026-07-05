# macOS Reliability QA

Use this checklist before a V1 release candidate.

## Long-run idle

- Run PawPal for at least 60 minutes in calm mode.
- Confirm CPU remains low while the cat is idle or sleeping.
- Confirm memory does not grow continuously.

## Multi-monitor

- Start PawPal with one monitor attached.
- Attach a second monitor and move the cat near both displays.
- Disconnect the second monitor and confirm the cat recovers into a visible safe area.

## Dock and menu bar

- Test with the Dock at the bottom, left, and right.
- Confirm reset position keeps the cat away from the menu bar and likely Dock area.

## Laptop sleep and wake

- Put the Mac laptop to sleep while PawPal is running.
- Wake it and confirm the tray menu, settings window, and pet window still respond.

## Full-screen Spaces

- Open a full-screen app.
- Confirm PawPal's visible-on-all-workspaces behavior is acceptable and quit remains available.

## Typing Guard privacy

- Type in Terminal, a browser text field, and a document editor.
- Confirm the cat wakes or moves away from the focused editable geometry.
- Confirm the Typing guard setting can disable and re-enable this behavior.
- Confirm PawPal does not read typed text and only uses focused editable geometry.

## No network traffic

- Confirm V1 runs without account login, telemetry, cloud sync, or remote asset fetches.
- Runtime source should only load local app assets.
