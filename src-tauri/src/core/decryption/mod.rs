pub mod kakao_decrypt;

use std::path::Path;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use crate::shared::error::KakaoError;
use kakao_decrypt::decrypt_kakao_edb_full;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KakaoMessage {
    pub id: i64,
    pub message: String,
    pub timestamp: String,
    pub sender: String,
}

/// 카카오톡 EDB 파일 복호화 (새로운 방식)
#[tauri::command]
pub fn decrypt_kakao_edb(file_path: String, user_id: String) -> Result<Vec<KakaoMessage>, String> {
    println!("🔓 EDB 파일 복호화 시작: {}", file_path);
    
    // 파일 존재 확인
    if !Path::new(&file_path).exists() {
        return Err("파일이 존재하지 않습니다".to_string());
    }

    // 새로운 복호화 로직 사용
    let decrypted_data = decrypt_kakao_edb_full(&file_path, &user_id)
        .map_err(|e| format!("복호화 실패: {:?}", e))?;
    
    // 임시 파일로 저장
    let temp_file = format!("{}.decrypted.db", file_path);
    std::fs::write(&temp_file, &decrypted_data)
        .map_err(|e| format!("복호화된 파일 저장 실패: {}", e))?;
    
    // SQLite 데이터베이스로 열기
    let conn = Connection::open(&temp_file)
        .map_err(|e| format!("데이터베이스 연결 실패: {}", e))?;
    
    // 메시지 추출
    let messages = extract_messages_from_db(&conn)
        .map_err(|e| format!("메시지 추출 실패: {:?}", e))?;
    
    // 임시 파일 삭제
    let _ = std::fs::remove_file(&temp_file);
    
    println!("✅ 복호화 완료! 메시지 {}개 추출", messages.len());
    Ok(messages)
}

/// 데이터베이스에서 메시지 추출
fn extract_messages_from_db(conn: &Connection) -> Result<Vec<KakaoMessage>, KakaoError> {
    // 카카오톡 데이터베이스 테이블 구조에 맞게 수정
    let query = "
        SELECT 
            id, 
            message, 
            created_at, 
            user_id 
        FROM chat_logs 
        WHERE message IS NOT NULL 
        ORDER BY created_at ASC
    ";
    
    let mut stmt = conn.prepare(query)?;
    
    let message_iter = stmt.query_map([], |row| {
        Ok(KakaoMessage {
            id: row.get(0)?,
            message: row.get::<_, String>(1)?,
            timestamp: row.get::<_, String>(2)?,
            sender: row.get::<_, String>(3)?,
        })
    })?;

    let mut messages = Vec::new();
    for message_result in message_iter {
        messages.push(message_result?);
    }

    Ok(messages)
}
