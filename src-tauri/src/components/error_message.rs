use std::sync::{Arc, Mutex};
use tauri::Emitter;

/// 에러 메시지를 렌더링하는 함수
pub fn render_error_message(app: &tauri::AppHandle, error_state: Arc<Mutex<Option<String>>>) {
    let error_message = {
        let state = error_state.lock().unwrap();
        state.clone()
    };

    if let Some(message) = error_message {
        // emit_all 대신 emit 사용
        app.emit("show_error", message).unwrap();
    }
}