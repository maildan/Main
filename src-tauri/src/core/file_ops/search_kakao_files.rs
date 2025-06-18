use std::path::PathBuf;
use std::fs;
use sha1::{Sha1, Digest};
use hex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KakaoFile {
    pub path: String,
    pub name: String,
    pub size: u64,
}

/// 사용자 ID를 기반으로 카카오톡 파일 검색
#[tauri::command]
pub fn search_kakao_files(user_id: String) -> Result<Vec<KakaoFile>, String> {
    // 사용자 이름 가져오기
    let username = std::env::var("USERNAME")
        .map_err(|_| "사용자명을 가져올 수 없습니다".to_string())?;

    // 사용자 ID를 SHA-1 해시로 변환 (카카오톡이 사용하는 방식)
    let mut hasher = Sha1::new();
    hasher.update(user_id.as_bytes());
    let hash_result = hasher.finalize();
    let hash_hex = hex::encode(hash_result);
    
    // 카카오톡 사용자 디렉터리 경로
    let kakao_base_path = format!(
        "C:\\Users\\{}\\AppData\\Local\\Kakao\\KakaoTalk\\users",
        username
    );
    
    let mut found_files = Vec::new();
    
    // 해시된 사용자 ID 디렉터리 확인
    let user_dir = PathBuf::from(&kakao_base_path).join(&hash_hex);
    if user_dir.exists() {
        // chat_data 디렉터리 확인
        let chat_data_dir = user_dir.join("chat_data");
        if chat_data_dir.exists() {
            search_chatlog_files(&chat_data_dir, &mut found_files);
        }    } else {
        // 해시가 안 맞을 경우 전체 users 디렉터리에서 검색
        if let Ok(user_dirs) = fs::read_dir(&kakao_base_path) {
            for user_dir_entry in user_dirs.flatten() {
                let user_path = user_dir_entry.path();
                if user_path.is_dir() {
                    let chat_data_dir = user_path.join("chat_data");
                    if chat_data_dir.exists() {
                        search_chatlog_files(&chat_data_dir, &mut found_files);
                    }
                }
            }
        }
    }
    
    if found_files.is_empty() {
        return Err("카카오톡 EDB 파일을 찾을 수 없습니다".to_string());
    }
    
    Ok(found_files)
}

/// chatLogs_{숫자ID}.edb 형태의 파일만 검색
fn search_chatlog_files(chat_data_dir: &PathBuf, found_files: &mut Vec<KakaoFile>) {
    if let Ok(entries) = fs::read_dir(chat_data_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
                // chatLogs_{숫자ID}.edb 형태만 허용
                if file_name.starts_with("chatLogs_") && file_name.ends_with(".edb") {
                    let id_part = &file_name[9..file_name.len()-4]; // "chatLogs_"와 ".edb" 제거
                    if id_part.chars().all(|c| c.is_ascii_digit()) {
                        if let Ok(metadata) = entry.metadata() {
                            found_files.push(KakaoFile {
                                path: path.to_string_lossy().to_string(),
                                name: file_name.to_string(),
                                size: metadata.len(),
                            });
                        }
                    }
                }
            }
        }
    }
}