/**
 * 애플리케이션 메인 엔트리 포인트
 */

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const os = require('os');
const { setupMemoryMonitoring } = require('./memory');
const { initializeWorkerPool, shutdownWorkerPool } = require('./workers');
const { initializeAppLifecycle } = require('./app-lifecycle');
const { registerAllIpcHandlers } = require('./ipc-handlers');
const { initializeNativeModule } = require('./memory-manager-native');
const { setupKeyboardListener, registerGlobalShortcuts } = require('./keyboard');
const { debugLog } = require('./utils');

// 앱 상태 저장소
global.appState = {
  settings: null,
  mainWindow: null,
  isDevelopment: process.env.NODE_ENV === 'development',
  isQuitting: false,
  memoryMonitorInterval: 60000,
  memoryThreshold: {
    high: 150,
    critical: 225
  },
  isTracking: false,
  keyboardListener: null,
  keyboardInitialized: false
};

// 앱 설정
const APP_CONFIG = {
  defaultWidth: 1024,
  defaultHeight: 768,
  minWidth: 800,
  minHeight: 600,
  backgroundColor: '#f5f5f5',
  title: 'Loop',
  appUrl: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../../dist/index.html')}`,
  icon: path.join(__dirname, '../public/icon.png')
};

// 개발 모드에서 Next.js 서버 준비 확인
function checkIfNextServerReady() {
  return new Promise((resolve) => {
    if (process.env.NODE_ENV !== 'development') {
      // 개발 모드가 아니면 확인 필요 없음
      resolve(true);
      return;
    }
    
    const http = require('http');
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

/**
 * 메인 윈도우 생성 함수
 */
function createMainWindow() {
  // 기존 메인 윈도우 정리
  if (global.appState.mainWindow && !global.appState.mainWindow.isDestroyed()) {
    global.appState.mainWindow.close();
  }
  
  // 새 메인 윈도우 생성
  const mainWindow = new BrowserWindow({
    width: APP_CONFIG.defaultWidth,
    height: APP_CONFIG.defaultHeight,
    minWidth: APP_CONFIG.minWidth,
    minHeight: APP_CONFIG.minHeight,
    backgroundColor: APP_CONFIG.backgroundColor,
    title: APP_CONFIG.title,
    icon: APP_CONFIG.icon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload.js'),
      spellcheck: false,
      devTools: process.env.NODE_ENV === 'development'
    }
  });
  
  // appState에 메인 윈도우 저장
  global.appState.mainWindow = mainWindow;
  
  // 개발 모드에서는 Next.js가 준비되었는지 확인 후 로드
  if (process.env.NODE_ENV === 'development') {
    checkIfNextServerReady().then(() => {
      debugLog('메인 윈도우 URL 로딩 시작:', APP_CONFIG.appUrl);
      mainWindow.loadURL(APP_CONFIG.appUrl);
      debugLog('메인 윈도우 URL 로드 성공');
    });
  } else {
    // 프로덕션 모드에서는 즉시 로드
    debugLog('메인 윈도우 URL 로딩 시작:', APP_CONFIG.appUrl);
    mainWindow.loadURL(APP_CONFIG.appUrl);
    debugLog('메인 윈도우 URL 로드 성공');
  }
  
  // 개발 환경에서 개발자 도구 열기
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  // 윈도우 닫힐 때 정리 작업
  mainWindow.on('closed', () => {
    global.appState.mainWindow = null;
  });
  
  // 윈도우 로드 완료 시 이벤트
  mainWindow.webContents.on('did-finish-load', () => {
    debugLog('메인 윈도우 로드 완료');
    
    // 키보드 리스너가 아직 초기화되지 않았다면 초기화
    if (!global.appState.keyboardInitialized) {
      initializeKeyboardListener();
    }
  });
  
  return mainWindow;
}

/**
 * 키보드 리스너 초기화 함수
 */
function initializeKeyboardListener() {
  try {
    debugLog('키보드 리스너 초기화 시작');
    
    // 이미 초기화된 경우 기존 리스너 정리
    if (global.appState.keyboardListener) {
      if (typeof global.appState.keyboardListener.dispose === 'function') {
        global.appState.keyboardListener.dispose();
      }
      global.appState.keyboardListener = null;
    }
    
    // 키보드 리스너 새로 설정
    global.appState.keyboardListener = setupKeyboardListener();
    
    // 전역 단축키 등록
    const registered = registerGlobalShortcuts();
    
    // 초기화 상태 저장
    global.appState.keyboardInitialized = !!global.appState.keyboardListener;
    
    debugLog(`키보드 리스너 초기화 ${global.appState.keyboardInitialized ? '성공' : '실패'}`);
    return global.appState.keyboardInitialized;
  } catch (error) {
    console.error('키보드 리스너 초기화 오류:', error);
    return false;
  }
}

/**
 * 앱 초기화 함수
 */
async function initialize() {
  debugLog('앱 초기화 시작');
  
  // 네이티브 모듈 초기화
  initializeNativeModule();
  
  // IPC 핸들러 등록
  registerAllIpcHandlers();
  
  // 앱 생명주기 이벤트 설정
  initializeAppLifecycle();
  
  // 메모리 모니터링 설정
  setupMemoryMonitoring();
  
  // 키보드 리스너 초기화
  initializeKeyboardListener();
  
  // 개발 환경에서는 자동으로 추적 시작 (옵션)
  if (process.env.NODE_ENV === 'development' &&
      global.appState.settings?.autoStartTracking) {
    debugLog('자동 모니터링 시작 설정 감지됨');
    global.appState.isTracking = true;
    
    // 키 입력 초기화 (stats.js)
    try {
      const stats = require('./stats');
      if (typeof stats.startTracking === 'function') {
        stats.startTracking();
      }
    } catch (error) {
      console.error('통계 모듈 초기화 오류:', error);
    }
  }
  
  debugLog('앱 초기화 완료');
}

/**
 * 앱 시작 함수
 */
app.whenReady().then(() => {
  createMainWindow();
  initialize();
  
  // macOS에서 앱 활성화 시 윈도우가 없으면 새로 생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 모든 창이 닫히면 앱 종료 (macOS 제외)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 앱 종료 전 정리 작업
app.on('before-quit', () => {
  global.appState.isQuitting = true;
  
  // 키보드 리스너 정리
  if (global.appState.keyboardListener && 
      typeof global.appState.keyboardListener.dispose === 'function') {
    global.appState.keyboardListener.dispose();
  }
  
  // 워커 풀 종료
  shutdownWorkerPool();
});

/**
 * IPC 이벤트 핸들러 설정
 */
ipcMain.handle('get-memory-usage', async () => {
  return process.memoryUsage();
});

ipcMain.handle('optimize-memory', async (event, aggressive) => {
  // 메모리 최적화를 수행하는 코드
  if (global.gc) {
    global.gc();
  }
  return process.memoryUsage();
});

/**
 * 키보드 모니터링 제어 IPC 핸들러
 */
ipcMain.handle('toggle-keyboard-monitoring', (event, enabled) => {
  global.appState.isTracking = enabled;
  console.log(`키보드 모니터링 ${enabled ? '활성화' : '비활성화'}`);
  return { success: true, trackingState: global.appState.isTracking };
});

ipcMain.handle('get-keyboard-status', () => {
  return { 
    isTracking: global.appState.isTracking,
    listenerActive: !!global.appState.keyboardListener
  };
});

/**
 * 앱 정보 반환
 */
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    osVersion: os.release(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpuCount: os.cpus().length
  };
});
