/**
 * 애플리케이션 메인 엔트리 포인트
 */

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const os = require('os');
const { setupMemoryMonitoring } = require('./memory.cjs');
const { initializeWorkerPool, shutdownWorkerPool } = require('./workers.cjs');
const { initializeAppLifecycle } = require('./app-lifecycle.cjs');
const { registerAllIpcHandlers } = require('./ipc-handlers.cjs');
const { initializeNativeModule } = require('./memory-manager-native.cjs');

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
  }
};

// 앱이 준비되었을 때 실행
app.whenReady().then(() => {
  console.log('앱 초기화 시작...');
  
  // 설정 로드
  loadSettings();
  
  // IPC 핸들러 등록
  registerAllIpcHandlers();
  
  // 네이티브 모듈 초기화 시도
  const nativeAvailable = initializeNativeModule();
  console.log(`네이티브 모듈 초기화 ${nativeAvailable ? '성공' : '실패'}`);
  
  // 앱 생명주기 초기화
  initializeAppLifecycle(global.appState.settings);
  
  // 메인 창 생성
  createMainWindow();
});

// 설정 로드 함수
function loadSettings() {
  try {
    // TODO: 실제 설정 로드 로직 구현
    global.appState.settings = {
      reduceMemoryInBackground: true,
      maxMemoryThreshold: 150,
      useHardwareAcceleration: true,
      processingMode: 'auto'
    };
  } catch (error) {
    console.error('설정 로드 중 오류:', error);
    
    // 기본 설정 사용
    global.appState.settings = {
      reduceMemoryInBackground: true,
      maxMemoryThreshold: 150,
      useHardwareAcceleration: true,
      processingMode: 'auto'
    };
  }
}

// 메인 창 생성 함수
function createMainWindow() {
  // BrowserWindow 인스턴스 생성
  global.appState.mainWindow = new BrowserWindow({
    width: APP_CONFIG.defaultWidth,
    height: APP_CONFIG.defaultHeight,
    minWidth: APP_CONFIG.minWidth,
    minHeight: APP_CONFIG.minHeight,
    backgroundColor: APP_CONFIG.backgroundColor,
    title: APP_CONFIG.title,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    show: false // 준비될 때까지 표시하지 않음
  });

  // 앱 URL 로드
  global.appState.mainWindow.loadURL(APP_CONFIG.appUrl);

  // 개발 모드에서는 개발자 도구 자동 열기
  if (global.appState.isDevelopment) {
    global.appState.mainWindow.webContents.openDevTools();
  }

  // 창이 준비되면 표시
  global.appState.mainWindow.once('ready-to-show', () => {
    global.appState.mainWindow.show();
  });

  // 창이 닫힐 때 이벤트 처리
  global.appState.mainWindow.on('closed', () => {
    global.appState.mainWindow = null;
  });

  // 메모리 모니터링 시작
  setupMemoryMonitoring(global.appState.mainWindow);

  // 워커 풀 초기화
  initializeWorkerPool();

  return global.appState.mainWindow;
}

/**
 * 모든 창이 닫히면 앱 종료 (Windows & Linux)
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 워커 풀 종료
    shutdownWorkerPool();
    app.quit();
  }
});

/**
 * 앱 종료 전 정리
 */
app.on('before-quit', () => {
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

/**
 * macOS에서 앱 활성화 시 윈도우가 없으면 새로 생성
 */
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
