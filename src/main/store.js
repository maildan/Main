/**
 * 애플리케이션 설정 저장소 모듈
 *
 * 앱 설정의 영구 저장, 로드, 동기화 및 관리를 담당합니다.
 * 기본 설정 제공 및 설정 변경 이벤트 처리 기능 포함.
 */

const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const { debugLog } = require('./utils');

// electron-store 모듈 가져오기 시도 (여러 가져오기 방식 지원)
let Store;
try {
  // CommonJS 방식으로 가져오기 시도
  const StoreModule = require('electron-store');

  // electron-store가 다양한 형태로 export될 수 있으므로 모든 경우 처리
  if (typeof StoreModule === 'function') {
    // 직접 함수로 export된 경우
    Store = StoreModule;
    debugLog('electron-store를 함수로 로드했습니다.');
  } else if (StoreModule.default && typeof StoreModule.default === 'function') {
    // ESM 모듈처럼 default로 export된 경우
    Store = StoreModule.default;
    debugLog('electron-store를 default export로 로드했습니다.');
  } else {
    throw new Error('electron-store 모듈이 예상된 형식이 아닙니다.');
  }
} catch (error) {
  debugLog('electron-store 로드 실패:', error);
  // 폴백: 메모리 기반 스토어 구현
  const MemoryStore = require('./memory-store');
  Store = MemoryStore;
  debugLog('메모리 스토어로 폴백합니다.');
}

/**
 * 기본 저장소 설정
 */
const defaultConfig = {
  name: 'loop-settings',
  cwd: app.getPath('userData'),
  clearInvalidConfig: true,
  fileExtension: 'json',
  serialize: (value) => JSON.stringify(value, null, 2),
  deserialize: (value) => JSON.parse(value),
};

/**
 * 기본 설정값
 */
const defaultSettings = {
  theme: 'system',
    language: 'ko',
  notifications: {
    enabled: true,
    sound: true,
  },
  update: {
    autoCheck: true,
    autoInstall: false,
  },
  performance: {
    hardwareAcceleration: true,
    memoryOptimization: true,
  },
  privacy: {
    collectStats: false,
    crashReports: true,
  },
  storage: {
    maxCacheSize: 500, // MB
    autoCleanup: true,
  },
};

// 스토어 인스턴스
let storeInstance;

/**
 * 설정 저장소 인스턴스 가져오기
 * @returns {object} 설정 저장소 인스턴스
 */
function getStore() {
  if (!storeInstance) {
    try {
      storeInstance = new Store({
        ...defaultConfig,
      defaults: defaultSettings,
      });
      debugLog('설정 저장소 인스턴스 생성됨');
  } catch (error) {
      debugLog('설정 저장소 생성 실패:', error);

      // 오류 발생 시 메모리 저장소로 폴백
      const MemoryStore = require('./memory-store');
      storeInstance = new MemoryStore({
        defaults: defaultSettings,
      });
      debugLog('메모리 저장소로 폴백됨');
    }
  }
    return storeInstance;
}

/**
 * 설정 가져오기
 * @param {string} key 가져올 설정 키
 * @param {*} defaultValue 기본값
 * @returns {*} 설정값
 */
function getSetting(key, defaultValue) {
  const store = getStore();
  try {
    return store.get(key, defaultValue);
  } catch (error) {
    debugLog(`설정 ${key} 가져오기 실패:`, error);
    return defaultValue;
  }
}

/**
 * 설정 저장하기
 * @param {string|object} keyOrObject 설정 키 또는 설정 객체
 * @param {*} value 설정값 (키가 문자열인 경우)
 */
function setSetting(keyOrObject, value) {
  const store = getStore();
  try {
    store.set(keyOrObject, value);
    return true;
    } catch (error) {
    debugLog('설정 저장 실패:', error);
    return false;
  }
}

/**
 * 설정 지우기
 * @param {string} key 지울 설정 키
 */
function deleteSetting(key) {
  const store = getStore();
  try {
    store.delete(key);
    return true;
  } catch (error) {
    debugLog(`설정 ${key} 삭제 실패:`, error);
    return false;
  }
}

/**
 * 모든 설정 가져오기
 * @returns {object} 모든 설정
 */
function getAllSettings() {
  const store = getStore();
  try {
    return store.store;
  } catch (error) {
    debugLog('모든 설정 가져오기 실패:', error);
    return { ...defaultSettings };
  }
}

/**
 * 설정 초기화
 */
function resetSettings() {
  const store = getStore();
  try {
    store.clear();
    store.set(defaultSettings);
    return true;
  } catch (error) {
    debugLog('설정 초기화 실패:', error);
    return false;
  }
}

/**
 * 저장소 자원 해제
 */
function disposeStore() {
  storeInstance = null;
  debugLog('설정 저장소 자원 해제됨');
}

// 모듈 내보내기
const storeModule = {
  get: getSetting,
  set: setSetting,
  delete: deleteSetting,
  getAll: getAllSettings,
  reset: resetSettings,
  dispose: disposeStore,
};

// default export와 named exports 모두 지원
module.exports = storeModule;
module.exports.default = storeModule;
