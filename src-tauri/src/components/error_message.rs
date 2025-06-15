use std::sync::{Arc, Mutex};
use tauri::Emitter;

/// 에러 메시지를 렌더링하는 함수
#[allow(dead_code)]
pub fn render_error_message(app: &tauri::AppHandle, error_state: Arc<Mutex<Option<String>>>) {
    let error_message = {
        let state = error_state.lock().unwrap();
        state.clone()
    };

    if let Some(message) = error_message {
        app.emit("show_error", message).unwrap();
    }
}