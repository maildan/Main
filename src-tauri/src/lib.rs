use std::fs::OpenOptions;
use std::io::{Read, Write};
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use chrono::Local;
use tauri::AppHandle;

#[derive(Serialize, Deserialize)]
struct TypingData {
    timestamp: String,
    key: String,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// 데이터 저장 경로를 가져오는 함수
fn get_data_file_path(_app_handle: &AppHandle) -> PathBuf {
    // Tauri 2.0에서는 path_resolver() 대신 다른 방법을 사용해야 함
    // 임시 디렉토리에 저장
    let mut path = std::env::temp_dir();
    path.push("typing_app");
    
    // 디렉토리가 없다면 생성
    if !path.exists() {
        std::fs::create_dir_all(&path).expect("Failed to create app data directory");
    }
    
    path.push("typing_data.json");
    path
}

#[tauri::command]
fn save_typing_data(app_handle: AppHandle, key: &str) -> Result<(), String> {
    // 터미널에 로그 출력
    println!("Key pressed: {}", key);
    
    let data = TypingData {
        timestamp: Local::now().to_rfc3339(),
        key: key.to_string(),
    };

    let file_path = get_data_file_path(&app_handle);
    let mut existing_data = Vec::new();

    if file_path.exists() {
        if let Ok(mut file) = OpenOptions::new().read(true).open(&file_path) {
            let mut contents = String::new();
            file.read_to_string(&mut contents).map_err(|e| e.to_string())?;
            existing_data = serde_json::from_str(&contents).unwrap_or_else(|_| Vec::new());
        }
    }

    existing_data.push(data);

    let json = serde_json::to_string(&existing_data).map_err(|e| e.to_string())?;
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&file_path)
        .map_err(|e| e.to_string())?;
    file.write_all(json.as_bytes()).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn log_sentence(sentence: &str) -> Result<(), String> {
    // 완성된 문장을 터미널에 출력
    println!("Sentence: {}", sentence);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, save_typing_data, log_sentence])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
