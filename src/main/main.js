// .env 파일에서 환경 변수 로드
require('dotenv').config();

// 개발 모드 여부 감지 - 일찍 정의하여 다른 모든 코드에서 사용할 수 있게 함
const isDev = process.env.NODE_ENV === 'development';
const disableCSP = isDev || process.env.DISABLE_CSP === 'true';
const disableSecurity = isDev || process.env.DISABLE_SECURITY === 'true';

console.log(`애플리케이션 실행 (개발 모드: ${isDev}, 보안 비활성화: ${disableSecurity}, CSP 비활성화: ${disableCSP})`);

// Electron 모듈 가져오기 전에 환경 변수 설정 (Windows에서도 작동하게)
if (disableSecurity || disableCSP) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  
  // CSP 관련 프로세스 환경 변수 설정 (Chromium이 CSP 인식)
  process.env.ELECTRON_OVERRIDE_CSP = '*';
}

const { app, ipcMain, BrowserWindow, session, shell, dialog, screen, Menu, protocol, globalShortcut } = require('electron');
const path = require('path');
const { debugLog, safeRequire } = require('./utils');
const fs = require('fs');
const http = require('http');
const url = require('url');
// 액티브 윈도우 패키지 가져오기 (권한 확인용)
const activeWin = require('active-win');

// 앱 준비 이전에 하드웨어 가속 설정 
// GPU 가속 제어 - 앱 준비 전에 호출해야 함
const disableHardwareAcceleration = process.env.GPU_MODE === 'software' || 
                                     process.env.DISABLE_GPU === 'true';
                                     
if (disableHardwareAcceleration) {
  console.log('GPU 모드: software - 하드웨어 가속 비활성화');
  app.disableHardwareAcceleration();
}

// 앱 준비 이전에 CSP 및 보안 관련 명령줄 스위치 설정
if (process.env.NODE_ENV === 'development') {
  console.log('애플리케이션 실행 (개발 모드: true, 보안 비활성화: true, CSP 비활성화: true)');
  console.log('보안 제한 비활성화 및 CSP 제한 제거 중...');
  
  // 보안 관련 명령줄 스위치 설정
  app.commandLine.appendSwitch('disable-web-security');
  app.commandLine.appendSwitch('allow-insecure-localhost');
  app.commandLine.appendSwitch('ignore-certificate-errors');
  app.commandLine.appendSwitch('disable-site-isolation-trials');
  app.commandLine.appendSwitch('allow-running-insecure-content');
  
  console.log('모든 CSP 제한 완전히 비활성화됨');
}

// 앱 준비 이전에 하드웨어 가속 설정
const enableHardwareAcceleration = process.env.GPU_MODE !== 'software';
if (!enableHardwareAcceleration) {
  console.log('GPU 모드: software - 하드웨어 가속 비활성화');
  app.disableHardwareAcceleration();
}

// GPU 관련 명령줄 스위치 설정
if (!enableHardwareAcceleration) {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
} else {
  // 하드웨어 가속 활성화 시 추가 최적화
  app.commandLine.appendSwitch('enable-hardware-acceleration');
  app.commandLine.appendSwitch('ignore-gpu-blacklist');
}

// 디버깅을 위한 GPU 프로세스 크래시 제한 비활성화
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');

// 디버깅 관련 플래그 추가
if (isDev) {
  app.commandLine.appendSwitch('debug-gpu');
}

