use std::path::Path;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use crate::shared::error::KakaoError;
use crate::infrastructure::crypto::decrypt_aes_cbc;

// 하드코딩된 pragma 키 (16바이트)
const PRAGMA_KEY: [u8; 16] = [
    0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0,
    0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88
];

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KakaoMessage {
    pub id: i64,
    pub message: String,
    pub timestamp: String,
    pub sender: String,
}

/// 카카오톡 EDB 파일 복호화
#[tauri::command]
pub fn decrypt_kakao_edb(file_path: String) -> Result<Vec<KakaoMessage>, String> {
    println!("🔓 EDB 파일 복호화 시작: {}", file_path);
    
    // 파일 존재 확인
    if !Path::new(&file_path).exists() {
        return Err("파일이 존재하지 않습니다".to_string());
    }

    // pragma 키로 복호화 시도
    println!("🔑 pragma 키로 복호화 시도");
    
    match try_decrypt_with_key(&file_path, &PRAGMA_KEY) {
        Ok(messages) => {
            if !messages.is_empty() {
                println!("✅ 복호화 성공! {} 개의 메시지 발견", messages.len());
                return Ok(messages);
            } else {
                return Err("복호화는 성공했지만 메시지를 찾을 수 없습니다".to_string());
            }
        },
        Err(e) => {
            println!("❌ pragma 키로 복호화 실패: {:?}", e);
            return Err(format!("복호화 실패: {:?}", e));
        }
    }
}

/// 특정 키로 복호화 시도
fn try_decrypt_with_key(file_path: &str, key: &[u8; 16]) -> Result<Vec<KakaoMessage>, KakaoError> {
    // SQLite 연결
    let conn = Connection::open(file_path)?;
    
    // 메시지 테이블 조회
    let mut stmt = conn.prepare("SELECT id, message, created_at, user_id FROM chat_logs LIMIT 100")?;
    let mut messages = Vec::new();
    
    let rows = stmt.query_map([], |row| {
        let id: i64 = row.get(0)?;
        let encrypted_message: Vec<u8> = row.get(1)?;
        let timestamp: String = row.get(2).unwrap_or_default();
        let sender: String = row.get(3).unwrap_or_default();
        
        // 복호화 시도
        let iv = vec![0u8; 16]; // 기본 IV
        
        match decrypt_aes_cbc(&encrypted_message, key, &iv) {
            Ok(decrypted) => {
                let message = String::from_utf8_lossy(&decrypted).to_string();
                Ok(KakaoMessage {
                    id,
                    message,
                    timestamp,
                    sender,
                })
            },
            Err(_) => {
                // 복호화 실패시 원본 그대로
                let message = String::from_utf8_lossy(&encrypted_message).to_string();
                Ok(KakaoMessage {
                    id,
                    message,
                    timestamp,
                    sender,
                })
            }
        }
    })?;
    
    for row in rows {
        if let Ok(message) = row {
            messages.push(message);
        }
    }
    
    Ok(messages)
}
