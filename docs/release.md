# V1 Release Checklist

## Build Gate

Run these commands before tagging a V1 candidate:

```bash
npm run check
npm run build
npm audit --audit-level=moderate
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri:build
```

The expected macOS artifact is:

```text
src-tauri/target/release/bundle/macos/PawPal.app
```

## Manual QA

Complete `docs/macos-qa.md` on a Mac laptop. Confirm tray controls, settings,
pause, mute, click-through, launch-at-login, and quit all behave correctly.

## Signing

Unsigned local builds are acceptable for development. Public V1 distribution
requires an Apple Developer ID Application certificate and a configured Tauri
signing environment.

## Notarization

Before external distribution, notarize the app with Apple and staple the ticket
to the packaged artifact. Keep DMG distribution as a packaging follow-up once
signing credentials are available.

## Known Limitations

- The V1 build emits a macOS `.app` bundle, not a signed DMG.
- The default cat art is intentionally lightweight.
- The brain layer is rule-based and local-only.
- Advanced window climbing is out of scope for V1.
