/**
 * 로깅 유틸리티
 * 
 * 네이티브 모듈 래퍼용 구조화된 로깅 기능을 제공합니다.
 * 개발 및 프로덕션 환경에서 다르게 동작합니다.
 */

const fs = require('fs');
const path = require('path');

// 로그 레벨 정의
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// 현재 로그 레벨 설정
const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LOG_LEVELS.INFO
  : LOG_LEVELS.DEBUG;

// 로그 디렉토리 설정
const LOG_DIR = path.join(process.cwd(), 'logs');

// 로그 파일 순환 설정
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_LOG_FILES = 5;

/**
 * 로그 디렉토리 생성
 */
function ensureLogDirectory() {
  if (!fs.existsSync(LOG_DIR)) {
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    } catch (error) {
      console.error(`로그 디렉토리 생성 실패: ${error.message}`);
    }
  }
}

/**
 * 로그 파일 순환 처리
 * @param {string} logFile 로그 파일 경로
 */
function rotateLogFileIfNeeded(logFile) {
  try {
    if (!fs.existsSync(logFile)) return;
    
    const stats = fs.statSync(logFile);
    if (stats.size < MAX_LOG_SIZE) return;
    
    // 기존 로그 파일 이름 변경
    for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
      const oldFile = `${logFile}.${i - 1}`;
      const newFile = `${logFile}.${i}`;
      
      if (fs.existsSync(oldFile)) {
        if (fs.existsSync(newFile)) {
          fs.unlinkSync(newFile);
        }
        fs.renameSync(oldFile, newFile);
      }
    }
    
    // 현재 로그 파일 백업
    const backupFile = `${logFile}.0`;
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
    }
    fs.renameSync(logFile, backupFile);
    
  } catch (error) {
    console.error(`로그 파일 순환 처리 실패: ${error.message}`);
  }
}

/**
 * 로그 메시지 포맷팅
 * @param {string} level 로그 레벨
 * @param {string} namespace 네임스페이스
 * @param {string} message 메시지
 * @param {Object} data 추가 데이터
 * @returns {string} 포맷팅된 로그 메시지
 */
function formatLogMessage(level, namespace, message, data = null) {
  const timestamp = new Date().toISOString();
  const logData = data ? JSON.stringify(data) : '';
  
  return `[${timestamp}][${level}][${namespace}] ${message} ${logData}\n`;
}

/**
 * 로거 생성
 * @param {string} namespace 로거 네임스페이스
 * @returns {Object} 로거 객체
 */
function createLogger(namespace) {
  const logFile = path.join(LOG_DIR, 'native-module.log');
  
  // 로그 디렉토리 확인
  ensureLogDirectory();
  
  // 로그 파일 순환 처리
  rotateLogFileIfNeeded(logFile);
  
  /**
   * 로그 메시지 기록
   * @param {string} level 로그 레벨
   * @param {string} message 메시지
   * @param {Object} data 추가 데이터
   */
  function writeLog(level, levelName, message, data = null) {
    if (level < CURRENT_LOG_LEVEL) return;
    
    const logMessage = formatLogMessage(levelName, namespace, message, data);
    
    // 콘솔에 출력
    if (process.env.NODE_ENV !== 'production' || level >= LOG_LEVELS.WARN) {
      if (level === LOG_LEVELS.ERROR) {
        console.error(logMessage.trim());
      } else if (level === LOG_LEVELS.WARN) {
        console.warn(logMessage.trim());
      } else {
        console.log(logMessage.trim());
      }
    }
    
    // 파일에 기록
    try {
      fs.appendFileSync(logFile, logMessage);
    } catch (error) {
      console.error(`로그 파일 쓰기 실패: ${error.message}`);
    }
  }
  
  return {
    debug: (message, data) => writeLog(LOG_LEVELS.DEBUG, 'DEBUG', message, data),
    info: (message, data) => writeLog(LOG_LEVELS.INFO, 'INFO', message, data),
    warn: (message, data) => writeLog(LOG_LEVELS.WARN, 'WARN', message, data),
    error: (message, data) => writeLog(LOG_LEVELS.ERROR, 'ERROR', message, data)
  };
}

module.exports = {
  createLogger,
  LOG_LEVELS
};
