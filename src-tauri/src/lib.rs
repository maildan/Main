use std::fs::OpenOptions;
use std::io::{Read, Write};
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use chrono::Local;
use tauri::AppHandle;
use std::sync::atomic::{AtomicBool, Ordering};
use lazy_static::lazy_static;

// 키보드 트래킹 활성화 상태를 저장하는 전역 변수
lazy_static! {
    static ref TRACKING_ENABLED: AtomicBool = AtomicBool::new(false);
}

// 로그 저장 경로 상수 정의
const LOG_DIRECTORY: &str = "c:\\Loop\\src-tauri\\logs";

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

// 로그 디렉토리 경로를 가져오는 함수
fn get_log_directory() -> PathBuf {
    let path = PathBuf::from(LOG_DIRECTORY);
    
    // 디렉토리가 없다면 생성
    if !path.exists() {
        std::fs::create_dir_all(&path).expect("Failed to create log directory");
    }
    
    path
}

// 키보드 트래킹 활성화/비활성화
#[tauri::command]
fn set_tracking_enabled(enabled: bool) -> Result<bool, String> {
    TRACKING_ENABLED.store(enabled, Ordering::SeqCst);
    println!("트래킹 상태: {}", if enabled { "활성화" } else { "비활성화" });
    Ok(enabled)
}

// 현재 트래킹 상태 확인
#[tauri::command]
fn get_tracking_status() -> bool {
    TRACKING_ENABLED.load(Ordering::SeqCst)
}

#[tauri::command]
fn save_typing_data(app_handle: AppHandle, key: &str) -> Result<(), String> {
    // 트래킹이 비활성화되어 있으면 저장하지 않음
    if !TRACKING_ENABLED.load(Ordering::SeqCst) {
        return Ok(());
    }

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
    // 트래킹이 비활성화되어 있으면 저장하지 않음
    if !TRACKING_ENABLED.load(Ordering::SeqCst) {
        return Ok(());
    }
    
    // 로그 파일 경로 설정
    let mut log_path = get_log_directory();
    log_path.push("sentence_logs.json");
    
    // 로그 데이터 생성
    let log_entry = serde_json::json!({
        "timestamp": Local::now().to_rfc3339(),
        "sentence": sentence
    });
    
    // 기존 로그 파일이 있다면 읽기
    let mut logs = Vec::new();
    if log_path.exists() {
        let mut file = OpenOptions::new()
            .read(true)
            .open(&log_path)
            .map_err(|e| e.to_string())?;
        let mut contents = String::new();
        file.read_to_string(&mut contents).map_err(|e| e.to_string())?;
        if !contents.is_empty() {
            logs = serde_json::from_str(&contents).unwrap_or_else(|_| Vec::new());
        }
    }
    
    // 새 로그 추가
    logs.push(log_entry);
    
    // 로그를 파일에 저장
    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&log_path)
        .map_err(|e| e.to_string())?;
    
    let json_string = serde_json::to_string_pretty(&logs).map_err(|e| e.to_string())?;
    file.write_all(json_string.as_bytes()).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            save_typing_data, 
            log_sentence,
            set_tracking_enabled,
            get_tracking_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}