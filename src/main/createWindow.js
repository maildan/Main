const { BrowserWindow, app, screen, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const url = require('url');
const isDev = process.env.NODE_ENV === 'development';
const { eventEmitter } = require('./event-bus');
const { loadSettings, saveSettings, applyDarkMode, getDarkMode } = require('./settings');
const { debugLog } = require('./utils/logger');
const { appState, APP_PATHS, UI_CONSTANTS } = require('./constants');
const fs = require('fs');

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
    frame: false, // OS 기본 프레임 및 타이틀 바 제거
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#121212' : '#FFFFFF',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false,
      preload: path.join(__dirname, '../preload/preload.js')
    }
  };

  return options;
}

/**
 * 메인 윈도우를 생성하는 함수
 * @returns {Promise<BrowserWindow>} 생성된 Electron 창 객체
 */
async function createMainWindow() {
  try {
    // 이미 윈도우가 있는 경우 표시하고 포커스
    if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
      if (appState.mainWindow.isMinimized()) {
        appState.mainWindow.restore();
      }
      appState.mainWindow.focus();
      return appState.mainWindow;
    }

    // 설정 로드
    await loadSettings();

    // 화면 크기 가져오기
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // 창 옵션 설정
    const windowOptions = {
      width: Math.min(UI_CONSTANTS.defaultWidth, width * 0.8),
      height: Math.min(UI_CONSTANTS.defaultHeight, height * 0.8),
      minWidth: UI_CONSTANTS.minWidth,
      minHeight: UI_CONSTANTS.minHeight,
      webPreferences: {
        preload: APP_PATHS.preload,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        // GPU 가속 관련 설정
        enableWebSQL: false,
        enableBlinkFeatures: 'CSSColorSchemeUARendering',
        // GPU 가속 설정
        accelerator: appState.settings?.useHardwareAcceleration ? 'gpu' : 'cpu',
        disableHardwareAcceleration: !appState.settings?.useHardwareAcceleration,
        webgl: appState.settings?.useHardwareAcceleration !== false,
        // 성능 최적화 설정
        backgroundThrottling: true,
        safeDialogs: true,
        spellcheck: false
      },
      show: false, // 준비될 때까지 숨김
      backgroundColor: appState.settings?.darkMode ? '#121212' : '#f9f9f9',
      frame: true,
      titleBarStyle: 'default',
      titleBarOverlay: false,
      autoHideMenuBar: true,
      icon: path.join(app.getAppPath(), 'public/app_icon.webp'),
    };

    // 창 생성
    const mainWindow = new BrowserWindow(windowOptions);
    appState.mainWindow = mainWindow;

    // 창이 준비되면 표시
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.focus();
      
      // 시작시 최소화 설정이 있으면 적용
      if (appState.settings?.startMinimized) {
        mainWindow.minimize();
      }
    });

    // 테마 설정 처리
    setupThemeHandlers(mainWindow);
    
    // 창 모드 설정 적용
    applyWindowMode(mainWindow);

    // URL 로드
    await loadAppUrl(mainWindow);

    return mainWindow;
  } catch (error) {
    debugLog('창 생성 중 오류:', error);
    throw error;
  }
}

/**
 * 테마 관련 이벤트 핸들러 설정
 * @param {BrowserWindow} window - 대상 창
 */
function setupThemeHandlers(window) {
  // 테마 설정 유지를 위한 이벤트 리스너 설정
  window.webContents.on('did-finish-load', () => {
    // 설정된 다크 모드 상태를 로컬 스토리지에 저장하는 스크립트 실행
    const script = `
      try {
        const isDarkMode = document.documentElement.classList.contains('dark-mode');
        const settings = JSON.parse(localStorage.getItem('app-settings') || '{}');
        settings.darkMode = isDarkMode;
        localStorage.setItem('app-settings', JSON.stringify(settings));
        
        // 세션 스토리지에도 저장 (새로고침 시 유지용)
        sessionStorage.setItem('theme-refresh-state', isDarkMode ? 'dark' : 'light');
      } catch (e) {
        console.error('테마 설정 저장 오류:', e);
      }
    `;
    
    window.webContents.executeJavaScript(script)
      .catch(err => console.error('테마 설정 저장 스크립트 실행 오류:', err));
  });

  // 다크 모드 설정 적용
  if (appState.settings?.darkMode) {
    window.webContents.executeJavaScript(
      'document.documentElement.classList.add("dark-mode"); document.body.classList.add("dark-mode");'
    ).catch(err => {
      console.error('다크 모드 CSS 적용 오류:', err);
    });
    
    // 배경색도 같이 변경
    window.setBackgroundColor('#121212');
  } else {
    // 라이트 모드 명시적 적용
    window.webContents.executeJavaScript(
      'document.documentElement.classList.remove("dark-mode"); document.body.classList.remove("dark-mode");'
    ).catch(err => {
      console.error('라이트 모드 CSS 적용 오류:', err);
    });
    
    // 배경색 설정
    window.setBackgroundColor('#f9f9f9');
  }
}

