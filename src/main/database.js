/**
 * SQLite 데이터베이스 관리 모듈
 * 메모리 최적화: 히스토리 데이터를 메모리 대신 디스크에 저장
 */
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const BetterSqlite3 = require('better-sqlite3');
const { debugLog } = require('./utils');

// 데이터베이스 파일 경로
const dbPath = path.join(
  app.getPath('userData'),
  'typing-stats-database.sqlite'
);

// 데이터베이스 연결
let db = null;

/**
 * 데이터베이스 초기화 및 테이블 생성
 */
function initializeDatabase() {
  try {
    // 데이터베이스 디렉토리 확인
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 데이터베이스 연결
    db = new BetterSqlite3(dbPath, { 
      verbose: process.env.NODE_ENV === 'development' ? console.log : null 
    });
    
    // WAL 모드 활성화 (성능 향상)
    db.pragma('journal_mode = WAL');
    
    // 캐시 크기 제한 (메모리 사용 제한)
    db.pragma('cache_size = -2000'); // 약 2MB 캐시 크기
    
    // 테이블 생성
    db.exec(`
      CREATE TABLE IF NOT EXISTS typing_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        key_count INTEGER,
        typing_time INTEGER,
        window_title TEXT,
        browser_name TEXT,
        total_chars INTEGER,
        total_words INTEGER,
        pages REAL,
        accuracy REAL,
        timestamp TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      
      -- 인덱스 생성
      CREATE INDEX IF NOT EXISTS idx_typing_stats_timestamp ON typing_stats(timestamp);
    `);
    
    debugLog('데이터베이스 초기화 완료');
    return true;
  } catch (error) {
    console.error('데이터베이스 초기화 오류:', error);
    return false;
  }
}

/**
 * 통계 데이터 저장
 * @param {Object} stats - 저장할 통계 데이터
 * @returns {Object|null} 저장된 데이터 ID 또는 null
 */
function saveStats(stats) {
  if (!db) {
    initializeDatabase();
  }
  
  try {
    const stmt = db.prepare(`
      INSERT INTO typing_stats 
      (content, key_count, typing_time, window_title, browser_name, 
       total_chars, total_words, pages, accuracy, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      stats.content,
      stats.keyCount,
      stats.typingTime,
      stats.windowTitle || null,
      stats.browserName || null,
      stats.totalChars || 0,
      stats.totalWords || 0,
      stats.pages || 0,
      stats.accuracy || 100,
      stats.timestamp
    );
    
    debugLog(`통계 데이터 저장 완료: ID=${info.lastInsertRowid}`);
    
    // 저장 완료 후 최근 기록 조회
    const savedStats = getStatById(info.lastInsertRowid);
    return savedStats;
  } catch (error) {
    console.error('통계 데이터 저장 오류:', error);
    return null;
  }
}

/**
 * ID로 통계 기록 조회
 * @param {number} id - 통계 기록 ID
 * @returns {Object|null} 조회된 기록 또는 null
 */
function getStatById(id) {
  if (!db) {
    initializeDatabase();
  }
  
  try {
    const stmt = db.prepare('SELECT * FROM typing_stats WHERE id = ?');
    return stmt.get(id);
  } catch (error) {
    console.error('통계 기록 조회 오류:', error);
    return null;
  }
}

/**
 * 모든 통계 기록 조회
 * @param {number} limit - 조회할 최대 기록 수
 * @param {number} offset - 조회 시작 위치
 * @returns {Array} 조회된 기록 배열
 */
function getAllStats(limit = 50, offset = 0) {
  if (!db) {
    initializeDatabase();
  }
  
  try {
    const stmt = db.prepare(
      'SELECT * FROM typing_stats ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    );
    return stmt.all(limit, offset);
  } catch (error) {
    console.error('통계 기록 조회 오류:', error);
    return [];
  }
}

/**
 * 기간별 통계 요약 조회 (메모리 효율을 위한 그룹화)
 * @param {string} period - day, week, month 중 하나
 * @param {number} limit - 조회할 최대 기록 수
 * @returns {Array} 조회된 기록 배열
 */
function getStatsSummaryByPeriod(period = 'day', limit = 7) {
  if (!db) {
    initializeDatabase();
  }
  
  try {
    let timeFormat;
    
    // SQLite의 날짜 함수를 사용하여 기간별 그룹화
    switch(period) {
      case 'day':
        timeFormat = '%Y-%m-%d';
        break;
      case 'week':
        timeFormat = '%Y-%W';
        break;
      case 'month':
        timeFormat = '%Y-%m';
        break;
      default:
        timeFormat = '%Y-%m-%d';
    }
    
    const stmt = db.prepare(`
      SELECT 
        strftime('${timeFormat}', timestamp) as period,
        SUM(key_count) as total_key_count,
        SUM(typing_time) as total_typing_time,
        SUM(total_chars) as total_chars,
        SUM(total_words) as total_words,
        AVG(accuracy) as avg_accuracy
      FROM typing_stats
      GROUP BY period
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    return stmt.all(limit);
  } catch (error) {
    console.error('기간별 통계 조회 오류:', error);
    return [];
  }
}

/**
 * 설정 저장
 * @param {string} key - 설정 키
 * @param {any} value - 설정 값 (객체는 JSON으로 변환)
 * @returns {boolean} 성공 여부
 */
function saveSetting(key, value) {
  if (!db) {
    initializeDatabase();
  }
  
  try {
    // 객체나 배열은 JSON 문자열로 변환
    const stringValue = typeof value === 'object' 
      ? JSON.stringify(value)
      : String(value);
    
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)'
    );
    stmt.run(key, stringValue);
    
    return true;
  } catch (error) {
    console.error(`설정 저장 오류 (${key}):`, error);
    return false;
  }
}

