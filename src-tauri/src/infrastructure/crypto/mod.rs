use aes::cipher::{BlockDecryptMut, KeyIvInit};
use aes::{Aes128};
use cbc::{Decryptor};
use generic_array::{GenericArray};

type Aes128CbcDec = Decryptor<Aes128>;

/// AES-CBC 복호화
pub fn decrypt_aes_cbc(data: &[u8], key: &[u8], iv: &[u8]) -> Result<Vec<u8>, String> {
    if key.len() != 16 || iv.len() != 16 {
        return Err("키와 IV는 16바이트여야 합니다".to_string());
    }
    
    if data.len() % 16 != 0 {
        return Err("데이터 길이가 16바이트의 배수가 아닙니다".to_string());
    }
    
    let key_array = GenericArray::from_slice(key);
    let iv_array = GenericArray::from_slice(iv);
    
    let mut cipher = Aes128CbcDec::new(key_array, iv_array);
    
    let mut decrypted = data.to_vec();
    
    // 블록 단위로 복호화
    for chunk in decrypted.chunks_exact_mut(16) {
        let block = GenericArray::from_mut_slice(chunk);
        cipher.decrypt_block_mut(block);
    }
    
    // PKCS7 패딩 제거
    if let Some(&padding_len) = decrypted.last() {
        if padding_len > 0 && padding_len <= 16 {
            let data_len = decrypted.len() - padding_len as usize;
            decrypted.truncate(data_len);
        }
    }
    
    Ok(decrypted)
}
