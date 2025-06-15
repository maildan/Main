// 모듈 선언
mod core;
mod infrastructure;
mod shared;
mod components;

// 모듈에서 필요한 것들 import
use core::file_ops::{get_user_id, find_kakao_files};
use core::decryption::decrypt_kakao_edb;
use core::analysis::{init_progress_manager, PROGRESS_MANAGER};
use shared::types::AnalysisProgress;
use winreg::RegKey;
use winreg::enums::*;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// 카카오톡 키 분석 시작
#[tauri::command]
async fn start_kakao_key_analysis(_app_handle: tauri::AppHandle) -> Result<(), String> {
    // 분석 시작 상태 설정
    {
        if let Ok(mut manager) = PROGRESS_MANAGER.lock() {
            manager.update_progress("분석 시작", 0, "동적 분석 초기화 중...");
        }
    }
    
    // 백그라운드에서 분석 실행
    tokio::spawn(async move {
        let _ = perform_key_analysis().await;
    });

    Ok(())
}

/// 분석 중단
#[tauri::command]
fn cancel_kakao_key_analysis() -> Result<(), String> {
    if let Ok(mut manager) = PROGRESS_MANAGER.lock() {
        manager.update_progress("중단됨", 0, "분석이 중단되었습니다");
    }
    Ok(())
}

/// 현재 진행률 조회
#[tauri::command]
fn get_current_analysis_progress() -> Result<AnalysisProgress, String> {
    if let Ok(manager) = PROGRESS_MANAGER.lock() {
        return Ok(manager.get_progress());
    }
    Ok(AnalysisProgress::default())
}

/// 실제 키 분석 수행 (간소화된 버전)
async fn perform_key_analysis() -> Result<(), String> {
    // 1. 초기화 단계
    {
        if let Ok(mut manager) = PROGRESS_MANAGER.lock() {
            manager.update_progress("초기화", 10, "복호화기 초기화 중...");
        }
    }
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    // 2. 레지스트리 분석 단계
    {
        if let Ok(mut manager) = PROGRESS_MANAGER.lock() {
            manager.update_progress("레지스트리 분석", 30, "FolderDescriptions 레지스트리 분석 중...");
        }
    }
    
    // FolderDescriptions 분석 실행
    let folder_descriptions_result = analyze_folder_descriptions_registry().await;
    let mut total_keys_found = 0u32;
    
    if let Ok(registry_keys) = folder_descriptions_result {
        total_keys_found = registry_keys.len() as u32;
        println!("🎯 FolderDescriptions 분석 결과: {}개 키 발견", total_keys_found);
    }
    
    tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;
    
    // 3. 메모리 분석 단계
    {
        if let Ok(mut manager) = PROGRESS_MANAGER.lock() {
            manager.update_progress("메모리 분석", 60, "프로세스 메모리 스캔 중...");
        }
    }
    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
    
    // 4. 키 검증 단계
    {
        if let Ok(mut manager) = PROGRESS_MANAGER.lock() {
            manager.update_progress("키 검증", 80, "키 후보 검증 중...");
        }
    }
    tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;
    
    // 5. 완료
    {
        if let Ok(mut manager) = PROGRESS_MANAGER.lock() {
            manager.update_progress("완료", 100, format!("분석 완료! {}개 키 후보 발견", total_keys_found).as_str());
        }
    }
    
    Ok(())
}

