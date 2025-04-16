const { BrowserWindow, app, screen, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const url = require('url');
const isDev = process.env.NODE_ENV === 'development';
const { eventEmitter } = require('./event-bus');
const { loadSettings, saveSettings, applyDarkMode, getDarkMode } = require('./settings');
const { debugLog } = require('./utils/logger');
const { appState } = require('./constants');

let mainWindow = null;

/**
 * 윈도우 옵션을 OS에 따라 반환하는 함수
 */
function getWindowOptions() {
  // 기본 옵션
  const options = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: true, // OS 기본 타이틀 바 사용
    titleBarStyle: 'default',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#121212' : '#FFFFFF',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  };

  // OS별 특정 설정
  if (process.platform === 'darwin') {
    // macOS 설정
    options.titleBarStyle = 'hiddenInset';
  } else if (process.platform === 'win32') {
    // Windows 설정
    options.autoHideMenuBar = true;
  } else {
    // Linux/기타 설정
    options.autoHideMenuBar = true;
  }

  return options;
}

/**
 * 메인 윈도우 생성 함수
 */
async function createWindow() {
  try {
    // 이미 윈도우가 열려있는지 확인
    if (appState.mainWindow) {
      // 이미 열려있지만 최소화된 경우 복원
      if (appState.mainWindow.isMinimized()) {
        appState.mainWindow.restore();
      }
      // 포커스 설정
      appState.mainWindow.focus();
      return appState.mainWindow;
    }

    // 설정 로드
    const settings = await loadSettings();
    
    // 윈도우 옵션 가져오기
    const windowOptions = getWindowOptions();
    
    // 저장된 창 크기 및 위치 적용
    if (settings.windowBounds) {
      const { x, y, width, height } = settings.windowBounds;
      if (width && height) {
        windowOptions.width = width;
        windowOptions.height = height;
      }
      
      // 창 위치가 유효한지 확인 (화면 안에 있는지)
      const displays = screen.getAllDisplays();
      const isValidPosition = displays.some(display => {
        const { bounds } = display;
        return (
          x >= bounds.x && 
          y >= bounds.y && 
          x < bounds.x + bounds.width && 
          y < bounds.y + bounds.height
        );
      });
      
      if (isValidPosition && x !== undefined && y !== undefined) {
        windowOptions.x = x;
        windowOptions.y = y;
      }
    }
    
    // 다크 모드 상태 가져오기 및 적용
    const isDarkMode = getDarkMode();
    windowOptions.backgroundColor = isDarkMode ? '#121212' : '#FFFFFF';
    
    // 윈도우 생성
    appState.mainWindow = new BrowserWindow(windowOptions);
    
    // 개발 환경에서는 개발자 도구 열기
    if (process.env.NODE_ENV === 'development') {
      appState.mainWindow.webContents.openDevTools();
    }
    
    // 앱 URL 설정
    const appUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : url.format({
          pathname: path.join(__dirname, '../../renderer/index.html'),
          protocol: 'file:',
          slashes: true
        });
    
    // 페이지 로드
    await appState.mainWindow.loadURL(appUrl);
    
    // 닫기 이벤트 처리
    appState.mainWindow.on('close', (event) => {
      // 닫기 전에 창 크기 및 위치 저장
      if (!appState.mainWindow.isMaximized()) {
        const bounds = appState.mainWindow.getBounds();
        appState.settings.windowBounds = bounds;
        require('./settings').saveSettings({ windowBounds: bounds });
      }
    });
    
    // 크기 변경 이벤트 처리
    appState.mainWindow.on('resize', () => {
      // 최대화 상태가 아닐 때만 크기 저장
      if (!appState.mainWindow.isMaximized()) {
        const bounds = appState.mainWindow.getBounds();
        appState.settings.windowBounds = bounds;
      }
    });
    
    // 다크 모드 설정 적용
    await applyDarkMode(isDarkMode, appState.mainWindow);
    
    // 디스플레이 매트릭스 변경 이벤트 처리
    screen.on('display-metrics-changed', () => {
      if (appState.mainWindow) {
        // 화면 크기 변경 시 창 위치 확인 및 조정
        const { width, height } = screen.getPrimaryDisplay().workAreaSize;
        appState.mainWindow.webContents.send('display-metrics-changed', { width, height });
      }
    });
    
    return appState.mainWindow;
  } catch (error) {
    console.error('윈도우 생성 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 메인 윈도우 인스턴스 가져오기
 */
function getMainWindow() {
  return mainWindow;
}

module.exports = {
  createWindow,
  getMainWindow
}; 