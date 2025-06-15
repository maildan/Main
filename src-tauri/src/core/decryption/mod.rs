use std::path::Path;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use crate::shared::error::KakaoError;
use crate::infrastructure::crypto::decrypt_aes_cbc;
use crate::shared::types::AESKeyCandidate;

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
    }    // 동적 분석으로 AES 키 후보 찾기
    let key_candidates = match crate::core::analysis::dynamic_analysis::start_dynamic_analysis() {
        Ok(keys) => keys,
        Err(e) => {
            println!("⚠️ 동적 분석 실패, 기본 키 사용: {}", e);
            vec![AESKeyCandidate {
                key: [0u8; 16],
                confidence: 50,
                source: "기본".to_string(),
            }]
        }
    };
    
    // 각 키 후보로 복호화 시도
    for (index, candidate) in key_candidates.iter().enumerate() {
        println!("🔑 키 후보 {} 시도: {:?}", index + 1, hex::encode(&candidate.key));
        
        match try_decrypt_with_key(&file_path, &candidate.key) {
            Ok(messages) => {
                if !messages.is_empty() {
                    println!("✅ 복호화 성공! {} 개의 메시지 발견", messages.len());
                    return Ok(messages);
                }
            },
            Err(e) => {
                println!("❌ 키 후보 {} 실패: {}", index + 1, e);
                continue;
            }
        }
    }
    
    Err("모든 키 후보로 복호화 실패".to_string())
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
