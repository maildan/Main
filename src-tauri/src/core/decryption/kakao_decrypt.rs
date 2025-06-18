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

// 하드코딩된 pragma 생성용 키 (실제 키는 리버싱으로 찾아야 함)
// 블로그에서 언급한 대로 실제 프로그램 분석을 통해 찾아야 할 값
const PRAGMA_HARDCODED_KEY: [u8; 16] = [
    0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0,
    0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88
];

/// 시스템 정보 구조체
#[derive(Debug)]
pub struct SystemInfo {
    pub uuid: String,
    pub model_name: String,
    pub serial_number: String,
}

/// 레지스트리에서 카카오톡이 저장한 시스템 정보 가져오기
/// 레지스트리에서 카카오톡이 저장한 시스템 정보 가져오기
pub fn get_kakao_system_info() -> Result<SystemInfo, KakaoError> {
    println!("🔍 레지스트리에서 카카오톡 시스템 정보 검색 중...");
    
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let device_info_key = hkcu
        .open_subkey("Software\\Kakao\\KakaoTalk\\DeviceInfo")
        .map_err(|e| {
            println!("❌ DeviceInfo 키 열기 실패: {}", e);
            KakaoError::DecryptionError(format!("DeviceInfo 접근 실패: {}", e))
        })?;

    println!("✅ DeviceInfo 키 열기 성공");

    // DeviceInfo 하위의 모든 키를 검색 (날짜 폴더 찾기)
    let mut found_values = None;
    for subkey_name in device_info_key.enum_keys() {
        if let Ok(subkey_name) = subkey_name {
            println!("🔍 하위 키 발견: {}", subkey_name);
            
            if let Ok(subkey) = device_info_key.open_subkey(&subkey_name) {
                // 각 하위 키에서 필요한 값들을 찾아보기
                if let (Ok(uuid), Ok(model_name), Ok(serial_number)) = (
                    subkey.get_value::<String, _>("sys_uuid"),
                    subkey.get_value::<String, _>("hdd_model"),
                    subkey.get_value::<String, _>("hdd_serial")
                ) {
                    println!("✅ 시스템 정보를 {}에서 발견!", subkey_name);
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
        println!("   DeviceInfo 하위에 날짜 폴더가 있는지 확인하세요.");
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
    );
    
    println!("🔧 시스템 정보 연접 결과:");
    println!("   📝 Combined string: {}", combined);
    println!("   📏 Length: {} bytes", combined.len());
    
    // AES-128-CBC 암호화 (IV는 0으로 초기화)
    let iv = [0u8; 16];
    println!("🔐 AES-128-CBC 암호화 진행 중...");
    println!("   🗝️ 하드코딩된 키 사용 (실제로는 리버싱으로 찾은 키 필요)");
    println!("   🔒 IV: {:?}", hex::encode(&iv));
    
    let encrypted = encrypt_aes_cbc_simple(&PRAGMA_HARDCODED_KEY, &iv, combined.as_bytes())?;
    println!("   ✅ AES 암호화 완료: {} bytes", encrypted.len());
    
    // Base64 인코딩
    let base64_encrypted = general_purpose::STANDARD.encode(&encrypted);
    println!("📦 Base64 인코딩 완료: {} chars", base64_encrypted.len());
    
    // SHA512 해싱
    let mut hasher = Sha512::new();
    Sha2Digest::update(&mut hasher, base64_encrypted.as_bytes());
    let hashed = Sha2Digest::finalize(hasher);
    println!("🔨 SHA512 해싱 완료: {} bytes", hashed.len());
    
    // 최종 Base64 인코딩
    let final_pragma = general_purpose::STANDARD.encode(&hashed);
    
    println!("🔑 최종 Pragma 생성 완료:");
    println!("   📋 Pragma: {}", final_pragma);
    println!("   📏 Length: {} chars", final_pragma.len());
    
    Ok(final_pragma)
}

/// key와 IV 생성 (블로그 방식)
pub fn generate_key_iv(pragma: &str, user_id: &str) -> Result<([u8; 16], [u8; 16]), KakaoError> {
    // pragma + userID 연접
    let combined = format!("{}{}", pragma, user_id);
    let mut key_material = combined.as_bytes().to_vec();
    
    // 512바이트가 될 때까지 반복
    while key_material.len() < 512 {
        let current_len = key_material.len();
        let mut temp = key_material.clone();
        temp.truncate(512 - current_len);
        key_material.extend_from_slice(&temp);
    }
    key_material.truncate(512);
      // MD5로 key 생성
    let key_hash = md5::compute(&key_material);
    let key: [u8; 16] = key_hash.0;
    
    // key를 Base64 인코딩 후 MD5로 IV 생성
    let key_base64 = general_purpose::STANDARD.encode(&key);
    let iv_hash = md5::compute(key_base64.as_bytes());
    let iv: [u8; 16] = iv_hash.0;
    
    println!("🔑 Generated key: {:?}", hex::encode(&key));
    println!("🔑 Generated IV: {:?}", hex::encode(&iv));    
    Ok((key, iv))
}

/// EDB 파일 복호화 (4096바이트 단위)
pub fn decrypt_edb_file(file_path: &str, key: &[u8; 16], iv: &[u8; 16]) -> Result<Vec<u8>, KakaoError> {let encrypted_data = fs::read(file_path)
        .map_err(|e| KakaoError::DecryptionError(format!("파일 읽기 실패: {}", e)))?;
    
    let mut decrypted_data = Vec::new();
    let cipher = Aes128::new(GenericArray::from_slice(key));
    
    // 4096바이트 단위로 복호화
    for chunk in encrypted_data.chunks(4096) {
        let mut chunk_data = chunk.to_vec();
        
        // 4096바이트가 안 되면 패딩
        while chunk_data.len() % 16 != 0 {
            chunk_data.push(0);
        }
        
        let mut current_iv = *iv;
        
        for block in chunk_data.chunks(16) {
            let mut block_array = GenericArray::clone_from_slice(block);
            cipher.decrypt_block(&mut block_array);
            
            // XOR with IV/previous block (CBC mode)
            for i in 0..16 {
                block_array[i] ^= current_iv[i];
            }
            
            decrypted_data.extend_from_slice(&block_array);
            current_iv.copy_from_slice(block);
        }
    }
    
    println!("🎉 EDB 파일 복호화 완료! 크기: {} bytes", decrypted_data.len());
    Ok(decrypted_data)
}

/// 전체 복호화 프로세스 (블로그 방식만 사용)
pub fn decrypt_kakao_edb_full(file_path: &str, user_id: &str) -> Result<Vec<u8>, KakaoError> {
    println!("🚀 카카오톡 EDB 복호화 시작!");
    
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
    
    println!("📁 파일 크기: {} bytes", file_size);
    
    // 1. 시스템 정보 가져오기
    let system_info = get_kakao_system_info()?;
    println!("✅ 시스템 정보 수집 완료");
    
    // 2. pragma 생성
    let pragma = generate_pragma(&system_info)?;
    println!("✅ Pragma 생성 완료");
    
    // 3. key/IV 생성
    let (key, iv) = generate_key_iv(&pragma, user_id)?;
    println!("✅ Key/IV 생성 완료");
    
    // 4. EDB 파일 복호화
    let decrypted_data = decrypt_edb_file(file_path, &key, &iv)?;
    
    // 5. SQLite 헤더 검증
    if validate_sqlite_header(&decrypted_data) {
        println!("🎉 복호화 완료! SQLite 헤더 검증 성공!");
    } else {
        println!("⚠️ 복호화되었지만 SQLite 헤더가 올바르지 않을 수 있습니다");
        println!("   하드코딩된 키가 정확하지 않을 가능성이 높습니다");
    }
    
    Ok(decrypted_data)
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

/// 간단한 AES-128-CBC 암호화 (PKCS#7 패딩)
fn encrypt_aes_cbc_simple(key: &[u8; 16], iv: &[u8; 16], data: &[u8]) -> Result<Vec<u8>, KakaoError> {
    use aes::cipher::{BlockEncrypt, generic_array::GenericArray};
    
    // PKCS#7 패딩 추가
    let mut padded_data = data.to_vec();
    let padding_len = 16 - (data.len() % 16);
    let actual_padding = if padding_len == 16 { 16 } else { padding_len };
    
    for _ in 0..actual_padding {
        padded_data.push(actual_padding as u8);
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
