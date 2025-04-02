const { BrowserWindow, app, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const { appState, isDev } = require('./constants');
const { applyWindowMode, loadSettings } = require('./settings');
const { debugLog } = require('./utils');
const { setupTray } = require('./tray');

/**
 * 메인 윈도우 생성 함수
 */
async function createWindow() {
  try {
    // 이미 윈도우가 있는 경우 표시하고 포커스
    if (appState.mainWindow) {
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

    // GPU 가속 설정에 따른 옵션 설정
    const windowOptions = {
      width: Math.min(1200, width * 0.8),
      height: Math.min(800, height * 0.8),
      webPreferences: {
        preload: path.join(__dirname, '../../preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
      show: false, // 준비될 때까지 숨김
      backgroundColor: appState.settings?.darkMode ? '#121212' : '#f9f9f9',
      titleBarStyle: 'hidden',
      frame: false,
      icon: path.join(__dirname, '../../public/app_icon.webp'), // 아이콘 추가
      // GPU 가속 관련 설정 추가
      webPreferences: {
        preload: path.join(__dirname, '../../preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        // Chrome 스타일의 GPU 가속 설정
        enableWebSQL: false, // 더 이상 사용되지 않는 기능 비활성화
        enableBlinkFeatures: 'CSSColorSchemeUARendering',
        // GPU 가속 관련 설정 추가 - Chrome 스타일
        accelerator: appState.settings?.useHardwareAcceleration ? 'gpu' : 'cpu',
        // 하드웨어 가속 설정에 따른 옵션 
        offscreen: false,
      }
    };

    // 메인 윈도우 생성
    const mainWindow = new BrowserWindow(windowOptions);

    // 앱 상태에 저장
    appState.mainWindow = mainWindow;

    // 윈도우 모드 설정 적용
    if (appState.settings?.windowMode === 'fullscreen') {
      mainWindow.setFullScreen(true);
    } else if (appState.settings?.windowMode === 'fullscreen-auto-hide') {
      mainWindow.setFullScreen(true);
      appState.autoHideToolbar = true;
    }

    // 다크 모드 설정 적용
    if (appState.settings?.darkMode) {
      mainWindow.webContents.executeJavaScript(
        'document.documentElement.classList.add("dark-mode");'
      );
    }

    // 로드 URL 결정
    const startUrl = isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../../dist/index.html')}`;

    // URL 로드 및 이벤트 핸들러 설정
    debugLog(`메인 윈도우 URL 로딩 시작: ${startUrl}`);

    // 로딩 시 최대 재시도 횟수 및 재시도 간격 설정
    let retryCount = 0;
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 2000;

    const loadWithRetry = () => {
      mainWindow.loadURL(startUrl)
        .then(() => {
          debugLog('메인 윈도우 URL 로드 성공');
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
            const errorHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <title>연결 오류</title>
                <meta charset="UTF-8">
                <style>
                  body { font-family: Arial; padding: 20px; color: #333; background: #f0f0f0; }
                  .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                  h1 { color: #2196F3; }
                  pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; }
                  .error { color: #e53935; }
                  .solution { margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
                  button { padding: 10px 15px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; }
                  button:hover { background: #1976D2; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>Next.js 서버 연결 오류</h1>
                  <p>Next.js 서버에 연결할 수 없습니다.</p>
                  <p class="error">오류: Next.js 서버가 실행 중인지 확인하세요.</p>
                  <div class="solution">
                    <h3>해결 방법:</h3>
                    <p>터미널에서 아래 명령어 실행 후 앱을 다시 시작하세요:</p>
                    <ol>
                      <li>개발 모드: <code>npm run dev</code></li>
                      <li>또는 프로덕션 모드: <code>npm run build</code> 후 <code>npm run start</code></li>
                    </ol>
                    <button onclick="window.location.reload()">새로고침</button>
                    <button onclick="window.api.restartApp()">앱 재시작</button>
                  </div>
                </div>
                <script>
                  // 5초마다 자동으로 연결 재시도
                  setInterval(() => {
                    fetch('http://localhost:3000')
                      .then(response => {
                        if (response.status === 200) {
                          window.location.reload();
                        }
                      })
                      .catch(e => console.log('서버 확인 중...'));
                  }, 5000);
                </script>
              </body>
              </html>
            `;

            const tempPath = path.join(__dirname, '../../error.html');
            fs.writeFileSync(tempPath, errorHtml);

            return appState.mainWindow.loadFile(tempPath);
          }
        });
    };

    // 첫 로딩 시도 시작
    loadWithRetry();

    // 리소스 존재 여부 확인 및 누락된 리소스 생성
    ensureRequiredResources();

    // 윈도우 준비되면 표시
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();

      // 개발 모드에서만 개발자 도구 열기
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }

      // 앱 상태에 따라 트레이 아이콘 생성
      if (appState.settings?.minimizeToTray) {
        setupTray();
      }

      debugLog('메인 윈도우 준비됨');
    });

    // 윈도우 닫기 이벤트 처리
    mainWindow.on('close', (e) => {
      // 트레이로 최소화 설정 시 닫기 동작 가로채서 숨김으로 변경
      if (appState.settings?.minimizeToTray && !appState.allowQuit) {
        e.preventDefault();
        mainWindow.hide();

        // 트레이 알림 설정이 활성화된 경우 알림 표시
        if (appState.settings.showTrayNotifications && appState.tray) {
          appState.tray.displayBalloon({
            title: 'Loop',
            content: '앱이 트레이로 최소화되었습니다. 계속 모니터링 중입니다.',
            iconType: 'info'
          });
        }

        return false;
      }
    });

    // 윈도우 닫힘 이벤트 처리
    mainWindow.on('closed', () => {
      appState.mainWindow = null;

      // 미니뷰도 함께 닫기
      if (appState.miniViewWindow && !appState.miniViewWindow.isDestroyed()) {
        appState.miniViewWindow.close();
        appState.miniViewWindow = null;
      }
    });

    return mainWindow;
  } catch (error) {
    console.error('윈도우 생성 오류:', error);
    throw error;
  }
}

/**
 * 필수 리소스 파일 존재 여부 확인 및 생성
 */
function ensureRequiredResources() {
  const fs = require('fs');
  const path = require('path');

  // 앱 아이콘 확인
  const iconPath = path.join(app.getAppPath(), 'public', 'app-icon.png');
  const iconExists = fs.existsSync(iconPath);

  if (!iconExists) {
    debugLog('앱 아이콘을 찾을 수 없습니다. 빈 아이콘 생성...');

    try {
      // public 디렉토리 존재 확인
      const publicDir = path.join(app.getAppPath(), 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      // 기본 아이콘 복사 또는 생성
      const defaultIconPath = path.join(__dirname, '..', '..', 'resources', 'default-icon.png');

      if (fs.existsSync(defaultIconPath)) {
        // 기본 아이콘 복사
        fs.copyFileSync(defaultIconPath, iconPath);
      } else {
        // 간단한 앱 아이콘 생성 (1x1 투명 픽셀)
        const emptyPNG = Buffer.from([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
          0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
          0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
          0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
          0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
          0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);

        fs.writeFileSync(iconPath, emptyPNG);
      }

      debugLog('기본 앱 아이콘이 생성되었습니다.');
    } catch (error) {
      console.error('앱 아이콘 생성 중 오류:', error);
    }
  }
}

/**
 * 백그라운드 모드에서 리소스 사용 최적화
 */
function optimizeForBackground() {
  if (!appState.mainWindow) return;

  try {
    // 백그라운드에서 업데이트 간격 크게 늘리기
    if (appState.updateInterval) {
      clearInterval(appState.updateInterval);
      appState.updateInterval = setInterval(() => {
        // 백그라운드에서는 10초마다 업데이트 (이전보다 긴 간격)
        if (appState.isTracking) {
          require('./stats').updateAndSendStats();
        }
      }, 10000); // 10초로 증가
    }

    // 애니메이션/렌더링 중지를 위한 CSS 삽입
    const backgroundModeCss = `
      * {
        animation-play-state: paused !important;
        transition: none !important;
        animation: none !important;
      }
      .chart-container, canvas, .animation, img:not([data-keep-visible]) {
        display: none !important;
      }
      /* 숨겨진 탭 콘텐츠 완전히 제거 */
      .tab-content:not(.active) {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
      }
    `;

    // 기존 키가 있으면 제거
    if (appState.backgroundCssKey) {
      appState.mainWindow.webContents.removeInsertedCSS(appState.backgroundCssKey);
      appState.backgroundCssKey = null;
    }

    // 새 CSS 삽입
    appState.mainWindow.webContents.insertCSS(backgroundModeCss)
      .then(key => {
        appState.backgroundCssKey = key;
        debugLog('백그라운드 모드 CSS 적용됨');
      });

    // 웹 컨텐츠에 백그라운드 모드 알림
    appState.mainWindow.webContents.send('background-mode', true);

    // 메모리 GC 트리거 - 백그라운드로 전환 시 메모리 정리
    setTimeout(() => {
      global.gc && global.gc();
    }, 1000);

  } catch (error) {
    debugLog('백그라운드 최적화 오류:', error);
  }
}

/**
 * 백그라운드 최적화 해제
 */
function disableBackgroundOptimization() {
  if (!appState.mainWindow) return;

  try {
    // 삽입된 CSS 제거
    if (appState.backgroundCssKey) {
      appState.mainWindow.webContents.removeInsertedCSS(appState.backgroundCssKey);
      appState.backgroundCssKey = null;
      debugLog('백그라운드 모드 CSS 해제됨');
    }

    // 앱에 표시 모드 알림
    appState.mainWindow.webContents.send('background-mode', false);

  } catch (error) {
    debugLog('백그라운드 최적화 해제 오류:', error);
  }
}

/**
 * 미니뷰 창 생성 함수
 */
function createMiniViewWindow() {
  const miniViewConfig = {
    width: 50,
    height: 50,
    minWidth: 50,
    minHeight: 50,
    maxWidth: 320,
    maxHeight: 250,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: 'Loop 미니뷰',
    icon: path.join(__dirname, '../../public/app_icon.webp'), // 아이콘 추가
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload.js'),
      // 메모리 최적화 설정 추가
      backgroundThrottling: true,
      enableWebSQL: false,
      webgl: false,
      webaudio: false,
      spellcheck: false,
      devTools: false, // 개발자 도구 비활성화
      disableHardwareAcceleration: !appState.settings.useHardwareAcceleration
    },
    show: false,
    movable: true,
    acceptFirstMouse: false,
  };
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  miniViewConfig.x = width - 70;
  miniViewConfig.y = 70;

  appState.miniViewWindow = new BrowserWindow(miniViewConfig);

  // 창이 생성된 후 추가 설정
  appState.miniViewWindow.setIgnoreMouseEvents(false, { forward: false });

  const miniViewUrl = isDev
    ? 'http://localhost:3000/mini-view'
    : 'http://localhost:3000/mini-view';

  appState.miniViewWindow.loadURL(miniViewUrl);

  appState.miniViewWindow.once('ready-to-show', () => {
    appState.miniViewWindow.show();
  });

  appState.miniViewWindow.on('resize', () => {
    const [width, height] = appState.miniViewWindow.getSize();
    if (width > 50 && height > 50) {
      appState.miniViewLastMode = 'expanded';
    } else {
      appState.miniViewLastMode = 'collapsed';
    }
  });

  return appState.miniViewWindow;
}

/**
 * 미니뷰 토글 함수
 */
function toggleMiniView() {
  try {
    debugLog('미니뷰 토글 함수 호출됨');

    if (appState.miniViewWindow && !appState.miniViewWindow.isDestroyed()) {
      appState.miniViewWindow.close();
      appState.miniViewWindow = null;
      debugLog('미니뷰 닫힘');
    } else {
      const miniView = createMiniViewWindow();

      // 미니뷰가 준비되면 크기를 아이콘 모드로 확실히 설정
      miniView.once('ready-to-show', () => {
        miniView.setSize(50, 50);
        appState.miniViewLastMode = 'icon';
      });

      debugLog('미니뷰 생성됨');
    }
  } catch (error) {
    console.error('미니뷰 토글 중 오류:', error);
  }
}

/**
 * 미니뷰에 통계 데이터 전송
 */
function startSendingStatsToMiniView() {
  if (appState.miniViewStatsInterval) {
    clearInterval(appState.miniViewStatsInterval);
  }

  // 업데이트 주기 증가(5초) - 불필요한 IPC 통신 최소화
  appState.miniViewStatsInterval = setInterval(() => {
    if (appState.miniViewWindow && !appState.miniViewWindow.isDestroyed()) {
      try {
        // 메모리 사용량이 임계치(100MB) 이상일 때 GC 유도
        const memoryInfo = process.memoryUsage();
        if (memoryInfo.heapUsed > 100 * 1024 * 1024) { // 100MB
          global.gc && global.gc();
          debugLog('메모리 사용량 높음: GC 실행됨', Math.round(memoryInfo.heapUsed / (1024 * 1024)) + 'MB');
        }

        appState.miniViewWindow.webContents.send('mini-view-stats-update', {
          keyCount: appState.currentStats.keyCount,
          typingTime: appState.currentStats.typingTime,
          windowTitle: appState.currentStats.currentWindow,
          browserName: appState.currentStats.currentBrowser,
          totalChars: appState.currentStats.totalChars,
          totalWords: appState.currentStats.totalWords,
          accuracy: appState.currentStats.accuracy,
          isTracking: appState.isTracking
        });
      } catch (error) {
        debugLog('미니뷰 통계 전송 오류:', error);
      }
    } else {
      // 미니뷰가 닫혔으면 인터벌 중지
      clearInterval(appState.miniViewStatsInterval);
      appState.miniViewStatsInterval = null;
    }
  }, 5000); // 3초에서 5초로 늘림

  // 미니뷰가 열릴 때 초기 데이터 즉시 전송
  if (appState.miniViewWindow && !appState.miniViewWindow.isDestroyed()) {
    setTimeout(() => {
      try {
        appState.miniViewWindow.webContents.send('mini-view-stats-update', {
          keyCount: appState.currentStats.keyCount,
          typingTime: appState.currentStats.typingTime,
          windowTitle: appState.currentStats.currentWindow,
          browserName: appState.currentStats.currentBrowser,
          totalChars: appState.currentStats.totalChars,
          totalWords: appState.currentStats.totalWords,
          accuracy: appState.currentStats.accuracy,
          isTracking: appState.isTracking // 모니터링 상태 추가
        });
      } catch (error) {
        debugLog('미니뷰 초기 통계 전송 오류:', error);
      }
    }, 500); // 미니뷰가 준비되기를 기다림
  }
}

/**
 * 재시작 안내 창 생성
 */
function createRestartPromptWindow() {
  debugLog('재시작 안내 창 생성 중...');

  try {
    // 메인 화면 크기 가져오기
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // 재시작 창 생성 (메인 창보다 작게)
    const restartWindow = new BrowserWindow({
      width: 400,
      height: 250,
      title: '앱 재시작',
      center: true,
      resizable: false,
      // cspell:disable-next-line
      minimizable: false,
      // cspell:disable-next-line
      maximizable: false,
      // cspell:disable-next-line
      fullscreenable: false,
      backgroundColor: appState.settings?.darkMode ? '#1E1E1E' : '#FFFFFF',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/restart.js')
      },
      show: false,
      parent: appState.mainWindow || null,
      modal: true,
      frame: false,
      skipTaskbar: true,
      icon: path.join(__dirname, '../../public/app_icon.webp'), // 아이콘 추가
    });

    const restartPageUrl = url.format({
      pathname: path.join(__dirname, '../renderer/restart.html'),
      protocol: 'file:',
      slashes: true
    });

    // HTML 페이지 로드
    restartWindow.loadURL(restartPageUrl);

    // 개발자 도구 (개발 환경에서만)
    if (isDev) {
      restartWindow.webContents.openDevTools({ mode: 'detach' });
    }

    // 창이 준비되면 표시
    restartWindow.once('ready-to-show', () => {
      restartWindow.show();
      restartWindow.focus();
    });

    // 창이 닫힐 때 참조 제거
    restartWindow.on('closed', () => {
      appState.restartWindow = null;
    });

    // 전역 상태에 창 참조 저장
    appState.restartWindow = restartWindow;

    return restartWindow;
  } catch (error) {
    console.error('재시작 창 생성 중 오류:', error);
    return null;
  }
}

/**
 * 재시작 창 생성 함수
 */
function createRestartWindow(reason = 'GPU 가속 설정이 변경되었습니다.') {
  if (appState.restartWindow) {
    appState.restartWindow.focus();
    return;
  }

  appState.restartWindow = new BrowserWindow({
    width: 400,
    height: 250,
    resizable: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/restart.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false,
    center: true,
    icon: path.join(__dirname, '../../public/app_icon.webp'), // 아이콘 추가
  });

  if (isDev) {
    // 개발 환경에서는 Next.js 개발 서버의 /restart 경로 사용
    appState.restartWindow.loadURL('http://localhost:3000/restart?reason=' + encodeURIComponent(reason));
  } else {
    // 프로덕션 환경에서는 정적 빌드된 파일 사용 (경로 수정)
    appState.restartWindow.loadFile(path.join(__dirname, '../../dist/restart.html'), {
      query: { reason: reason }
    });
  }

  // 창이 준비되면 보여주기
  appState.restartWindow.once('ready-to-show', () => {
    appState.restartWindow.show();
    appState.restartWindow.focus();
  });

  appState.restartWindow.on('closed', () => {
    appState.restartWindow = null;
  });
}

// getMainWindow 함수 추가 - main.js에서 필요함
function getMainWindow() {
  return appState.mainWindow;
}

module.exports = {
  createWindow,
  optimizeForBackground,
  disableBackgroundOptimization,
  createMiniViewWindow,
  toggleMiniView,
  createRestartPromptWindow,
  createRestartWindow,
  getMainWindow  // 이 함수 추가
};