/**
 * 창 모드 적용 (전체화면, 자동 숨김 등)
 * @param {BrowserWindow} window - 대상 창
 */
function applyWindowMode(window) {
  // 윈도우 모드 설정 적용
  if (appState.settings?.windowMode === 'fullscreen') {
    window.setFullScreen(true);
  } else if (appState.settings?.windowMode === 'fullscreen-auto-hide') {
    window.setFullScreen(true);
    // 자동 숨김 경우 커스텀 CSS 삽입
    appState.autoHideToolbar = true;
  }
}

/**
 * 앱 URL 로드 (개발/프로덕션 환경에 따라 다른 URL 사용)
 * @param {BrowserWindow} window - 대상 창
 */
async function loadAppUrl(window) {
  // 로드 URL 결정
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(app.getAppPath(), 'dist/renderer/index.html')}`;

  // URL 로드 및 이벤트 핸들러 설정
  debugLog(`메인 윈도우 URL 로딩 시작: ${startUrl}`);

  // 로딩 시 최대 재시도 횟수 및 재시도 간격 설정
  let retryCount = 0;
  const MAX_RETRIES = 30;
  const RETRY_DELAY = 2000;

  return new Promise((resolve, reject) => {
    const loadWithRetry = () => {
      window.loadURL(startUrl)
        .then(() => {
          debugLog('메인 윈도우 URL 로드 성공');
          resolve();
        })
        .catch(err => {
          debugLog(`URL 로드 실패 (${retryCount + 1}/${MAX_RETRIES}): ${err.message}`);

          if (retryCount < MAX_RETRIES) {
            retryCount++;
            debugLog(`${RETRY_DELAY}ms 후 재시도...`);
            setTimeout(loadWithRetry, RETRY_DELAY);
          } else {
            debugLog('최대 재시도 횟수 초과, 오류 화면 표시');

            // 오류 화면 표시
            showErrorScreen(window);
            reject(new Error(`URL 로드 실패: ${err.message}`));
          }
        });
    };
    
    loadWithRetry();
  });
}

/**
 * 오류 화면 표시
 * @param {BrowserWindow} window - 대상 창
 */
function showErrorScreen(window) {
  try {
    // 오류 화면 HTML 파일 경로
    const errorHtmlPath = path.join(app.getAppPath(), 'error.html');
    
    // 파일 존재 확인
    if (fs.existsSync(errorHtmlPath)) {
      window.loadFile(errorHtmlPath)
        .catch(err => console.error('오류 화면 로드 실패:', err));
    } else {
      // 오류 화면 HTML이 없는 경우 인라인 HTML 생성
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Next.js 서버 연결 오류</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial; padding: 20px; color: #333; background: #f0f0f0; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2196F3; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; }
            .error { color: #e53935; }
            .solution { margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
            button { padding: 10px 15px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px; }
            button:hover { background: #1976D2; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>연결 오류</h1>
            <p>앱을 시작하는 중 오류가 발생했습니다.</p>
            <div class="solution">
              <h2>해결 방법:</h2>
              <p>1. 앱을 재시작하세요.</p>
              <p>2. 개발 서버가 실행 중인지 확인하세요.</p>
              <p>3. 방화벽 설정을 확인하세요.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`)
        .catch(err => console.error('인라인 오류 화면 로드 실패:', err));
    }
  } catch (error) {
    console.error('오류 화면 표시 실패:', error);
  }
}

/**
 * 메인 윈도우 객체 반환
 * @returns {BrowserWindow|null} 메인 윈도우 객체 또는 null
 */
function getMainWindow() {
  return appState.mainWindow;
}

// 모듈 내보내기
module.exports = {
  createWindow: createMainWindow,
  getMainWindow,
  applyWindowMode,
  showErrorScreen
}; 