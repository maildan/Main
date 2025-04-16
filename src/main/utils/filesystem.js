const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// fs 함수들의 Promise 버전 생성
const fsAccess = promisify(fs.access);
const fsMkdir = promisify(fs.mkdir);
const fsReadFile = promisify(fs.readFile);
const fsWriteFile = promisify(fs.writeFile);
const fsReaddir = promisify(fs.readdir);
const fsStat = promisify(fs.stat);
const fsExists = async (path) => {
  try {
    await fsAccess(path);
    return true;
  } catch {
    return false;
  }
};

/**
 * 디렉토리가 존재하는지 확인하고 없으면 생성
 * @param {string} dirPath - 확인할 디렉토리 경로
 * @returns {Promise<boolean>} 디렉토리 존재 여부
 */
async function ensureDirectoryExists(dirPath) {
  try {
    // 경로가 이미 존재하는지 확인
    const exists = await fsExists(dirPath);
    
    if (exists) {
      // 이미 존재하면 디렉토리인지 확인
      const stats = await fsStat(dirPath);
      if (stats.isDirectory()) {
        return true;
      }
      throw new Error(`${dirPath}는 디렉토리가 아닙니다`);
    }
    
    // 디렉토리 생성 (중첩 경로도 생성)
    await fsMkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    console.error(`디렉토리 생성 오류 (${dirPath}):`, error);
    throw error;
  }
}

/**
 * 파일을 안전하게 읽기
 * @param {string} filePath - 파일 경로
 * @param {string} [encoding='utf8'] - 파일 인코딩
 * @returns {Promise<string|Buffer>} 파일 내용
 */
async function safeReadFile(filePath, encoding = 'utf8') {
  try {
    const exists = await fsExists(filePath);
    if (!exists) {
      return null;
    }
    
    return await fsReadFile(filePath, encoding);
  } catch (error) {
    console.error(`파일 읽기 오류 (${filePath}):`, error);
    return null;
  }
}

/**
 * 파일을 안전하게 쓰기 (디렉토리가 없으면 생성)
 * @param {string} filePath - 파일 경로
 * @param {string|Buffer} data - 파일에 쓸 데이터
 * @param {string} [encoding='utf8'] - 파일 인코딩
 * @returns {Promise<boolean>} 성공 여부
 */
async function safeWriteFile(filePath, data, encoding = 'utf8') {
  try {
    // 디렉토리 존재 확인 및 생성
    const dirPath = path.dirname(filePath);
    await ensureDirectoryExists(dirPath);
    
    // 파일 쓰기
    await fsWriteFile(filePath, data, encoding);
    return true;
  } catch (error) {
    console.error(`파일 쓰기 오류 (${filePath}):`, error);
    return false;
  }
}

/**
 * 특정 확장자를 가진 파일 목록 가져오기
 * @param {string} dirPath - 디렉토리 경로
 * @param {string[]} extensions - 확장자 배열 (예: ['.txt', '.md'])
 * @returns {Promise<string[]>} 파일 경로 배열
 */
async function getFilesByExtension(dirPath, extensions) {
  try {
    const exists = await fsExists(dirPath);
    if (!exists) {
      return [];
    }
    
    const files = await fsReaddir(dirPath);
    const result = [];
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await fsStat(filePath);
      
      if (stats.isDirectory()) {
        // 재귀적으로 하위 디렉토리 검색
        const subFiles = await getFilesByExtension(filePath, extensions);
        result.push(...subFiles);
      } else if (extensions.includes(path.extname(file).toLowerCase())) {
        // 확장자가 일치하는 파일만 추가
        result.push(filePath);
      }
    }
    
    return result;
  } catch (error) {
    console.error(`파일 검색 오류 (${dirPath}):`, error);
    return [];
  }
}

module.exports = {
  ensureDirectoryExists,
  safeReadFile,
  safeWriteFile,
  getFilesByExtension,
  fsExists
}; 