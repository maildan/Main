/**
 * 애플리케이션 설정 저장소 모듈
 *
 * 앱 설정의 영구 저장, 로드, 동기화 및 관리를 담당합니다.
 * 기본 설정 제공 및 설정 변경 이벤트 처리 기능 포함.
 */

const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const ElectronStore = require('electron-store');

// 저장소 인스턴스
let storeInstance = null;

// 기본 설정값
const defaultSettings = {
  general: {
    autoLaunch: true,
    minimizeToTray: true,
    closeToTray: true,
    checkUpdatesAutomatically: true,
    language: 'ko',
    theme: 'system',
  },
  display: {
    trayIcon: true,
    alwaysOnTop: false,
    startMinimized: false,
    animations: true,
    compactMode: false,
  },
  performance: {
    gpuAcceleration: true,
    memoryLimit: 2048, // MB 단위
    automaticMemoryOptimization: true,
    memoryOptimizationThreshold: 80, // 백분율
  },
  network: {
    proxyEnabled: false,
    proxyAddress: '',
    proxyPort: 8080,
    proxyUsername: '',
    proxyPassword: '',
  },
  analytics: {
    sendCrashReports: true,
    sendUsageData: true,
  },
  advanced: {
    developerMode: false,
    debugLogging: false,
    customFlags: [],
  },
};

// 이벤트 리스너 목록
const listeners = {
  change: [],
  error: [],
};

/**
 * 설정 저장소 초기화
 * @param {Object} options 저장소 초기화 옵션
 * @returns {ElectronStore} 저장소 인스턴스
 */
function initializeStore(options = {}) {
  if (storeInstance) {
    return storeInstance;
  }

  try {
    log.info('설정 저장소 초기화 시작');

    // 기본 옵션
    const defaultOptions = {
      name: 'settings',
      fileExtension: 'json',
      cwd: getStorePath(),
      clearInvalidConfig: true, // 손상된 설정 파일 복구
      defaults: defaultSettings,
    };

    // 사용자 지정 옵션 병합
    const storeOptions = { ...defaultOptions, ...options };

    // 저장 폴더 생성
    ensureStoreDirectory(storeOptions.cwd);

    // 저장소 인스턴스 생성
    storeInstance = new ElectronStore(storeOptions);

    // IPC 이벤트 설정
    setupIpcHandlers();

    // 설정 마이그레이션 처리
    migrateSettings();

    log.info('설정 저장소 초기화 완료');
    return storeInstance;
  } catch (error) {
    log.error('설정 저장소 초기화 오류:', error);

    // 폴백: 메모리 기반 저장소
    if (!storeInstance) {
      log.warn('메모리 기반 임시 저장소로 폴백');
      const MemoryStore = require('./memory-store');
      storeInstance = new MemoryStore(defaultSettings);
    }

    return storeInstance;
  }
}

/**
 * 설정 저장 경로 결정
 * @returns {string} 설정 저장 경로
 */
function getStorePath() {
  // 개발 환경일 경우 앱 디렉토리 내에 저장
  if (process.env.NODE_ENV === 'development') {
    return path.join(app.getAppPath(), 'storage');
  }

  // 프로덕션 환경일 경우 사용자 데이터 디렉토리에 저장
  return app.getPath('userData');
}

/**
 * 저장 디렉토리 존재 확인 및 생성
 * @param {string} dirPath 디렉토리 경로
 */
function ensureStoreDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      log.info(`설정 저장 디렉토리 생성: ${dirPath}`);
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (error) {
    log.error('설정 저장 디렉토리 생성 오류:', error);
  }
}

/**
 * IPC 핸들러 설정
 */
function setupIpcHandlers() {
  // 설정 가져오기
  ipcMain.handle('settings:get', (event, key, defaultValue) => {
    return getStore().get(key, defaultValue);
  });

  // 전체 설정 가져오기
  ipcMain.handle('settings:get-all', () => {
    return getStore().store;
  });

  // 설정 저장하기
  ipcMain.handle('settings:set', (event, key, value) => {
    getStore().set(key, value);
    return true;
  });

  // 설정 삭제하기
  ipcMain.handle('settings:delete', (event, key) => {
    return getStore().delete(key);
  });

  // 설정 초기화
  ipcMain.handle('settings:reset', (event, key) => {
    if (key) {
      // 특정 키만 초기화
      const defaultValue = key.split('.').reduce((obj, part) => {
        return obj ? obj[part] : undefined;
      }, defaultSettings);

      if (defaultValue !== undefined) {
        getStore().set(key, defaultValue);
      } else {
        getStore().delete(key);
      }
    } else {
      // 전체 초기화
      getStore().clear();
      getStore().set(defaultSettings);
    }

    return getStore().store;
  });
}

/**
 * 설정 마이그레이션 처리
 * 이전 버전 설정 구조에서 현재 구조로 변환
 */
