use tauri::{Manager, WebviewWindow};

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("pet") {
                configure_pet_window(&window);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run PawPal");
}

fn configure_pet_window(window: &WebviewWindow) {
    let _ = window.set_always_on_top(true);
    let _ = window.set_skip_taskbar(true);
    let _ = window.set_decorations(false);
    let _ = window.set_shadow(false);
    let _ = window.set_resizable(false);
    let _ = window.set_focusable(false);
}
