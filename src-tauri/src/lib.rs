use serde::Serialize;
use std::process::Command;
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeTypingBounds {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    source: String,
    app_name: Option<String>,
    role: Option<String>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .invoke_handler(tauri::generate_handler![
            frontmost_window_bounds,
            focused_typing_bounds
        ])
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
    let script = r#"
tell application "System Events"
  set frontApp to first application process whose frontmost is true
  set appName to name of frontApp
  if appName is "PawPal" or appName is "pawpal" then return ""
  if (count of windows of frontApp) is 0 then return ""
  set bestArea to 0
  set bestX to 0
  set bestY to 0
  set bestWidth to 0
  set bestHeight to 0
  repeat with candidateWindow in windows of frontApp
    try
      set isFullScreen to false
      try
        set isFullScreen to value of attribute "AXFullScreen" of candidateWindow
      end try
      set windowPosition to position of candidateWindow
      set windowSize to size of candidateWindow
      set windowWidth to item 1 of windowSize
      set windowHeight to item 2 of windowSize
      set windowArea to windowWidth * windowHeight
      if isFullScreen is false and windowWidth > 120 and windowHeight > 120 and windowArea > bestArea then
        set bestArea to windowArea
        set bestX to item 1 of windowPosition
        set bestY to item 2 of windowPosition
        set bestWidth to windowWidth
        set bestHeight to windowHeight
      end if
    end try
  end repeat
  if bestArea is 0 then return ""
  return appName & tab & bestX & tab & bestY & tab & bestWidth & tab & bestHeight
end tell
"#;
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    parse_window_bounds(&String::from_utf8_lossy(&output.stdout))
}

#[tauri::command]
fn focused_typing_bounds() -> Option<NativeTypingBounds> {
    let script = r#"
tell application "System Events"
  set frontApp to first application process whose frontmost is true
  set appName to name of frontApp
  if appName is "PawPal" or appName is "pawpal" then return ""
  try
    set focusedElement to value of attribute "AXFocusedUIElement" of frontApp
  on error
    return ""
  end try

  set roleName to ""
  try
    set roleName to value of attribute "AXRole" of focusedElement
  end try

  set editableElement to false
  if roleName is "AXTextArea" or roleName is "AXTextField" or roleName is "AXSearchField" or roleName is "AXComboBox" then
    set editableElement to true
  end if
  try
    if value of attribute "AXEditable" of focusedElement is true then set editableElement to true
  end try
  if editableElement is false then return ""

  try
    set elementPosition to position of focusedElement
    set elementSize to size of focusedElement
    set elementX to item 1 of elementPosition
    set elementY to item 2 of elementPosition
    set elementWidth to item 1 of elementSize
    set elementHeight to item 2 of elementSize
  on error
    return ""
  end try

  if elementWidth < 6 or elementHeight < 6 then return ""
  return appName & tab & "focused-element" & tab & elementX & tab & elementY & tab & elementWidth & tab & elementHeight & tab & roleName
end tell
"#;
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    parse_typing_bounds(&String::from_utf8_lossy(&output.stdout))
}

fn parse_window_bounds(value: &str) -> Option<NativeWindowBounds> {
    let parts: Vec<&str> = value.trim().split('\t').collect();
    if parts.len() != 5 {
        return None;
    }

    let x = parts[1].parse::<f64>().ok()?;
    let y = parts[2].parse::<f64>().ok()?;
    let width = parts[3].parse::<f64>().ok()?;
    let height = parts[4].parse::<f64>().ok()?;

    if width <= 0.0 || height <= 0.0 {
        return None;
    }

    Some(NativeWindowBounds {
        x,
        y,
        width,
        height,
        app_name: Some(parts[0].to_string()),
    })
}

fn parse_typing_bounds(value: &str) -> Option<NativeTypingBounds> {
    let parts: Vec<&str> = value.trim().split('\t').collect();
    if parts.len() != 7 {
        return None;
    }

    let source = parts[1];
    if source != "caret" && source != "focused-element" {
        return None;
    }

    let x = parts[2].parse::<f64>().ok()?;
    let y = parts[3].parse::<f64>().ok()?;
    let width = parts[4].parse::<f64>().ok()?;
    let height = parts[5].parse::<f64>().ok()?;

    if width <= 0.0 || height <= 0.0 {
        return None;
    }

    Some(NativeTypingBounds {
        x,
        y,
        width,
        height,
        source: source.to_string(),
        app_name: Some(parts[0].to_string()),
        role: Some(parts[6].to_string()),
    })
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

#[cfg(test)]
mod tests {
    use super::{parse_typing_bounds, parse_window_bounds};

    #[test]
    fn parses_front_window_bounds() {
        let bounds = parse_window_bounds("Safari\t10\t20\t900\t600\n").unwrap();

        assert_eq!(bounds.x, 10.0);
        assert_eq!(bounds.y, 20.0);
        assert_eq!(bounds.width, 900.0);
        assert_eq!(bounds.height, 600.0);
        assert_eq!(bounds.app_name.as_deref(), Some("Safari"));
    }

    #[test]
    fn parses_focused_typing_bounds_without_text_payload() {
        let bounds =
            parse_typing_bounds("Terminal\tfocused-element\t120\t220\t640\t180\tAXTextArea\n")
                .unwrap();

        assert_eq!(bounds.source, "focused-element");
        assert_eq!(bounds.x, 120.0);
        assert_eq!(bounds.y, 220.0);
        assert_eq!(bounds.width, 640.0);
        assert_eq!(bounds.height, 180.0);
        assert_eq!(bounds.app_name.as_deref(), Some("Terminal"));
        assert_eq!(bounds.role.as_deref(), Some("AXTextArea"));
    }

    #[test]
    fn rejects_invalid_typing_bounds() {
        assert!(parse_typing_bounds("Terminal\twindow\t120\t220\t640\t180\tAXTextArea").is_none());
        assert!(parse_typing_bounds("Terminal\tfocused-element\t120\t220\t0\t180\tAXTextArea")
            .is_none());
        assert!(parse_typing_bounds("Terminal\tfocused-element\t120\t220\t640").is_none());
    }
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
        .text("typing-guard-on", "Typing Guard On")
        .text("typing-guard-off", "Typing Guard Off")
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
