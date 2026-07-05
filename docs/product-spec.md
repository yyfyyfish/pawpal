# PawPal Product Spec

## Summary

PawPal is a small desktop cat companion for macOS laptops. It appears above
normal application windows, moves around while the user works, reacts to user
activity, and balances charm with respect for focus.

The product should feel warm, tasteful, and useful as ambient companionship. It
should not feel like malware, an attention trap, or a productivity prank.

## Target User

- Mac users who spend long hours working at a laptop
- Developers, writers, students, designers, and remote workers
- People who like cozy desktop utilities and ambient companions

## Product Principles

- Calm by default: delight lives at the edge of attention.
- User control first: pause, mute, resize, and quit must be obvious.
- No surprise permissions: explain why any macOS permission is needed.
- Local-first: no account, no telemetry, no network dependency for v1.
- Small presence: the pet should be cute without covering important work.

## MVP Experience

When PawPal launches, a small cat appears near the lower right of the active
screen. It stays above normal windows, blinks, occasionally walks, looks toward
the cursor, and naps after a period of inactivity.

The user can:

- Drag the cat to a preferred location
- Open a menu bar control
- Pause or hide the cat
- Mute sounds
- Change size
- Choose energy level: calm, normal, playful
- Quit cleanly

## Core Behaviors

### Idle

Default state. The cat blinks, breathes, shifts weight, and sometimes looks at
the cursor.

### Walk

The cat chooses a nearby target and walks there. Movement should avoid abrupt
teleporting. It should stay inside safe screen bounds.

### Sleep

After user inactivity or a random low-energy interval, the cat curls up. Mouse
movement, clicking the cat, or a menu command can wake it.

### Look

The cat turns its head or body toward the cursor. This gives the feeling that it
notices the user without needing a complex AI system.

### Meow

Short sound plus matching animation. Sounds must be rare and easy to mute.

### Scratch

The cat scratches screen edges or imaginary surfaces. This should be occasional
and short.

### Groom

A quiet self-cleaning animation used as a low-disruption filler behavior.

### Pounce

A playful movement toward the cursor or a random point. Disabled in calm mode.

## Non-Goals For v1

- AI chat pet
- Cloud sync
- Social features
- App Store distribution
- Window-aware climbing using Accessibility permissions
- Multiple pets at once

## Safety And Trust

The app must always provide:

- A reliable quit path
- A pause path
- A mute path
- No hidden background network traffic
- No keylogging or content capture

Keyboard and mouse activity should be used only as coarse interaction signals.
If future builds need Accessibility permissions, the app must request them with
clear explanation and graceful fallback.

## Success Criteria

- The cat can run for an hour without distracting the user.
- CPU use remains low while idle.
- The app can be quit without force quitting.
- The transparent window does not block normal work when click-through is on.
- The MVP behavior loop feels alive with fewer than ten animations.
