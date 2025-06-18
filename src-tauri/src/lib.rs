// 모듈 선언
mod core;
mod infrastructure;
mod shared;
mod components;

// 모듈에서 필요한 것들 import
use core::file_ops::{get_user_id, find_kakao_files, search_kakao_files};
use core::decryption::decrypt_kakao_edb;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())        .invoke_handler(tauri::generate_handler![
            greet,
            decrypt_kakao_edb,
            find_kakao_files,
            search_kakao_files,
            get_user_id
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
