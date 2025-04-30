/**
 * 안전한 데이터 저장 모듈
 *
 * Electron 앱에서 민감한 데이터를 암호화하여 안전하게 저장하는 기능을 제공합니다.
 */

const { safeStorage, app } = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 암호화된 데이터 저장 기본 디렉토리
const STORAGE_DIR = path.join(app.getPath('userData'), 'secure-storage');
// 암호화 알고리즘
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
// 암호화 키 파일 이름
const KEY_FILE = 'secure-key';

// 내부 암호화 키 (메모리에만 존재)
let encryptionKey = null;

/**
 * 스토리지 디렉토리 초기화
 * @returns {Promise<boolean>} 초기화 성공 여부
 */
async function initializeStorage() {
  try {
    // 스토리지 디렉토리가 없으면 생성
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }

    // safeStorage 사용 가능 여부 확인
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('시스템에서 안전한 저장소 암호화를 사용할 수 없습니다.');
    }

    // 암호화 키 로드 또는 생성
    await loadOrCreateEncryptionKey();

    return true;
  } catch (error) {
    console.error('안전한 저장소 초기화 오류:', error);
    return false;
  }
}

/**
 * 암호화 키 로드 또는 생성
 * @returns {Promise<Buffer>} 암호화 키
 */
async function loadOrCreateEncryptionKey() {
  const keyFilePath = path.join(STORAGE_DIR, KEY_FILE);

  try {
    if (fs.existsSync(keyFilePath)) {
      // 기존 키 파일이 있으면 로드
      const encryptedKey = fs.readFileSync(keyFilePath);
      encryptionKey = safeStorage.decryptString(encryptedKey);
    } else {
      // 새 키 생성 (32바이트 = 256비트)
      encryptionKey = crypto.randomBytes(32).toString('hex');

      // 암호화하여 저장
      const encryptedKey = safeStorage.encryptString(encryptionKey);
      fs.writeFileSync(keyFilePath, encryptedKey);
    }

    return encryptionKey;
  } catch (error) {
    console.error('암호화 키 로드/생성 오류:', error);
    throw error;
  }
}

/**
 * 데이터 암호화
 * @param {string|object} data 암호화할 데이터 (문자열 또는 객체)
 * @returns {Buffer} 암호화된 데이터
 */
function encryptData(data) {
  if (!encryptionKey) {
    throw new Error('암호화 키가 초기화되지 않았습니다.');
  }

  try {
    // 객체인 경우 JSON 문자열로 변환
    const dataStr = typeof data === 'object' ? JSON.stringify(data) : String(data);

    // 초기화 벡터 생성 (16바이트)
    const iv = crypto.randomBytes(16);

    // 암호화
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(encryptionKey, 'hex'),
      iv
    );

    let encrypted = cipher.update(dataStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 인증 태그 가져오기
    const authTag = cipher.getAuthTag();

    // IV + 암호화된 데이터 + 인증 태그 결합
    const result = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);

    return result;
  } catch (error) {
    console.error('데이터 암호화 오류:', error);
    throw error;
  }
}

/**
 * 데이터 복호화
 * @param {Buffer} encryptedData 암호화된 데이터
 * @param {boolean} parseJson JSON으로 파싱할지 여부
 * @returns {string|object} 복호화된 데이터
 */
function decryptData(encryptedData, parseJson = false) {
  if (!encryptionKey) {
    throw new Error('암호화 키가 초기화되지 않았습니다.');
  }

  try {
    // IV 추출 (처음 16바이트)
    const iv = encryptedData.slice(0, 16);

    // 인증 태그 추출 (마지막 16바이트)
    const authTag = encryptedData.slice(encryptedData.length - 16);

    // 암호화된 데이터 추출 (중간 부분)
    const encryptedContent = encryptedData.slice(16, encryptedData.length - 16);

    // 복호화
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(encryptionKey, 'hex'),
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedContent.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // JSON 파싱이 필요한 경우
    if (parseJson) {
      return JSON.parse(decrypted);
    }

    return decrypted;
  } catch (error) {
    console.error('데이터 복호화 오류:', error);
    throw error;
  }
}

/**
 * 데이터 안전하게 저장
 * @param {string} key 저장 키
 * @param {string|object} data 저장할 데이터
 * @returns {Promise<boolean>} 저장 성공 여부
 */
async function storeSecureData(key, data) {
  if (!key || typeof key !== 'string') {
    throw new Error('유효한 키가 필요합니다.');
  }

  try {
    // 키 이름에서 안전하지 않은 문자 제거
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(STORAGE_DIR, `${safeKey}.secure`);

    // 데이터 암호화
    const encryptedData = encryptData(data);

    // 파일에 저장
    fs.writeFileSync(filePath, encryptedData);

    return true;
  } catch (error) {
    console.error(`데이터 저장 오류 (${key}):`, error);
    return false;
  }
}

/**
 * 안전하게 저장된 데이터 로드
 * @param {string} key 로드할 데이터의 키
 * @param {boolean} asJson JSON으로 파싱할지 여부
 * @returns {Promise<any|null>} 로드된 데이터 또는 null
 */
async function loadSecureData(key, asJson = true) {
  if (!key || typeof key !== 'string') {
    throw new Error('유효한 키가 필요합니다.');
  }

  try {
    // 키 이름에서 안전하지 않은 문자 제거
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(STORAGE_DIR, `${safeKey}.secure`);

    // 파일이 존재하는지 확인
    if (!fs.existsSync(filePath)) {
      return null;
    }

    // 암호화된 데이터 읽기
    const encryptedData = fs.readFileSync(filePath);

    // 복호화
    return decryptData(encryptedData, asJson);
  } catch (error) {
    console.error(`데이터 로드 오류 (${key}):`, error);
    return null;
  }
}

/**
 * 안전하게 저장된 데이터 삭제
 * @param {string} key 삭제할 데이터의 키
 * @returns {Promise<boolean>} 삭제 성공 여부
 */
async function deleteSecureData(key) {
  if (!key || typeof key !== 'string') {
    throw new Error('유효한 키가 필요합니다.');
  }

  try {
    // 키 이름에서 안전하지 않은 문자 제거
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(STORAGE_DIR, `${safeKey}.secure`);

    // 파일이 존재하는지 확인
    if (!fs.existsSync(filePath)) {
      return true; // 이미 존재하지 않음
    }

    // 파일 삭제
    fs.unlinkSync(filePath);

    return true;
  } catch (error) {
    console.error(`데이터 삭제 오류 (${key}):`, error);
    return false;
  }
}

/**
 * 모든 저장된 데이터 키 목록 가져오기
 * @returns {Promise<string[]>} 키 목록
 */
async function listSecureDataKeys() {
  try {
    // 디렉토리가 없으면 빈 배열 반환
    if (!fs.existsSync(STORAGE_DIR)) {
      return [];
    }

    // 디렉토리 내 파일 목록 가져오기
    const files = fs.readdirSync(STORAGE_DIR);

    // .secure 확장자를 가진 파일만 필터링하고 확장자 제거
    return files.filter(file => file.endsWith('.secure')).map(file => file.replace('.secure', ''));
  } catch (error) {
    console.error('데이터 키 목록 가져오기 오류:', error);
    return [];
  }
}

module.exports = {
  initializeStorage,
  storeSecureData,
  loadSecureData,
  deleteSecureData,
  listSecureDataKeys,
};
