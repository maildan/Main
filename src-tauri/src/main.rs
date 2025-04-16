// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod types;
mod theme;
mod error;
mod components;

use std::sync::{Arc, Mutex};
use tauri;
use types::{Section, Theme};
use theme::ThemeManager;
use error::ErrorManager;
use components::{render_error_message, render_sidebar};

fn main() {
    let _theme_manager = Arc::new(ThemeManager::new(Theme::Dark));
    let _error_manager = Arc::new(ErrorManager::new());
    let active_section = Arc::new(Mutex::new(Section::Monitoring));

    tauri::Builder::default()
        .setup(move |app| {
            let app_handle = app.handle();

            // 초기 렌더링
            render_sidebar(&app_handle, active_section.clone());
            render_error_message(&app_handle, Arc::new(Mutex::new(None::<String>)));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 여기에 필요한 invoke 명령 추가
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