// NODE_ENV 설정 확인 및 로깅
console.log(`[환경] NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`[환경] NEXT_PORT: ${process.env.NEXT_PORT || '3000'}`);
console.log(`[환경] GPU_MODE: ${process.env.GPU_MODE || 'not set'}`);
console.log(`[환경] GPU_RESOURCE_DIR: ${process.env.GPU_RESOURCE_DIR || 'not set'}`);
console.log(`[환경] MongoDB URI: ${process.env.MONGODB_URI ? '설정됨' : '설정되지 않음'}`);
console.log(`[환경] Supabase URL: ${process.env.SUPABASE_URL ? '설정됨' : '설정되지 않음'}`);

// 기본 설정 및 상태 관리
const constants = safeRequire('./constants', { appState: {} });
const appState = constants.appState || {};

// 초기화 플래그 추가
appState.protocolsRegistered = false;
appState.securityInitialized = false;

// 프로토콜 관련 모듈 먼저 로드 (app.ready 이전에 호출되어야 함)
const protocols = safeRequire('./protocols', {});

// 프로토콜 스키마 등록 (app.ready 이전에 호출)
if (protocols && protocols.registerSchemesAsPrivileged) {
  protocols.registerSchemesAsPrivileged();
}

// 핵심 모듈 로드
const settings = safeRequire('./settings', {});
const stats = safeRequire('./stats', {}); // stats.js 먼저 로드
const { setupAppEventListeners } = safeRequire('./app-lifecycle', { 
  setupAppEventListeners: () => debugLog('앱 이벤트 리스너 기본 구현 사용'),
  cleanupApp: () => debugLog('앱 정리 기본 구현 사용'),
  initializeApp: async () => debugLog('앱 초기화 기본 구현 사용'),
  setupGpuConfiguration: () => debugLog('GPU 구성 기본 구현 사용')
});
const { createWindow, getMainWindow } = safeRequire('./window', { createWindow: () => debugLog('창 생성 기본 구현 사용'), getMainWindow: () => null });
const memoryManager = safeRequire('./memory-manager', {});
const memoryManagerNative = safeRequire('./memory-manager-native', {});
const keyboard = safeRequire('./keyboard', { setupKeyboardListener: null, registerGlobalShortcuts: null });
const ipcHandlers = safeRequire('./ipc-handlers', {});
const platform = safeRequire('./platform', {});
const browser = safeRequire('./browser', {});

// 추가 모듈 로드 (전체 main 폴더 내 모듈)
const securityChecks = safeRequire('./security-checks', {
  initializeSecuritySettings: () => debugLog('보안 설정 초기화 기본 구현 사용'),
  applySecuritySettings: () => debugLog('보안 설정 적용 기본 구현 사용'),
  setupPermissionHandler: () => debugLog('권한 핸들러 설정 기본 구현 사용'),
  setupKeyboardEventHandler: () => debugLog('키보드 이벤트 핸들러 설정 기본 구현 사용')
});
const powerMonitor = safeRequire('./power-monitor', {});
const gpuUtils = safeRequire('./gpu-utils', {});
const screenshot = safeRequire('./screenshot', {});
const clipboardWatcher = safeRequire('./clipboard-watcher', {});
const crashReporter = safeRequire('./crash-reporter', {});
const menu = safeRequire('./menu', {});
const safeStorage = safeRequire('./safe-storage', {});
const screens = safeRequire('./screens', {});
const shortcuts = safeRequire('./shortcuts', {});

// Store 모듈 로드 수정 (electron-store 문제 해결)
let store;
try {
  // ESM 모듈로 가져오기 시도
  const ElectronStore = safeRequire('./store', {}).default;
  if (ElectronStore && typeof ElectronStore === 'function') {
    store = new ElectronStore();
    console.log('electron-store를 생성자로서 성공적으로 로드했습니다.');
  } else {
    // commonjs로 가져오기 시도
    const StoreModule = require('electron-store');
    if (StoreModule.default && typeof StoreModule.default === 'function') {
      store = new StoreModule.default();
      console.log('electron-store를 commonjs 모듈로 성공적으로 로드했습니다.');
    } else if (typeof StoreModule === 'function') {
      store = new StoreModule();
      console.log('electron-store를 직접 함수로 성공적으로 로드했습니다.');
    } else {
      console.error('electron-store 모듈을 생성자로 불러올 수 없습니다. 메모리 스토어로 폴백합니다.');
      store = require('./memory-store');
    }
  }
} catch (storeError) {
  console.error('electron-store 로드 중 오류:', storeError);
  store = require('./memory-store');
}

const systemEvents = safeRequire('./system-events', {});
const trayMenu = safeRequire('./tray-menu', {});
const tray = safeRequire('./tray', {});
const updates = safeRequire('./updates', {});
const webContentsHandlers = safeRequire('./web-contents-handlers', {});
const database = safeRequire('./database', {});
const dialogs = safeRequire('./dialogs', {});
const electronConfig = safeRequire('./electron-config', {});
const autoLaunch = safeRequire('./auto-launch', {});

// 데이터 동기화 모듈 가져오기
const dataSync = require('./data-sync');

// 필요한 함수 참조 추출
const setupMemoryMonitoring = memoryManager.setupMemoryMonitoring || (() => debugLog('메모리 모니터링 기본 구현 사용'));
const startTracking = stats.startTracking || (() => debugLog('통계 추적 기본 구현 사용'));

// processKeyInput 함수 로드 여부 확인
debugLog('- stats.processKeyInput 로드됨:', !!stats.processKeyInput);

// 모듈 로드 상태 출력
debugLog('모듈 로드 결과:');
debugLog('- app-lifecycle:', !!setupAppEventListeners);
debugLog('- window:', !!createWindow && !!getMainWindow);
debugLog('- memory-manager:', !!memoryManager.setupMemoryMonitoring);
debugLog('- memory-manager-native:', !!memoryManagerNative);
debugLog('- keyboard:', !!keyboard.setupKeyboardListener);
debugLog('- ipc-handlers:', !!ipcHandlers.setupIpcHandlers);
debugLog('- settings:', !!settings.loadSettings);
debugLog('- constants:', !!constants.appState);
debugLog('- platform:', !!platform.getCurrentPlatform);
debugLog('- stats:', !!stats.processKeyInput);
debugLog('- browser:', !!browser.detectBrowserName);
debugLog('- power-monitor:', !!powerMonitor);
debugLog('- gpu-utils:', !!gpuUtils);
debugLog('- system-events:', !!systemEvents);
debugLog('- database:', !!database);
debugLog('- tray:', !!tray);
debugLog('- menu:', !!menu);
debugLog('- auto-launch:', !!autoLaunch);

// 추가 모듈 안전하게 import (stats.js 다음에 keyboard.js를 로드)
const initializeNativeModule = () => {
  try {
    const { isNativeModuleAvailable, initializeMemorySettings } = require('../server/native/index.cjs');
    
    // 네이티브 모듈 상태 초기화
    let moduleStatus = false;
    
    try {
      moduleStatus = isNativeModuleAvailable();
    } catch (error) {
      console.error('네이티브 모듈 가용성 확인 오류:', error);
    }
    
    if (moduleStatus) {
      // 네이티브 모듈 사용 가능
      console.debug('네이티브 메모리 모듈 초기화 성공');
      
      // 여기에 추가 초기화 로직 구현
      if (typeof initializeMemorySettings === 'function') {
        try {
          initializeMemorySettings({
            gcInterval: 60000,
            memoryLimit: 512,
            emergency: false
          });
        } catch (initError) {
          console.error('메모리 설정 초기화 오류:', initError);
        }
      }
    } else {
      console.debug('JavaScript 기반 메모리 관리로 폴백');
    }
    
    return moduleStatus;
  } catch (error) {
    console.error('네이티브 메모리 모듈 초기화 오류:', error);
    return false;
  }
};
const setupKeyboardListener = keyboard.setupKeyboardListener || (() => {
  debugLog('키보드 리스너 기본 구현 사용 - 별도로 키보드 패키지를 로드합니다');
  // 기본 구현으로 직접 로드 시도
  try {
    const keyboardModule = require('./keyboard');
    if (keyboardModule && typeof keyboardModule.setupKeyboardListener === 'function') {
      debugLog('키보드 모듈 직접 로드 성공');
      return keyboardModule.setupKeyboardListener();
    }
  } catch (e) {
    console.error('키보드 모듈 직접 로드 실패:', e);
  }
  return null;
});
const setupIpcHandlers = ipcHandlers.setupIpcHandlers || (() => debugLog('IPC 핸들러 기본 구현 사용'));
const loadSettings = settings.loadSettings || (() => debugLog('설정 로드 기본 구현 사용'));

// 이미 setupAppEventListeners가 호출되었는지 추적하는 플래그 추가
let appEventListenersSetup = false;
let keyboardListenerActive = false;
let keyboardListenerInstance = null;

// Next.js 서버가 준비되었는지 확인하는 함수
function checkIfNextServerReady() {
  return new Promise((resolve) => {
    const checkServer = () => {
      debugLog('Next.js 서버 준비 상태 확인 중...');
      
      http.get('http://localhost:3000', (res) => {
        if (res.statusCode === 200) {
          debugLog('Next.js 서버 준비됨');
          resolve(true);
        } else {
          debugLog(`Next.js 서버 응답 코드: ${res.statusCode}, 재시도 중...`);
          setTimeout(checkServer, 1000);
        }
      }).on('error', (err) => {
        debugLog(`Next.js 서버 연결 실패: ${err.message}, 재시도 중...`);
        setTimeout(checkServer, 1000);
      });
    };
    
    checkServer();
  });
}

// Electron 앱이 단일 인스턴스로 실행되도록 설정
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  // 앱 초기화 전 GC 플래그 설정 (app.commandLine.appendSwitch는 app.ready 전에 호출해야 함)
  try {
    // 중요: 이 플래그는 앱 초기화 전에 설정해야 합니다
    if (process.argv.indexOf('--expose-gc') === -1) {
      app.commandLine.appendSwitch('js-flags', '--expose-gc');
      debugLog('GC 노출 플래그 설정 완료');
    } else {
      debugLog('GC 노출 플래그가 이미 설정되어 있습니다');
    }
    
    // GPU 가속 관련 설정 (app.ready 전에 해야 함)
    const settings = appState.settings || {};
    const useHardwareAcceleration = settings.useHardwareAcceleration !== false;
    
    // 하드웨어 가속 비활성화 (설정에 따라)
    if (!useHardwareAcceleration) {
      // 반드시 app.ready 이전에 호출되어야 함
      app.disableHardwareAcceleration();
      debugLog('하드웨어 가속 비활성화됨');
    } else {
      // Chrome 스타일의 GPU 가속을 위한 기본 플래그 추가 (app.ready 전)
      if (!app.commandLine.hasSwitch('disable-gpu')) {
        // 기본 GPU 설정 - app-lifecycle에서 세부 설정함
        app.commandLine.appendSwitch('enable-hardware-acceleration');
        app.commandLine.appendSwitch('enable-gpu-rasterization');
        app.commandLine.appendSwitch('enable-zero-copy');
        
        debugLog('기본 GPU 가속 플래그 설정 완료');
      }
    }
  } catch (error) {
    debugLog('플래그 설정 실패:', error);
  }
  
  // 앱 시작 전 설정
  function setupAppConfig() {
    try {
      debugLog('앱 설정 초기화 시작');
      
      // 메모리 관련 플래그 추가
      app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
      app.commandLine.appendSwitch('disable-site-isolation-trials');
      
      // 개발 모드 감지
      const isDev = process.env.NODE_ENV === 'development';
      debugLog(`개발 모드: ${isDev}`);
      
      // 개발 모드에서 추가 설정
      if (isDev) {
        // 개발용 포트 지정
        process.env.PORT = process.env.PORT || '3000';
        debugLog(`개발 서버 포트: ${process.env.PORT}`);
      }
      
      // 보안 설정은 앱이 ready 상태가 된 후에 적용하도록 변경
      // (app.whenReady() 이후에 실행)
      
      // 제품 모드 감지 및 관련 설정
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        // 프로덕션에서 개발자 도구 비활성화
        app.on('browser-window-created', (_, window) => {
          window.webContents.on('devtools-opened', () => {
            window.webContents.closeDevTools();
          });
        });
      }
      
      debugLog('앱 설정 초기화 완료');
      
      // 초기 실행 설정
      const gotTheLock = app.requestSingleInstanceLock();
      if (!gotTheLock) {
        debugLog('이미 다른 인스턴스가 실행 중입니다. 앱을 종료합니다.');
        app.quit();
        return;
      }
      
      // 메인 프로세스 초기화 시간 확보
      debugLog('메인 프로세스 초기화 대기 중...');
      // appEventListenersSetup 플래그를 사용하여 중복 호출 방지
      if (!appEventListenersSetup) {
        setTimeout(() => {
          debugLog('앱 이벤트 리스너 설정 예약됨 (setupAppConfig)');
        }, 100);
      }
    } catch (error) {
      console.error('앱 설정 초기화 중 오류:', error);
      // 오류 발생해도 앱은 계속 실행
    }
  }
  
  setupAppConfig();
  
  // 초기 프로토콜 보안 설정 (반드시 app.ready 이전에 해야 함)
  if (protocols && protocols.registerProtocolHandlers && !appState.protocolsRegistered) {
    protocols.registerProtocolHandlers();
    appState.protocolsRegistered = true;
    console.log('프로토콜 핸들러 등록 완료');
  }
  
  // app ready 이벤트에서 Next.js 서버 준비 상태 확인 추가
  app.whenReady().then(async () => {
    debugLog('앱 준비됨, 초기화 시작...');

    try {
      // .env 파일이 있는지 확인하고 환경 변수 로드 시도
      require('dotenv').config();
      console.log('.env 파일을 성공적으로 로드했습니다.');
    } catch (error) {
      debugLog('.env 파일 로드 중 오류:', error);
    }

    // 모듈 로드 상태 디버깅
    debugLog('모듈 로드 상태:');
    debugLog('- createWindow:', !!createWindow);
    debugLog('- setupAppEventListeners:', !!setupAppEventListeners);
    debugLog('- setupKeyboardListener:', !!setupKeyboardListener);
    debugLog('- setupIpcHandlers:', !!setupIpcHandlers);
    debugLog('- loadSettings:', !!loadSettings);
    debugLog('- initializeNativeModule:', !!initializeNativeModule);
    debugLog('- securityChecks:', !!securityChecks);

    // 앱 이벤트 리스너 처리
    if (!appEventListenersSetup) {
      appEventListenersSetup = true;
      setupAppEventListeners();
      debugLog('앱 이벤트 리스너 설정 완료 (main.js)');
    }
    
    // 기본 보안 설정 초기화 (창이 필요없는 부분만)
    try {
      console.log('개발 환경: 모든 보안 설정 비활성화');
      if (securityChecks && typeof securityChecks.initializeSecuritySettings === 'function') {
        securityChecks.initializeSecuritySettings();
      }
    } catch (securityError) {
      console.error('기본 보안 설정 초기화 오류:', securityError);
    }
    
    try {
      // GPU 가속 설정 (창 생성 전에 적용)
      setupGpuAcceleration();
      
      // 메인 창 생성 - window.js의 createWindow 함수 사용
      debugLog('메인 창 생성 시작...');
      const mainWindow = createWindow();
      
      if (!mainWindow) {
        throw new Error('메인 창 생성 실패');
      }
      
      debugLog('메인 창 생성됨:', !!mainWindow);
      
      // 창에 보안 설정 적용 (mainWindow 인자와 함께)
      try {
        setupSecuritySettings(mainWindow);
        debugLog('창에 보안 설정 적용됨');
      } catch (windowSecurityError) {
        console.error('창 보안 설정 적용 중 오류:', windowSecurityError);
      }
      
      // 개발 모드에서만 Next.js 서버 확인
      if (isDev) {
        debugLog('개발 모드 감지됨, Next.js 서버 확인 중...');
        await checkIfNextServerReady();
      }
      
      // 앱 초기화 실행
      debugLog('앱 초기화 시작...');
      await initializeApp();
      debugLog('앱 초기화 완료');
    } catch (startError) {
      console.error('앱 시작 오류:', startError);
    }
  });
  
  // 두 번째 인스턴스 실행 시 기존 창 활성화
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    debugLog('다른 인스턴스가 실행됨, 기존 창 활성화');
    const mainWindow = getMainWindow();
    
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

/**
 * GPU 가속 설정
 */
function setupGpuAcceleration() {
  try {
    // 이미 앱이 준비된 후라면 app.disableHardwareAcceleration()은 호출할 수 없음
    // 앱 준비 전에 이미 최상위에서 처리됨
    
    // 환경변수 확인
    const gpuMode = process.env.GPU_MODE || '';
    console.log('환경 변수 GPU_MODE:', gpuMode);

    // 환경 변수를 기반으로 GPU 설정 초기화
    const envBasedSettings = {
      gpuAcceleration: gpuMode !== 'software',
      hardwareAcceleration: gpuMode !== 'software',
      vsync: true,
      webGLEnabled: gpuMode !== 'software',
      batteryOptimizationMode: 'auto'
    };

    console.log('환경 변수 기반 GPU 설정:', {
      gpuAcceleration: envBasedSettings.gpuAcceleration,
      hardwareAcceleration: envBasedSettings.hardwareAcceleration,
      vsync: envBasedSettings.vsync,
      webGLEnabled: envBasedSettings.webGLEnabled,
      batteryOptimizationMode: envBasedSettings.batteryOptimizationMode
    });

    // 설정 파일에서 GPU 설정 로드
    const userDataPath = app.getPath('userData');
    const gpuSettingsPath = path.join(userDataPath, 'gpu-settings.json');
    let fileSettings = {};

    if (fs.existsSync(gpuSettingsPath)) {
      try {
        const fileContent = fs.readFileSync(gpuSettingsPath, 'utf8');
        fileSettings = JSON.parse(fileContent);
        console.log('GPU 설정 파일에서 로드됨:', gpuSettingsPath);
      } catch (parseError) {
        console.error('GPU 설정 파일 파싱 오류:', parseError);
      }
    }

    // 환경변수가 우선순위가 높음
    const finalSettings = {
      ...fileSettings,
      ...envBasedSettings
    };

    console.log('최종 GPU 설정 (환경변수 우선):', {
      gpuAcceleration: finalSettings.gpuAcceleration,
      hardwareAcceleration: finalSettings.hardwareAcceleration,
      vsync: finalSettings.vsync,
      webGLEnabled: finalSettings.webGLEnabled,
      batteryOptimizationMode: finalSettings.batteryOptimizationMode
    });

    // 설정 적용
    appState.gpuSettings = finalSettings;

    return appState.gpuSettings;
  } catch (error) {
    console.error('GPU 가속 설정 오류:', error);
    return null;
  }
}

/**
 * 앱 종료 시 정리 작업 수행
 */
function cleanupOnExit() {
  try {
    console.log('앱 종료 시 정리 작업 수행...');
    
    // 키보드 리스너 해제
    if (keyboardListenerHandler) {
      console.log('키보드 리스너 해제 중...');
      keyboardListenerHandler.dispose && keyboardListenerHandler.dispose();
      keyboardListenerHandler = null;
    }
    
    // 메모리 정리
    if (global.gc) {
      console.log('가비지 컬렉션 실행 중...');
      global.gc();
    }
    
    // 데이터베이스 연결 종료
    if (database && database.closeDatabase) {
      console.log('데이터베이스 연결 종료 중...');
      database.closeDatabase();
    }
    
    console.log('정리 작업 완료');
    return true;
  } catch (error) {
    console.error('정리 작업 중 오류:', error);
    return false;
  }
}

/**
 * 앱을 초기화하는 함수
 */
async function initializeApp() {
  try {
    debugLog('앱 초기화 시작...');
    console.log('앱 초기화 시작');

    // 플랫폼 초기화
    initializePlatform();

    // 설정 로드
    console.log('설정 로드 중...');
    await loadSettings();

    // 보안 설정 초기화
    try {
      console.log('개발 환경: 모든 보안 설정 비활성화');
      // 메인 윈도우 객체 가져오기
      const mainWindow = appState.mainWindow || BrowserWindow.getAllWindows().find(w => !w.isDestroyed());
      const securityResult = setupSecuritySettings(mainWindow);
      debugLog(`보안 설정 초기화 결과: ${securityResult}`);
    } catch (securityError) {
      console.error('보안 설정 초기화 오류:', securityError);
    }

    // 권한 핸들러 설정
    try {
      console.log('권한 핸들러 설정 중...');
      const permissionResult = setupPermissionHandlers();
      debugLog(`권한 핸들러 설정 결과: ${permissionResult}`);
    } catch (permissionError) {
      console.error('권한 핸들러 설정 오류:', permissionError);
    }

    // 그 외 초기화 작업들
    console.log('네이티브 메모리 모듈 초기화...');
    const nativeInitResult = await initializeNativeModule();
    
    // 메모리 최적화 설정
    console.log('메모리 최적화 설정 중...');
    try {
      // 메모리 관리 초기화 함수 호출
      setupMemoryManagement();

      // 메모리 최적화 이벤트 설정
      setupMemoryOptimizationEvents();
    } catch (err) {
      console.error('메모리 초기화 중 오류:', err);
    }

    // GPU 가속 설정
    console.log('GPU 가속 설정 중...');
    try {
      setupGpuAcceleration();
    } catch (error) {
      console.error('GPU 가속 설정 오류:', error);
    }

    // 브라우저 정보 핸들러 초기화
    try {
      console.log('브라우저 정보 핸들러 초기화 중...');
      if (browser && browser.setupCurrentBrowserInfoHandler) {
        const browserInfoResult = browser.setupCurrentBrowserInfoHandler();
        console.log('브라우저 정보 핸들러 등록 완료:', browserInfoResult);
      } else {
        console.warn('브라우저 정보 핸들러 모듈을 찾을 수 없습니다');
      }
    } catch (browserInfoError) {
      console.error('브라우저 정보 핸들러 초기화 오류:', browserInfoError);
    }

    // IPC 핸들러 설정
    try {
      console.log('IPC 핸들러 설정 중...');
      if (ipcHandlers && typeof ipcHandlers.setupIpcHandlers === 'function') {
        ipcHandlers.setupIpcHandlers();
      }
    } catch (ipcError) {
      console.error('IPC 핸들러 설정 오류:', ipcError);
    }

    // 키보드 이벤트 리스너 설정 (보안 설정 이후에 실행)
    try {
      setupKeyboardListening();
    } catch (keyboardError) {
      console.error('키보드 리스너 설정 오류:', keyboardError);
    }

    return true;
  } catch (error) {
    console.error('앱 초기화 중 오류:', error);
    return false;
  }
}

/**
 * 메모리 관리 설정
 */
function setupMemoryManagement() {
  const { settings } = appState;
  
  // 메모리 사용량 모니터링 간격 설정
  appState.memoryMonitorInterval = settings?.reduceMemoryInBackground ? 30000 : 60000; // 30초 또는 60초
  
  // 메모리 임계값 설정
  appState.memoryThreshold = {
    high: settings?.maxMemoryThreshold || 150, // MB 단위
    critical: (settings?.maxMemoryThreshold || 150) * 1.5
  };
  
  try {
    // 네이티브 메모리 모듈 초기화
    const { isNativeModuleAvailable, initializeMemorySettings } = require('../server/native/index.cjs');
    
    // 네이티브 모듈이 사용 가능한 경우 설정 초기화
    if (isNativeModuleAvailable()) {
      console.log('네이티브 메모리 모듈 초기화 중...');
      
      // 네이티브 모듈에 설정 전달
      const memorySettings = {
        enable_automatic_optimization: true,
        optimization_threshold: settings?.maxMemoryThreshold || 150,
        optimization_interval: appState.memoryMonitorInterval,
        aggressive_gc: false,
        enable_logging: true,
        enable_performance_metrics: true,
        use_hardware_acceleration: settings?.useHardwareAcceleration || false,
        processing_mode: settings?.processingMode || 'auto',
        use_memory_pool: true,
        pool_cleanup_interval: 300000 // 5분
      };
      
      initializeMemorySettings(JSON.stringify(memorySettings));
      console.log('네이티브 메모리 모듈 설정 초기화 완료');
    } else {
      console.log('네이티브 메모리 모듈을 사용할 수 없음, JavaScript 기반 메모리 관리 사용');
    }
  } catch (error) {
    console.error('네이티브 메모리 모듈 초기화 오류:', error);
    console.log('JavaScript 기반 메모리 관리로 폴백');
  }
}

/**
 * 메모리 최적화를 위한 이벤트 리스너 설정
 */
function setupMemoryOptimizationEvents() {
  const { app, ipcMain } = require('electron');
  const { isNativeModuleAvailable, optimizeMemory, forceGarbageCollection } = require('../server/native/index.cjs');
  
  // 메모리 임계값 설정 (기본값)
  if (!appState.memoryThreshold) {
    appState.memoryThreshold = {
      high: 200,     // 메모리 사용량이 200MB를 초과할 때 일반 최적화 실행
      critical: 500  // 메모리 사용량이 500MB를 초과할 때 긴급 최적화 실행
    };
    console.log('메모리 임계값 기본 설정됨:', appState.memoryThreshold);
  }
  
  // 메모리 사용량 모니터링 타이머
  let memoryMonitorTimer = null;
  
  // 메모리 모니터링 간격 설정 (기본값: 30초)
  if (!appState.memoryMonitorInterval) {
    appState.memoryMonitorInterval = 30000;
  }
  
  // 메모리 사용량 확인 및 최적화
  const checkMemoryUsage = async () => {
    try {
      // 현재 메모리 사용량 가져오기
      const memoryInfo = process.memoryUsage();
      const heapUsedMB = Math.round(memoryInfo.heapUsed / 1024 / 1024);
      const { high, critical } = appState.memoryThreshold;
      
      // 메모리 사용량이 임계값 초과 시 최적화 수행
      if (heapUsedMB > critical) {
        console.log(`메모리 사용량 위험 수준 (${heapUsedMB}MB > ${critical}MB), 긴급 최적화 수행`);
        
        // 네이티브 모듈 사용 가능 시 네이티브 최적화 사용
        if (isNativeModuleAvailable()) {
          await optimizeMemory(4, true); // 레벨 4(긴급)로 최적화
        } else {
          // JavaScript 기반 메모리 최적화
          global.gc && global.gc(true);
        }
      } else if (heapUsedMB > high) {
        console.log(`메모리 사용량 높음 (${heapUsedMB}MB > ${high}MB), 일반 최적화 수행`);
        
        // 네이티브 모듈 사용 가능 시 네이티브 최적화 사용
        if (isNativeModuleAvailable()) {
          await optimizeMemory(2, false); // 레벨 2(중간)로 최적화
        } else {
          // JavaScript 기반 메모리 최적화
          global.gc && global.gc();
        }
      }
    } catch (error) {
      console.error('메모리 사용량 확인 중 오류:', error);
    }
  };
  
  // 앱이 백그라운드로 전환될 때 메모리 최적화
  app.on('browser-window-blur', async () => {
    if (appState.settings?.reduceMemoryInBackground) {
      try {
        console.log('앱이 백그라운드로 전환됨, 메모리 최적화 수행');
        
        // 네이티브 모듈 사용 가능 시 네이티브 최적화 사용
        if (isNativeModuleAvailable()) {
          await optimizeMemory(3, false); // 레벨 3(높음)로 최적화
        } else {
          // JavaScript 기반 메모리 최적화
          global.gc && global.gc();
        }
      } catch (error) {
        console.error('백그라운드 메모리 최적화 중 오류:', error);
      }
    }
  });
  
  // 렌더러에서 메모리 최적화 요청 처리
  ipcMain.handle('optimize-memory', async (event, emergency = false) => {
    try {
      console.log(`메모리 최적화 요청 수신 (긴급: ${emergency})`);
      
      if (isNativeModuleAvailable()) {
        const level = emergency ? 4 : 2;
        const result = await optimizeMemory(level, emergency);
        return { success: true, result };
      } else {
        // JavaScript 기반 메모리 최적화
        global.gc && global.gc(emergency);
        return { success: true };
      }
    } catch (error) {
      console.error('메모리 최적화 요청 처리 중 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 렌더러에서 GC 요청 처리
  ipcMain.handle('request-gc', async (event, emergency = false) => {
    try {
      console.log(`GC 요청 수신 (긴급: ${emergency})`);
      
      if (isNativeModuleAvailable()) {
        const result = await forceGarbageCollection();
        return { success: true, result };
      } else {
        // JavaScript 기반 GC
        global.gc && global.gc(emergency);
        return { success: true };
      }
    } catch (error) {
      console.error('GC 요청 처리 중 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 주기적 메모리 모니터링 시작
  if (memoryMonitorTimer) {
    clearInterval(memoryMonitorTimer);
  }
  
  memoryMonitorTimer = setInterval(checkMemoryUsage, appState.memoryMonitorInterval);
  
  // 앱 종료 시 모니터링 중지
  app.on('before-quit', () => {
    if (memoryMonitorTimer) {
      clearInterval(memoryMonitorTimer);
      memoryMonitorTimer = null;
    }
  });
  
  console.log(`메모리 최적화 이벤트 리스너 설정 완료 (모니터링 간격: ${appState.memoryMonitorInterval}ms)`);
}

// 전역 상태 설정
let keyboardListenerHandler = null;

// IPC 이벤트 핸들러 - 모니터링 시작
ipcMain.on('start-tracking', () => {
  if (!appState.isTracking) {
    console.log('모니터링 시작');
    appState.isTracking = true;
    
    // 모니터링 시작 시 키보드 리스너 설정
    if (!keyboardListenerHandler) {
      console.log('키보드 리스너 설정 중...');
      keyboardListenerHandler = setupKeyboardListener();
      
      if (keyboardListenerHandler) {
        console.log('키보드 리스너 설정 완료');
        
        // 메인 윈도우에 모니터링 상태 알림
        if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
          appState.mainWindow.webContents.send('tracking-status-changed', { 
            isTracking: true,
            keyboardActive: true
          });
        }
      } else {
        console.error('키보드 리스너 설정 실패');
      }
    }
  }
});

// IPC 이벤트 핸들러 - 모니터링 중지
ipcMain.on('stop-tracking', () => {
  if (appState.isTracking) {
    console.log('모니터링 중지');
    appState.isTracking = false;
    
    // 모니터링 중지 시 키보드 리스너 해제
    if (keyboardListenerHandler) {
      console.log('키보드 리스너 해제 중...');
      keyboardListenerHandler.dispose();
      keyboardListenerHandler = null;
      
      // 메인 윈도우에 모니터링 상태 알림
      if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
        appState.mainWindow.webContents.send('tracking-status-changed', { 
          isTracking: false,
          keyboardActive: false
        });
      }
    }
  }
});

// 앱 종료 전 정리 작업
app.on('before-quit', async (event) => {
  // ... existing code ...
  
  // 데이터베이스 연결 종료
  if (database && database.closeDatabase) {
    console.log('데이터베이스 연결 종료 중...');
    database.closeDatabase();
    console.log('데이터베이스 연결이 성공적으로 종료되었습니다.');
  }
  
  // ... existing code ...
});

/**
 * 보안 설정을 초기화합니다.
 * 개발 환경에서는 보안 설정을 완화합니다.
 */
function setupSecuritySettings(win) {
  try {
    console.log('현재 환경:', process.env.NODE_ENV, '(보안 설정 적용 중...)');
    
    // 기본적인 보안 설정 적용 (win 인자 필요 없음)
    securityChecks.initializeSecuritySettings(app);
    
    // 모든 세션에 CSP 적용 (개발/프로덕션 모드에 따라 자동 설정)
    const cspApplied = securityChecks.applyCSPToAllSessions();
    
    if (cspApplied) {
      console.log('Content Security Policy가 성공적으로 적용되었습니다.');
      
      // win 인자가 있을 때만 DOM ready 이벤트 리스너 등록
      if (win && win.webContents) {
        win.webContents.on('dom-ready', () => {
          console.log('메인 윈도우 DOM 로드 완료 - CSP 메타태그 확인 중...');
        });
      }
    } else {
      console.error('Content Security Policy 적용 실패! 보안에 취약할 수 있습니다.');
    }
    
    // 추가 보안 설정 (요청 검증, 새 창 열기 제한 등)
    // win 인자가 있을 때만 setupRequestChecks 호출
    if (win && securityChecks.setupRequestChecks) {
      securityChecks.setupRequestChecks(win);
    }
    
    return true;
  } catch (error) {
    console.error('보안 설정 적용 중 오류 발생:', error);
    return false;
  }
}

/**
 * 키보드 리스너 설정
 */
function setupKeyboardListening() {
  try {
    console.log('키보드 이벤트 리스너 설정 중...');
    
    // keyboard 모듈 로드
    const keyboard = safeRequire('./keyboard', {});
    
    if (!keyboard) {
      console.error('키보드 모듈을 로드할 수 없습니다.');
      return false;
    }
    
    // 먼저 IPC 핸들러 설정 (webContents가 생성되기 전에)
    if (keyboard.setupKeyboardIpcHandlers) {
      const ipcSetupResult = keyboard.setupKeyboardIpcHandlers();
      console.log(`키보드 IPC 핸들러 설정 결과: ${ipcSetupResult}`);
    } else {
      console.log('setupKeyboardIpcHandlers 함수가 없습니다');
      
      // 보안 모듈에 있는 키보드 이벤트 핸들러 시도
      const security = safeRequire('./security-checks', {});
      if (security && security.setupKeyboardEventHandler) {
        const securityIpcResult = security.setupKeyboardEventHandler();
        console.log(`보안 모듈 키보드 이벤트 핸들러 설정 결과: ${securityIpcResult}`);
      }
    }
    
    // 그 다음 키보드 리스너 설정
    if (keyboard.setupKeyboardListener) {
      const keyboardListenerResult = keyboard.setupKeyboardListener();
      console.log(`키보드 리스너 설정 결과: ${keyboardListenerResult ? '성공' : '실패'}`);
    } else {
      console.log('setupKeyboardListener 함수가 없습니다');
    }
    
    // 전역 단축키 설정
    if (keyboard.registerGlobalShortcuts) {
      keyboard.registerGlobalShortcuts();
    }
    
    return true;
  } catch (error) {
    console.error('키보드 이벤트 리스너 설정 실패:', error);
    return false;
  }
}

/**
 * 플랫폼별 초기화 작업
 */
function initializePlatform() {
  console.log('플랫폼 초기화 중...');
  
  try {
    // 플랫폼 감지
    const platform = process.platform;
    console.log('감지된 플랫폼:', platform);
    
    // 아이콘 경로 설정
    // 여러 가능한 아이콘 경로를 시도하고 존재하는 것을 사용
    let iconPath = null;
    
    // 가능한 아이콘 경로들
    const possibleIconPaths = [
      path.join(__dirname, '../../public/app_icon.webp'),
      path.join(__dirname, '../../public/app-icon.png'),
      path.join(__dirname, '../../public/app-icon.svg'),
      path.join(process.resourcesPath || __dirname, 'app_icon.webp'),
      path.join(process.resourcesPath || __dirname, 'app-icon.png')
    ];
    
    // 존재하는 첫 번째 아이콘 파일 찾기
    for (const iconCandidate of possibleIconPaths) {
      if (fs.existsSync(iconCandidate)) {
        iconPath = iconCandidate;
        break;
      }
    }
    
    // 아이콘이 없으면 null로 설정하여 기본값 사용
    appState.appIcon = iconPath;
    
    if (iconPath) {
      console.log('앱 아이콘 찾음:', iconPath);
    } else {
      console.log('앱 아이콘을 찾을 수 없어 기본 아이콘을 사용합니다.');
    }
    
    return true;
  } catch (error) {
    console.error('플랫폼 초기화 오류:', error);
    return false;
  }
}

/**
 * 운영체제별 플랫폼 설정
 */
function setupPlatformSpecificConfigurations() {
  try {
    console.log('운영체제별 설정 적용 중...');
    
    const currentPlatform = appState.platform || process.platform;
    
    // macOS 특화 설정
    if (currentPlatform === 'darwin') {
      app.on('activate', () => {
        // macOS에서는 독 아이콘 클릭 시 창이 없으면 새로 만듦
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
      
      // 메뉴바 설정
      if (menu && menu.setupDarwinMenu) {
        menu.setupDarwinMenu();
      }
    } 
    // Windows 특화 설정
    else if (currentPlatform === 'win32') {
      // 시작 시 자동 실행 설정
      if (autoLaunch && autoLaunch.setup) {
        autoLaunch.setup();
      }
    }
    
    console.log('운영체제별 설정 적용 완료');
    return true;
  } catch (error) {
    console.error('운영체제별 설정 적용 오류:', error);
    return false;
  }
}

/**
 * 권한 관련 핸들러 설정
 */
function setupPermissionHandlers() {
  try {
    console.log('권한 핸들러 설정 중...');
    
    // 권한 확인 함수
    ipcMain.handle('check-permissions', async () => {
      try {
        if (process.platform !== 'darwin') {
          return { hasAllPermissions: true };
        }
        
        // macOS에서 화면 기록 권한 확인
        let screenCaptureStatus = false;
        
        try {
          // macOS에서 권한 확인을 위해 activeWin 테스트
          const windowInfo = await activeWin();
          screenCaptureStatus = !!windowInfo;
        } catch (error) {
          const errorOutput = (error.stderr || error.stdout || '').toString();
          if (errorOutput.includes('screen recording permission')) {
            screenCaptureStatus = false;
            
            // 권한 없음을 렌더러에 알림
            if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
              appState.mainWindow.webContents.send('permission-error', {
                code: 'SCREEN_RECORDING',
                message: '화면 기록 권한이 필요합니다',
                detail: '키보드 입력 모니터링을 위해 화면 기록 권한이 필요합니다. 시스템 설정을 열어 권한을 허용해주세요.'
              });
            }
          }
        }
        
        return {
          screenCapture: screenCaptureStatus
        };
      } catch (error) {
        console.error('권한 확인 중 오류:', error);
        return { error: error.message };
      }
    });
    
    // 시스템 설정 열기
    ipcMain.handle('open-system-preferences', (event, permissionType) => {
      try {
        if (process.platform !== 'darwin') {
          return { success: false, message: '지원되지 않는 플랫폼' };
        }
        
        let urlScheme = 'x-apple.systempreferences:';
        
        switch (permissionType) {
          case 'SCREEN_RECORDING':
            // 화면 기록 설정으로 이동
            urlScheme = 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture';
            break;
          default:
            urlScheme = 'x-apple.systempreferences:com.apple.preference.security?Privacy';
            break;
        }
        
        // URL 스킴으로 설정 앱 열기
        shell.openExternal(urlScheme)
          .then(() => {
            console.log('시스템 설정 앱 실행 성공');
          })
          .catch(err => {
            console.error('시스템 설정 앱 실행 실패:', err);
          });
        
        return { success: true };
      } catch (error) {
        console.error('시스템 설정 열기 오류:', error);
        return { success: false, error: error.message };
      }
    });
    
    console.log('권한 핸들러 설정 완료');
    return true;
  } catch (error) {
    console.error('권한 핸들러 설정 중 오류 발생:', error);
    return false;
  }
}

/**
 * 최종 구성 마무리
 */
function finalizeConfiguration() {
  try {
    console.log('최종 설정 적용 중...');
    
    // 트레이 아이콘 설정
    if (tray && tray.setupTray) {
      tray.setupTray();
    }
    
    // 전역 단축키 등록
    if (keyboard && keyboard.registerGlobalShortcuts) {
      keyboard.registerGlobalShortcuts();
    }
    
    // 프로토콜 핸들러는 앱 시작 시 한 번만 등록해야 함
    // 이미 등록된 경우 다시 등록하지 않음
    if (!appState.protocolsRegistered && protocols && protocols.registerProtocolHandlers) {
      console.log('프로토콜 핸들러 등록 (finalizeConfiguration)');
      try {
        protocols.registerProtocolHandlers();
        appState.protocolsRegistered = true;
      } catch (protocolError) {
        console.error('프로토콜 핸들러 등록 오류:', protocolError);
      }
    } else if (appState.protocolsRegistered) {
      console.log('프로토콜 핸들러가 이미 등록되어 있음 (finalizeConfiguration)');
    }
    
    // 개발 모드 감지 및 개발 모드 특화 설정
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log('개발 모드 특수 설정 적용');
      
      // 개발 도구 활성화 (이미 활성화된 경우 무시)
      if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
        const { webContents } = appState.mainWindow;
        if (webContents && !webContents.isDevToolsOpened()) {
          webContents.openDevTools({ mode: 'detach' });
        }
      }
    }
    
    console.log('최종 설정 적용 완료');
    return true;
  } catch (error) {
    console.error('최종 설정 적용 오류:', error);
    return false;
  }
}

// 키보드 이벤트 리스너를 수동으로 초기화
try {
  const securityChecks = require('./security-checks');
  if (securityChecks && typeof securityChecks.setupKeyboardEventHandler === 'function') {
    console.log('키보드 이벤트 리스너 수동 초기화 시작');
    securityChecks.setupKeyboardEventHandler();
    console.log('키보드 이벤트 리스너 수동 초기화 완료');
  } else {
    console.error('security-checks.js 모듈에서 setupKeyboardEventHandler 함수를 찾을 수 없습니다');
  }
} catch (err) {
  console.error('키보드 이벤트 리스너 초기화 중 오류:', err);
}

// 키보드 이벤트 핸들러 초기화 관련 IPC 리스너
ipcMain.on('keyboard-handler-initialized', (event, data) => {
  console.log('키보드 이벤트 핸들러 초기화 완료 메시지 수신:', data);
  
  // 이벤트를 전송한 창의 webContents 가져오기
  const sender = event.sender;
  if (!sender || sender.isDestroyed()) return;
  
  try {
    // 초기화 확인 응답 전송
    sender.send('keyboard-handler-init-ack', {
      success: true,
      timestamp: Date.now()
    });
    
    // 키보드 이벤트 처리 준비 완료 표시
    appState.keyboardHandlerInitialized = true;
    console.log('키보드 이벤트 처리 준비 완료');
  } catch (error) {
    console.error('키보드 핸들러 초기화 응답 전송 중 오류:', error);
  }
});

// 키보드 이벤트 핸들러 오류 처리 리스너
ipcMain.on('keyboard-handler-error', (event, data) => {
  console.error('키보드 이벤트 핸들러 오류 메시지 수신:', data);
  
  // 이벤트를 전송한 창의 webContents 가져오기
  const sender = event.sender;
  if (!sender || sender.isDestroyed()) return;
  
  // 원인에 따라 다른 조치 수행
  try {
    // 오류 로그 기록
    const errorLog = {
      timestamp: new Date().toISOString(),
      errorMessage: data.error || '알 수 없는 오류',
      source: 'preload.js:setupKeyboardEventHandlers',
      sender: {
        id: sender.id,
        url: sender.getURL()
      }
    };
    
    console.error('키보드 이벤트 핸들러 오류 정보:', errorLog);
    
    // 필요한 경우 창 리로드
    if (data.needsReload) {
      console.log('키보드 핸들러 오류로 인해 창 리로드 시작');
      setTimeout(() => {
        try {
          if (!sender.isDestroyed()) {
            sender.reload();
          }
        } catch (reloadError) {
          console.error('창 리로드 중 오류:', reloadError);
        }
      }, 1000);
    }
  } catch (error) {
    console.error('키보드 핸들러 오류 처리 중 문제 발생:', error);
  }
});
