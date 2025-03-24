/**
 * Electron 메인 프로세스 진입점
 * 
 * 애플리케이션의 창 생성 및 이벤트 처리를 담당합니다.
 */

const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const os = require('os');
const { setupMemoryMonitoring } = require('./memory');
const { initializeWorkerPool, shutdownWorkerPool } = require('./workers');

// 개발 모드 체크
const isDev = process.env.NODE_ENV === 'development';

// 윈도우 인스턴스 유지
let mainWindow;

// 앱 설정
const APP_CONFIG = {
  minWidth: 800,
  minHeight: 600,
  defaultWidth: 1200,
  defaultHeight: 800,
  backgroundColor: '#f5f5f5',
  title: '타이핑 통계',
  appUrl: isDev ? 'http://localhost:3000' : 'https://your-production-url.com',
};

/**
 * 메인 윈도우 생성
 */
function createMainWindow() {
  // BrowserWindow 인스턴스 생성
  mainWindow = new BrowserWindow({
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
  mainWindow.loadURL(APP_CONFIG.appUrl);

  // 개발 모드에서는 개발자 도구 자동 열기
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // 창이 준비되면 표시
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 창이 닫힐 때 이벤트 처리
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 메모리 모니터링 시작
  setupMemoryMonitoring(mainWindow);

  // 워커 풀 초기화
  initializeWorkerPool();

  return mainWindow;
}

/**
 * 앱 초기화
 */
app.whenReady().then(() => {
  createMainWindow();

  // macOS에서 앱 활성화 시 윈도우가 없으면 새로 생성
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

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
