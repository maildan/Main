use crate::types::Section;
use std::sync::{Arc, Mutex};
use tauri::Emitter;

/// 사이드바를 렌더링하는 함수
pub fn render_sidebar(app: &tauri::AppHandle, active_section: Arc<Mutex<Section>>) {
    let current_section = {
        let section = active_section.lock().unwrap();
        *section
    };

    app.emit("update_sidebar", current_section).unwrap();
}