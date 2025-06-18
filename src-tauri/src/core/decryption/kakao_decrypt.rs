use std::fs;
use std::path::Path;
use aes::Aes128;
use aes::cipher::{BlockDecrypt, KeyInit, generic_array::GenericArray};
use md5;
use sha2::{Sha512, Digest as Sha2Digest};
use base64::{Engine as _, engine::general_purpose};
use winreg::enums::*;
use winreg::RegKey;
use crate::shared::error::KakaoError;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

// 실제 카카오톡에서 사용하는 pragma 생성용 키 (16바이트)
const PRAGMA_HARDCODED_KEY: [u8; 16] = [
    0x9F, 0xBA, 0xE3, 0x11, 0x8F, 0xDE, 0x5D, 0xEA,
    0xEB, 0x82, 0x79, 0xD0, 0x8F, 0x1D, 0x4C, 0x79
];

/// 시스템 정보 구조체
#[derive(Debug, Clone)]
pub struct SystemInfo {
    pub uuid: String,
    pub model_name: String,
    pub serial_number: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct KakaoMessage {
    pub id: i64,
    pub user_id: String,
    pub message: String,
    pub created_at: i64,
    pub message_type: i32,
}

/// 레지스트리에서 카카오톡이 저장한 시스템 정보 가져오기
/// 레지스트리에서 카카오톡이 저장한 시스템 정보 가져오기
pub fn get_kakao_system_info() -> Result<SystemInfo, KakaoError> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let device_info_key = hkcu
        .open_subkey("Software\\Kakao\\KakaoTalk\\DeviceInfo")
        .map_err(|e| {
            println!("❌ DeviceInfo 키 열기 실패: {}", e);
            KakaoError::DecryptionError(format!("DeviceInfo 접근 실패: {}", e))
        })?;

    // DeviceInfo 하위의 모든 키를 검색 (날짜 폴더 찾기)
    let mut found_values = None;
    for subkey_name in device_info_key.enum_keys() {
        if let Ok(subkey_name) = subkey_name {
            if let Ok(subkey) = device_info_key.open_subkey(&subkey_name) {
                // 각 하위 키에서 필요한 값들을 찾아보기
                if let (Ok(uuid), Ok(model_name), Ok(serial_number)) = (
                    subkey.get_value::<String, _>("sys_uuid"),
                    subkey.get_value::<String, _>("hdd_model"),
                    subkey.get_value::<String, _>("hdd_serial")
                ) {
                    found_values = Some((uuid, model_name, serial_number));
                    break;
                }
            }
        }
    }

    if let Some((uuid, model_name, serial_number)) = found_values {
        // 레지스트리 값만 출력
        println!("📋 레지스트리에서 가져온 시스템 정보:");
        println!("   🔸 sys_uuid: {}", uuid);
        println!("   🔸 hdd_model: {}", model_name);
        println!("   🔸 hdd_serial: {}", serial_number);

        Ok(SystemInfo {
            uuid,
            model_name,
            serial_number,
        })
    } else {
        println!("❌ 시스템 정보를 찾을 수 없습니다.");
        Err(KakaoError::DecryptionError("시스템 정보를 찾을 수 없습니다".to_string()))
    }
}

/// pragma 생성 (블로그 방식)
pub fn generate_pragma(system_info: &SystemInfo) -> Result<String, KakaoError> {
    // UUID|ModelName|SerialNumber 형태로 연접
    let combined = format!("{}|{}|{}", 
        system_info.uuid, 
        system_info.model_name, 
        system_info.serial_number
    );    // AES-128-CBC 암호화 (IV는 0으로 초기화)
    let iv = [0u8; 16];
    let encrypted = encrypt_aes_cbc_simple(&PRAGMA_HARDCODED_KEY, &iv, combined.as_bytes())?;
    
    // SHA512 해싱 (블로그 방식: SHA-512 해시 생성)
    let mut hasher = Sha512::new();
    Sha2Digest::update(&mut hasher, &encrypted);
    let hashed = Sha2Digest::finalize(hasher);
    
    // Base64 인코딩 (블로그: Base64 인코딩된 SHA-512 해시값 리턴)
    let final_pragma = general_purpose::STANDARD.encode(&hashed);
    
    Ok(final_pragma)
}

