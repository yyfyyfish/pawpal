import type { InteractionState, PetCommand } from "../core/interaction";
import { MAX_SCALE, MIN_SCALE, SCALE_STEP } from "../core/interaction";

interface SettingsAppProps {
  interaction: InteractionState;
  onCommand: (command: PetCommand) => void;
}

export function SettingsApp({ interaction, onCommand }: SettingsAppProps) {
  const { preferences } = interaction;

  return (
    <main className="settings-shell" aria-label="PawPal settings">
      <header className="settings-header">
        <h1>PawPal</h1>
      </header>

      <section className="settings-section">
        <div className="segmented-control" aria-label="Energy">
          {(["calm", "normal", "playful"] as const).map((energy) => (
            <button
              key={energy}
              className={preferences.energy === energy ? "active" : ""}
              type="button"
              onClick={() => onCommand({ type: "set-energy", energy })}
            >
              {energy}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <label className="range-row">
          <span>Size</span>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={SCALE_STEP}
            value={preferences.scale}
            onChange={(event) => {
              onCommand({ type: "set-scale", scale: Number(event.currentTarget.value) });
            }}
          />
          <output>{preferences.scale.toFixed(2)}x</output>
        </label>
      </section>

      <section className="settings-section settings-toggles">
        <label>
          <input
            type="checkbox"
            checked={preferences.muted}
            onChange={() => onCommand({ type: "toggle-mute" })}
          />
          <span>Muted</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.clickThrough}
            onChange={() => onCommand({ type: "toggle-click-through" })}
          />
          <span>Click-through</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.launchAtLogin}
            onChange={(event) => {
              onCommand({
                type: "set-launch-at-login",
                launchAtLogin: event.currentTarget.checked
              });
            }}
          />
          <span>Launch at login</span>
        </label>
      </section>

      <section className="settings-section settings-toggles">
        <label>
          <input
            type="checkbox"
            checked={preferences.patrolEnabled}
            onChange={(event) => {
              onCommand({
                type: "set-patrol-settings",
                patrol: { enabled: event.currentTarget.checked }
              });
            }}
          />
          <span>Patrol apps</span>
        </label>
      </section>

      <section className="settings-section">
        <div className="segmented-control" aria-label="Patrol surface">
          {(["front-window", "screen-edge"] as const).map((surfacePreference) => (
            <button
              key={surfacePreference}
              className={
                preferences.patrolSurfacePreference === surfacePreference ? "active" : ""
              }
              type="button"
              onClick={() => {
                onCommand({
                  type: "set-patrol-settings",
                  patrol: { surfacePreference }
                });
              }}
            >
              {surfacePreference === "front-window" ? "Apps" : "Screen"}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <div className="segmented-control" aria-label="Patrol intensity">
          {(["lazy", "normal", "busy"] as const).map((intensity) => (
            <button
              key={intensity}
              className={preferences.patrolIntensity === intensity ? "active" : ""}
              type="button"
              onClick={() => {
                onCommand({
                  type: "set-patrol-settings",
                  patrol: { intensity }
                });
              }}
            >
              {intensity}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
