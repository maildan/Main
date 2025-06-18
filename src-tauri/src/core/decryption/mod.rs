pub mod kakao_decrypt;

use std::path::Path;
use kakao_decrypt::decrypt_kakao_edb_full;

/// 카카오톡 EDB 파일 복호화 (새로운 방식)
#[tauri::command]
pub fn decrypt_kakao_edb(file_path: String, user_id: String) -> Result<Vec<kakao_decrypt::KakaoMessage>, String> {
    println!("🔓 EDB 파일 복호화 시작: {}", file_path);
    
    // 파일 존재 확인
    if !Path::new(&file_path).exists() {
        return Err("파일이 존재하지 않습니다".to_string());
    }

    // 새로운 복호화 로직 사용 (메시지까지 포함)
    let messages = decrypt_kakao_edb_full(&file_path, &user_id)
        .map_err(|e| format!("복호화 실패: {:?}", e))?;    
    println!("✅ 복호화 완료! 메시지 {}개 추출", messages.len());
    Ok(messages)
}
