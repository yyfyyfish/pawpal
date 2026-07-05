use serde::Serialize;
use tauri::{menu::MenuBuilder, tray::TrayIconBuilder, Emitter, Manager, WebviewWindow};
use tauri_plugin_autostart::MacosLauncher;

const PET_WINDOW_LABEL: &str = "pet";
const SETTINGS_WINDOW_LABEL: &str = "settings";
const COMMAND_EVENT: &str = "pawpal://command";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeWindowBounds {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    app_name: Option<String>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![frontmost_window_bounds])
        .setup(|app| {
            if let Some(window) = app.get_webview_window(PET_WINDOW_LABEL) {
                configure_pet_window(&window);
            }
            configure_tray(app)?;
            if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
                let _ = window.show();
                let _ = window.set_focus();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run PawPal");
}

#[tauri::command]
fn frontmost_window_bounds() -> Option<NativeWindowBounds> {
    None
}

fn configure_pet_window(window: &WebviewWindow) {
    let _ = window.set_always_on_top(true);
    let _ = window.set_skip_taskbar(true);
    let _ = window.set_decorations(false);
    let _ = window.set_shadow(false);
    let _ = window.set_resizable(false);
    let _ = window.set_focusable(false);
    let _ = window.set_visible_on_all_workspaces(true);
    let _ = window.set_ignore_cursor_events(true);
}

fn configure_tray(app: &tauri::App) -> tauri::Result<()> {
    let menu = MenuBuilder::new(app)
        .text("toggle-pause", "Pause / Resume")
        .text("toggle-mute", "Mute / Unmute")
        .text("toggle-click-through", "Toggle Click-Through")
        .separator()
        .text("energy-calm", "Energy: Calm")
        .text("energy-normal", "Energy: Normal")
        .text("energy-playful", "Energy: Playful")
        .text("launch-at-login-on", "Launch at Login")
        .text("launch-at-login-off", "Do Not Launch at Login")
        .separator()
        .text("patrol-on", "Patrol Apps")
        .text("patrol-off", "Stop Patrol")
        .text("patrol-surface-front-window", "Patrol: Front App")
        .text("patrol-surface-screen-edge", "Patrol: Screen Edge")
        .text("patrol-intensity-lazy", "Patrol: Lazy")
        .text("patrol-intensity-normal", "Patrol: Normal")
        .text("patrol-intensity-busy", "Patrol: Busy")
        .separator()
        .text("size-smaller", "Smaller")
        .text("size-larger", "Larger")
        .text("reset-position", "Reset Position")
        .text("open-settings", "Settings")
        .separator()
        .text("quit", "Quit PawPal")
        .build()?;

    let icon = app
        .default_window_icon()
        .cloned()
        .expect("PawPal should have a default tray icon");

    TrayIconBuilder::with_id("pawpal-tray")
        .tooltip("PawPal")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            let command = event.id().as_ref();
            if command == "quit" {
                app.exit(0);
                return;
            }

            if command == "open-settings" {
                if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
                return;
            }

            let _ = app.emit_to(PET_WINDOW_LABEL, COMMAND_EVENT, command);
            let _ = app.emit_to(SETTINGS_WINDOW_LABEL, COMMAND_EVENT, command);
        })
        .build(app)?;

    Ok(())
}