/**
 * 설정 불러오기
 * @param {string} key - 설정 키
 * @param {any} defaultValue - 설정이 없을 경우 기본값
 * @returns {any} 설정 값 (JSON인 경우 파싱)
 */
function loadSetting(key, defaultValue = null) {
  if (!db) {
    initializeDatabase();
  }
  
  try {
    const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key);
    
    if (!result) {
      return defaultValue;
    }
    
    // JSON인지 확인하고 파싱 시도
    try {
      if (result.value.startsWith('{') || result.value.startsWith('[')) {
        return JSON.parse(result.value);
      }
    } catch (e) {
      // JSON 파싱 실패 시 원래 값 반환
    }
    
    return result.value;
  } catch (error) {
    console.error(`설정 불러오기 오류 (${key}):`, error);
    return defaultValue;
  }
}

/**
 * 데이터베이스 최적화 실행
 */
function optimizeDatabase() {
  if (!db) {
    return;
  }
  
  try {
    // 데이터베이스 공간 정리 (VACUUM)
    db.pragma('vacuum');
    
    // 인덱스 최적화
    db.pragma('optimize');
    
    debugLog('데이터베이스 최적화 완료');
    return true;
  } catch (error) {
    console.error('데이터베이스 최적화 오류:', error);
    return false;
  }
}

/**
 * 오래된 데이터 정리 (메모리 사용량 감소)
 * @param {number} days - 보관할 일수 (기본 30일)
 */
function cleanupOldData(days = 30) {
  if (!db) {
    initializeDatabase();
  }
  
  try {
    const stmt = db.prepare(`
      DELETE FROM typing_stats
      WHERE strftime('%s', 'now') - strftime('%s', timestamp) > ? * 86400
    `);
    
    const result = stmt.run(days);
    debugLog(`오래된 데이터 정리 완료: ${result.changes}개 삭제`);
    
    return true;
  } catch (error) {
    console.error('오래된 데이터 정리 오류:', error);
    return false;
  }
}

/**
 * 데이터베이스 연결 종료
 */
function closeDatabase() {
  if (db) {
    try {
      db.close();
      db = null;
      debugLog('데이터베이스 연결 종료');
    } catch (error) {
      console.error('데이터베이스 연결 종료 오류:', error);
    }
  }
}

/**
 * 모듈 내보내기
 */
module.exports = {
  initializeDatabase,
  saveStats,
  getStatById,
  getAllStats,
  getStatsSummaryByPeriod,
  saveSetting,
  loadSetting,
  optimizeDatabase,
  cleanupOldData,
  closeDatabase
};