/// key와 IV 생성 (블로그 방식)
pub fn generate_key_iv(pragma: &str, user_id: &str) -> Result<([u8; 16], [u8; 16]), KakaoError> {    // pragma + userID 연접
    let combined = format!("{}{}", pragma, user_id);
    
    // 512바이트까지 확장 (블로그 방식: (pragma + userId) * (512 // len + 1))
    let combined_len = combined.len();
    let repeat_count = 512 / combined_len + 1;
    let mut key_material = combined.repeat(repeat_count);
    key_material.truncate(512);
    
    // MD5로 key 생성
    let key_hash = md5::compute(key_material.as_bytes());
    let key: [u8; 16] = key_hash.0;
    
    // key를 Base64 인코딩 후 MD5로 IV 생성
    let key_base64 = general_purpose::STANDARD.encode(&key);
    let iv_hash = md5::compute(key_base64.as_bytes());
    let iv: [u8; 16] = iv_hash.0;
    
    Ok((key, iv))
}

/// EDB 파일 복호화 (4096바이트 단위) - 블로그 방식
pub fn decrypt_edb_file(file_path: &str, key: &[u8; 16], iv: &[u8; 16]) -> Result<Vec<u8>, KakaoError> {
    let encrypted_data = fs::read(file_path)
        .map_err(|e| KakaoError::DecryptionError(format!("파일 읽기 실패: {}", e)))?;
    
    let mut decrypted_data = Vec::new();
    let mut i = 0;
    
    // 블로그 방식: 4096바이트씩 처리하면서 각각 새로운 cipher 생성
    while i < encrypted_data.len() {
        let chunk_size = std::cmp::min(4096, encrypted_data.len() - i);
        let chunk = &encrypted_data[i..i + chunk_size];
        
        // 각 청크마다 새로운 cipher 생성 (블로그 방식)
        let cipher = Aes128::new(GenericArray::from_slice(key));
        let mut current_iv = *iv;
        
        // 16바이트씩 CBC 복호화
        for block_chunk in chunk.chunks(16) {
            if block_chunk.len() == 16 {
                let mut block = [0u8; 16];
                block.copy_from_slice(block_chunk);
                let encrypted_block = block;
                
                let mut block_array = GenericArray::from(block);
                cipher.decrypt_block(&mut block_array);
                
                // XOR with IV/previous block (CBC mode)
                for j in 0..16 {
                    block_array[j] ^= current_iv[j];
                }
                
                decrypted_data.extend_from_slice(&block_array);
                current_iv = encrypted_block;
            }
        }
        
        i += 4096;    }
    
    Ok(decrypted_data)
}

