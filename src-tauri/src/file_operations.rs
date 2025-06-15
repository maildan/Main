use std::fs;
use std::path::{Path, PathBuf};
use crate::error::KakaoError;

/// EDB 파일들을 재귀적으로 찾기 (chatLogs_{숫자ID}.edb 형식만)
pub fn find_edb_files_recursive(root_path: &Path) -> Result<Vec<PathBuf>, KakaoError> {
    let mut edb_files = Vec::new();
    
    if !root_path.exists() {
        return Ok(edb_files);
    }
    
    fn scan_directory(dir: &Path, files: &mut Vec<PathBuf>) -> Result<(), KakaoError> {
        let entries = fs::read_dir(dir)?;
        
        for entry in entries {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() {
                scan_directory(&path, files)?;
            } else if let Some(filename) = path.file_name() {
                if let Some(filename_str) = filename.to_str() {
                    // chatLogs_{숫자ID}.edb 형식만 허용
                    if filename_str.starts_with("chatLogs_") && filename_str.ends_with(".edb") {
                        // chatLogs_와 .edb 사이의 부분이 숫자인지 확인
                        let id_part = &filename_str[9..filename_str.len()-4]; // "chatLogs_"와 ".edb" 제거
                        if id_part.chars().all(|c| c.is_ascii_digit()) {
                            files.push(path);
                        }
                    }
                }
            }
        }
        Ok(())
    }
    
    scan_directory(root_path, &mut edb_files)?;
    Ok(edb_files)
}

/// 카카오톡 관련 파일들 찾기
#[tauri::command]
pub fn find_kakao_files() -> Result<Vec<String>, String> {
    let username = std::env::var("USERNAME").map_err(|_| "사용자명 가져오기 실패".to_string())?;
    let kakao_path = format!("C:\\Users\\{}\\AppData\\Local\\Kakao\\KakaoTalk", username);
    
    match find_edb_files_recursive(Path::new(&kakao_path)) {
        Ok(files) => {
            let file_paths: Vec<String> = files.iter()
                .filter_map(|p| p.to_str())
                .map(|s| s.to_string())
                .collect();
            
            if file_paths.is_empty() {
                Err("카카오톡 EDB 파일을 찾을 수 없습니다".to_string())
            } else {
                Ok(file_paths)
            }
        },
        Err(e) => Err(format!("파일 검색 실패: {}", e)),
    }
}
