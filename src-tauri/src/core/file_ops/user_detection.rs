use std::path::Path;
use std::fs;
use std::sync::{Mutex, OnceLock};
use crate::shared::error::KakaoError;

// 사용자 ID 캐시
static USER_ID_CACHE: OnceLock<Mutex<Option<String>>> = OnceLock::new();

/// 전화번호 유효성 검사 (한국 전화번호 패턴)
fn is_phone_number(s: &str) -> bool {
    // 한국 휴대폰 번호: 010-xxxx-xxxx 또는 01xxxxxxxx
    let clean_num = s.replace("-", "").replace(" ", "");
    clean_num.len() >= 10 && clean_num.len() <= 11 && clean_num.starts_with("01") && clean_num.chars().all(|c| c.is_ascii_digit())
}

/// login_list.dat 파일에서 사용자 ID 추출
fn parse_login_list_dat() -> Result<Option<String>, KakaoError> {
    let username = std::env::var("USERNAME").map_err(|_| KakaoError::ParseError("사용자명 가져오기 실패".to_string()))?;
    let login_list_path = format!("C:\\Users\\{}\\AppData\\Local\\Kakao\\KakaoTalk\\users\\login_list.dat", username);
    
    if !Path::new(&login_list_path).exists() {
        return Ok(None);
    }
    
    let content = fs::read_to_string(&login_list_path)?;
    
    // login_list|이메일@도메인.com 또는 login_list|전화번호 형식 찾기
    for line in content.lines() {
        if line.starts_with("login_list|") {
            let id_part = &line[11..]; // "login_list|" 이후 부분
            
            // 이메일 형식 체크 (@ 포함)
            if id_part.contains('@') && id_part.len() > 5 {
                println!("✅ login_list.dat에서 사용자 ID 발견: {}", id_part);
                return Ok(Some(id_part.to_string()));
            }
            
            // 전화번호 형식 체크
            if is_phone_number(id_part) {
                println!("✅ login_list.dat에서 사용자 ID 발견: {}", id_part);
                return Ok(Some(id_part.to_string()));
            }
        }
    }
    
    Ok(None)
}

/// 카카오톡 사용자 ID 자동 감지 (캐시 사용)
#[tauri::command]
pub fn get_user_id() -> Result<String, String> {
    // 캐시에서 먼저 확인
    let cache = USER_ID_CACHE.get_or_init(|| Mutex::new(None));
    
    if let Ok(cached) = cache.lock() {
        if let Some(ref cached_id) = *cached {
            return Ok(cached_id.clone());
        }
    }
    
    // 캐시에 없으면 login_list.dat에서 찾기
    match parse_login_list_dat() {
        Ok(Some(user_id)) => {
            // 캐시에 저장
            if let Ok(mut cache) = cache.lock() {
                *cache = Some(user_id.clone());
            }
            Ok(user_id)
        },
        Ok(None) => Err("login_list.dat에서 사용자 ID를 찾을 수 없습니다".to_string()),
        Err(e) => Err(format!("사용자 ID 감지 실패: {}", e)),
    }
}