/// 전체 복호화 프로세스 (블로그 방식만 사용)
pub fn decrypt_kakao_edb_full(file_path: &str, user_id: &str) -> Result<Vec<KakaoMessage>, KakaoError> {
    // 파일명만 출력
    let file_name = Path::new(file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");
    println!("� EDB 파일 복호화 시작: {}", file_name);
    
    // 파일 존재 확인
    if !Path::new(file_path).exists() {
        return Err(KakaoError::FileNotFound(format!("파일을 찾을 수 없습니다: {}", file_path)));
    }
    
    // 파일 크기 확인
    let file_size = fs::metadata(file_path)
        .map_err(|e| KakaoError::IoError(e))?
        .len();
    
    if file_size == 0 {
        return Err(KakaoError::DecryptionError("파일이 비어있습니다".to_string()));
    }
    
    // 1. 시스템 정보 가져오기 (레지스트리 값만 출력됨)
    let system_info = get_kakao_system_info()?;
    
    // 2. pragma 생성
    let pragma = generate_pragma(&system_info)?;
    
    // 3. key/IV 생성
    let (key, iv) = generate_key_iv(&pragma, user_id)?;
    
    // 4. EDB 파일 복호화
    let decrypted_data = decrypt_edb_file(file_path, &key, &iv)?;
      // 5. SQLite 헤더 검증 및 메시지 읽기
    if validate_sqlite_header(&decrypted_data) {
        println!("✅ SQLite 헤더 검증 성공!");
        
        // 6. 메시지 데이터 읽기
        let messages = read_messages_from_decrypted_data(&decrypted_data)?;
        println!("🎉 복호화 완료! {} bytes, 메시지 {}개", decrypted_data.len(), messages.len());
        
        Ok(messages)
    } else {
        println!("⚠️ 복호화되었지만 SQLite 헤더가 올바르지 않을 수 있습니다");
        println!("   하드코딩된 키가 정확하지 않을 가능성이 높습니다");
        
        // 실패해도 빈 메시지 배열 반환
        Ok(Vec::new())
    }
}

/// 복호화된 데이터가 유효한 SQLite 파일인지 확인
fn validate_sqlite_header(data: &[u8]) -> bool {
    if data.len() < 16 {
        return false;
    }
    // SQLite magic header: "SQLite format 3\0"
    let sqlite_magic = b"SQLite format 3\0";
    &data[0..16] == sqlite_magic
}

/// 간단한 AES-128-CBC 암호화 (표준 PKCS#7 패딩)
fn encrypt_aes_cbc_simple(key: &[u8; 16], iv: &[u8; 16], data: &[u8]) -> Result<Vec<u8>, KakaoError> {
    use aes::cipher::{BlockEncrypt, generic_array::GenericArray};
    
    // 표준 PKCS#7 패딩 추가
    let mut padded_data = data.to_vec();
    let padding_len = 16 - (data.len() % 16);
    
    // 패딩 길이만큼 패딩 값 추가 (표준 PKCS#7)
    for _ in 0..padding_len {
        padded_data.push(padding_len as u8);
    }
    
    let cipher = Aes128::new(GenericArray::from_slice(key));
    let mut encrypted = Vec::new();
    let mut prev_block = *iv;
    
    for chunk in padded_data.chunks(16) {
        let mut block = [0u8; 16];
        block.copy_from_slice(chunk);
        
        // XOR with previous block (CBC mode)
        for i in 0..16 {
            block[i] ^= prev_block[i];
        }
        
        let mut block_array = GenericArray::from(block);
        cipher.encrypt_block(&mut block_array);
        
        encrypted.extend_from_slice(&block_array);
        prev_block = block_array.into();
    }
    
    Ok(encrypted)
}

/// 복호화된 SQLite 데이터에서 메시지 읽기
pub fn read_messages_from_decrypted_data(decrypted_data: &[u8]) -> Result<Vec<KakaoMessage>, KakaoError> {
    // 임시 파일에 복호화된 데이터 저장
    let temp_file = std::env::temp_dir().join("temp_kakao.db");
    std::fs::write(&temp_file, decrypted_data)
        .map_err(|e| KakaoError::DecryptionError(format!("임시 파일 쓰기 실패: {}", e)))?;
    
    // SQLite 연결
    let conn = Connection::open(&temp_file)
        .map_err(|e| KakaoError::DecryptionError(format!("SQLite 연결 실패: {}", e)))?;
    
    let mut messages = Vec::new();
    
    // 메시지 쿼리 (테이블 구조에 따라 조정 필요)
    let mut stmt = conn.prepare("SELECT id, user_id, message, created_at, type FROM chat_logs ORDER BY created_at DESC LIMIT 100")
        .or_else(|_| conn.prepare("SELECT id, user_id, message, created_at, type FROM chatLogs ORDER BY created_at DESC LIMIT 100"))
        .or_else(|_| conn.prepare("SELECT rowid as id, '' as user_id, message, created_at, 0 as type FROM chat_logs ORDER BY created_at DESC LIMIT 100"))
        .map_err(|e| KakaoError::DecryptionError(format!("쿼리 준비 실패: {}", e)))?;
    
    let message_iter = stmt.query_map([], |row| {
        Ok(KakaoMessage {
            id: row.get(0).unwrap_or(0),
            user_id: row.get(1).unwrap_or_else(|_| "unknown".to_string()),
            message: row.get(2).unwrap_or_else(|_| "".to_string()),
            created_at: row.get(3).unwrap_or(0),
            message_type: row.get(4).unwrap_or(0),
        })
    }).map_err(|e| KakaoError::DecryptionError(format!("쿼리 실행 실패: {}", e)))?;
    
    for message in message_iter {
        if let Ok(msg) = message {
            messages.push(msg);
        }
    }
    
    // 임시 파일 정리
    let _ = std::fs::remove_file(&temp_file);
    
    println!("📊 메시지 {}개를 성공적으로 읽었습니다.", messages.len());
    
    Ok(messages)
}