function migrateSettings() {
  const store = getStore();
  const currentVersion = store.get('settingsVersion', 0);
  const targetVersion = 1; // 현재 설정 스키마 버전

  if (currentVersion < targetVersion) {
    log.info(`설정 마이그레이션 실행: v${currentVersion} -> v${targetVersion}`);

    try {
      // 버전 1 마이그레이션: 이전 형식에서 새 계층형 구조로 변환
      if (currentVersion < 1) {
        // 이전 설정에서 새 설정으로 마이그레이션
        const oldSettings = { ...store.store };

        // 특정 레거시 키 매핑
        const keyMappings = {
          autostart: 'general.autoLaunch',
          minimizeToTray: 'general.minimizeToTray',
          closeToTray: 'general.closeToTray',
          useGpu: 'performance.gpuAcceleration',
          language: 'general.language',
          theme: 'general.theme',
        };

        // 레거시 키 마이그레이션
        Object.entries(keyMappings).forEach(([oldKey, newKey]) => {
          if (oldKey in oldSettings) {
            store.set(newKey, oldSettings[oldKey]);
            store.delete(oldKey);
          }
        });
      }

      // 버전 저장
      store.set('settingsVersion', targetVersion);
      log.info('설정 마이그레이션 완료');
    } catch (error) {
      log.error('설정 마이그레이션 오류:', error);
    }
  }
}

/**
 * 저장소 인스턴스 가져오기
 * @returns {ElectronStore} 저장소 인스턴스
 */
function getStore() {
  if (!storeInstance) {
    return initializeStore();
  }
  return storeInstance;
}

/**
 * 설정 값 가져오기
 * @param {string} key 설정 키
 * @param {any} defaultValue 기본값
 * @returns {any} 설정 값
 */
function getSetting(key, defaultValue) {
  return getStore().get(key, defaultValue);
}

/**
 * 설정 값 저장하기
 * @param {string} key 설정 키
 * @param {any} value 설정 값
 */
function setSetting(key, value) {
  getStore().set(key, value);
}

/**
 * 설정 값 삭제하기
 * @param {string} key 설정 키
 */
function deleteSetting(key) {
  getStore().delete(key);
}

/**
 * 모든 설정 가져오기
 * @returns {Object} 전체 설정 객체
 */
function getAllSettings() {
  return getStore().store;
}

/**
 * 설정 변경 이벤트 설정
 * @param {string} key 모니터링할 설정 키
 * @param {Function} callback 콜백 함수
 */
function watchSetting(key, callback) {
  if (!key || typeof callback !== 'function') {
    return;
  }

  getStore().onDidChange(key, callback);
}

/**
 * 설정 초기화
 * @param {string} key 초기화할 설정 키 (선택사항)
 */
function resetSettings(key) {
  if (key) {
    // 특정 키만 초기화
    const defaultValue = key.split('.').reduce((obj, part) => {
      return obj ? obj[part] : undefined;
    }, defaultSettings);

    if (defaultValue !== undefined) {
      getStore().set(key, defaultValue);
    } else {
      getStore().delete(key);
    }
  } else {
    // 전체 초기화
    getStore().clear();
    getStore().set(defaultSettings);
  }
}

/**
 * 파일로 설정 저장
 * @param {string} filePath 저장할 파일 경로
 * @returns {Promise<boolean>} 성공 여부
 */
function exportSettings(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const settings = JSON.stringify(getAllSettings(), null, 2);
      fs.writeFileSync(filePath, settings, 'utf8');
      log.info(`설정 내보내기 완료: ${filePath}`);
      resolve(true);
    } catch (error) {
      log.error('설정 내보내기 오류:', error);
      reject(error);
    }
  });
}

/**
 * 파일에서 설정 불러오기
 * @param {string} filePath 불러올 파일 경로
 * @returns {Promise<Object>} 불러온 설정
 */
function importSettings(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      const settings = JSON.parse(data);

      // 설정 검증
      if (typeof settings !== 'object' || settings === null) {
        throw new Error('유효하지 않은 설정 형식');
      }

      // 현재 설정 백업
      const backupSettings = { ...getAllSettings() };

      try {
        // 기존 설정 지우기
        getStore().clear();

        // 새 설정 적용
        Object.entries(settings).forEach(([key, value]) => {
          getStore().set(key, value);
        });

        log.info(`설정 가져오기 완료: ${filePath}`);
        resolve(getAllSettings());
      } catch (importError) {
        // 오류 발생 시 백업 복원
        log.error('설정 가져오기 실패, 백업 복원:', importError);
        getStore().clear();
        Object.entries(backupSettings).forEach(([key, value]) => {
          getStore().set(key, value);
        });
        reject(importError);
      }
    } catch (error) {
      log.error('설정 가져오기 파일 읽기 오류:', error);
      reject(error);
    }
  });
}

/**
 * 설정 저장소 리소스 정리
 */
function disposeStore() {
  // 이벤트 리스너 정리
  listeners.change = [];
  listeners.error = [];

  // 저장소 인스턴스 정리
  storeInstance = null;

  log.info('설정 저장소 리소스 정리 완료');
}

module.exports = {
  initializeStore,
  getStore,
  getSetting,
  setSetting,
  deleteSetting,
  getAllSettings,
  watchSetting,
  resetSettings,
  exportSettings,
  importSettings,
  disposeStore,
};
