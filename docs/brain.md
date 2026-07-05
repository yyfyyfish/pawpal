# Brain Boundary

PawPal V1 ships with a small local rule-based brain, not a general agent runtime.
The purpose of this layer is to make a future DeepAgent integration possible
without giving an agent direct desktop control.

## Contract

The app talks to a `BrainProvider`. A provider receives local, coarse context and
returns a `CatIntent`.

Allowed intent types:

- `animate`
- `say`
- `set_energy`
- `do_nothing`

The brain layer must not import native OS APIs, Tauri APIs, shell execution,
filesystem access, or network clients. Future DeepAgent work should run behind a
local adapter and map its output into this intent language.

## V1 Provider

The V1 provider is rule-based. It can suggest sleep after long idle periods,
calm energy late at night, and rare playful actions. It does not read user
content and does not call remote services.