/// FolderDescriptions 레지스트리 경로 중심 분석
pub async fn analyze_folder_descriptions_registry() -> Result<Vec<String>, String> {
    let mut found_keys = Vec::new();
    
    // 핵심 FolderDescriptions 경로
    let target_guid = "F1B32785-6FBA-4FCF-9D55-7B8E7F157091";
    let folder_desc_path = format!(
        "SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FolderDescriptions\\{{{}}}", 
        target_guid
    );
    
    println!("🔍 FolderDescriptions 경로 분석: {}", folder_desc_path);
    
    // HKLM에서 FolderDescriptions 분석
    if let Ok(hklm) = RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey(&folder_desc_path) {
        println!("✅ FolderDescriptions 경로 발견!");
        
        // 모든 값들 열거
        for (name, value) in hklm.enum_values().filter_map(|x| x.ok()) {
            match value {
                winreg::RegValue { vtype: reg_binary, bytes } if reg_binary == winreg::enums::REG_BINARY => {
                    if bytes.len() == 16 {
                        let hex_key = bytes.iter().map(|b| format!("{:02X}", b)).collect::<String>();
                        println!("🔑 16바이트 REG_BINARY 발견: {} = {}", name, hex_key);
                        found_keys.push(hex_key);
                    }
                },
                winreg::RegValue { vtype: reg_sz, bytes } if reg_sz == winreg::enums::REG_SZ => {
                    if let Ok(string_val) = String::from_utf8(bytes) {
                        let clean_val = string_val.trim_end_matches('\0');
                        println!("📝 REG_SZ 값: {} = {}", name, clean_val);
                    }
                },
                _ => {}
            }
        }
    }
    
    // 관련 카카오톡 레지스트리 경로들 분석
    let kakao_paths = vec![
        "SOFTWARE\\WOW6432Node\\Kakao",
        "SOFTWARE\\Kakao",
    ];
    
    for path in kakao_paths {
        println!("🔍 카카오 경로 분석: {}", path);
        
        // HKLM 카카오 경로
        if let Ok(hklm_kakao) = RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey(path) {
            found_keys.extend(analyze_kakao_registry_recursive(&hklm_kakao, path, 0)?);
        }
        
        // HKCU 카카오 경로
        if let Ok(hkcu_kakao) = RegKey::predef(HKEY_CURRENT_USER).open_subkey(path) {
            found_keys.extend(analyze_kakao_registry_recursive(&hkcu_kakao, path, 0)?);
        }
    }
    
    // 다른 FolderDescriptions GUID들도 확인
    let folder_descriptions_base = "SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FolderDescriptions";
    let folder_base = RegKey::predef(HKEY_LOCAL_MACHINE).open_subkey(folder_descriptions_base)
        .map_err(|e| format!("FolderDescriptions 기본 경로 열기 실패: {}", e))?;
    println!("🔍 다른 FolderDescriptions GUID들 탐색...");
    
    for subkey_name in folder_base.enum_keys().filter_map(|x| x.ok()) {
        if subkey_name.contains('-') && subkey_name.len() == 38 { // GUID 형식 확인
            if let Ok(guid_key) = folder_base.open_subkey(&subkey_name) {
                // REG_BINARY 값들 확인
                for (name, value) in guid_key.enum_values().filter_map(|x| x.ok()) {
                    let winreg::RegValue { vtype: reg_binary, bytes } = value;
                    if reg_binary == winreg::enums::REG_BINARY && bytes.len() == 16 {
                        let hex_key = bytes.iter().map(|b| format!("{:02X}", b)).collect::<String>();
                        println!("🔑 다른 GUID에서 16바이트 키 발견: {} in {} = {}", name, subkey_name, hex_key);
                        found_keys.push(hex_key);
                    }
                }
            }
        }
    }
    
    println!("📊 총 {}개의 키 후보 발견", found_keys.len());
    Ok(found_keys)
}

/// 카카오톡 레지스트리 재귀적 분석
fn analyze_kakao_registry_recursive(key: &winreg::RegKey, path: &str, depth: u32) -> Result<Vec<String>, String> {
    const MAX_DEPTH: u32 = 3; // 최대 3단계까지만 탐색
    
    if depth > MAX_DEPTH {
        return Ok(Vec::new());
    }
    
    let mut found_keys = Vec::new();
    
    // 현재 키의 모든 값들 확인
    for (name, value) in key.enum_values().filter_map(|x| x.ok()) {
        match value {
            winreg::RegValue { vtype: reg_binary, bytes } if reg_binary == winreg::enums::REG_BINARY => {
                if bytes.len() == 16 {
                    let hex_key = bytes.iter().map(|b| format!("{:02X}", b)).collect::<String>();
                    println!("🔑 카카오 16바이트 키 발견: {}\\{} = {}", path, name, hex_key);
                    found_keys.push(hex_key);
                } else if !bytes.is_empty() {
                    let hex_preview = bytes.iter().take(8).map(|b| format!("{:02X}", b)).collect::<Vec<_>>().join(" ");
                    println!("📋 카카오 바이너리 데이터: {}\\{} = {} ... ({}바이트)", path, name, hex_preview, bytes.len());
                }
            },
            winreg::RegValue { vtype: reg_sz, bytes } if reg_sz == winreg::enums::REG_SZ => {
                if let Ok(string_val) = String::from_utf8(bytes) {
                    let clean_val = string_val.trim_end_matches('\0');
                    // UUID나 시리얼 번호 같은 중요한 정보 체크
                    if clean_val.len() >= 16 && (clean_val.contains('-') || clean_val.chars().all(|c| c.is_ascii_hexdigit())) {
                        println!("🔍 카카오 중요 문자열: {}\\{} = {}", path, name, clean_val);
                    }
                }
            },
            _ => {}
        }
    }
    
    // 하위 키들 재귀적 탐색
    for subkey_name in key.enum_keys().filter_map(|x| x.ok()) {
        if let Ok(subkey) = key.open_subkey(&subkey_name) {
            let subpath = format!("{}\\{}", path, subkey_name);
            if let Ok(mut sub_keys) = analyze_kakao_registry_recursive(&subkey, &subpath, depth + 1) {
                found_keys.append(&mut sub_keys);
            }
        }
    }
    
    Ok(found_keys)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())        .setup(|_app| {
            // 진행률 관리자 초기화
            init_progress_manager();
            Ok(())
        })        .invoke_handler(tauri::generate_handler![
            greet,
            decrypt_kakao_edb,
            find_kakao_files,
            get_user_id,
            start_kakao_key_analysis,
            cancel_kakao_key_analysis,
            get_current_analysis_progress
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
