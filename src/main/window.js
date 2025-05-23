const { BrowserWindow, app, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const http = require('http');
const { appState } = require('./constants');
const { applyWindowMode, loadSettings } = require('./settings');
const { debugLog } = require('./utils');
const { setupTray } = require('./tray');
const securityChecks = require('./security-checks');

// 개발 모드 여부 직접 확인
const isDev = process.env.NODE_ENV === 'development';
// Next.js 서버 포트 (3000으로 고정)
const nextPort = process.env.NEXT_PORT || 3000;

/**
 * Next.js 서버가 준비되었는지 확인하는 함수
 */
function checkIfNextServerReady() {
  return new Promise((resolve, reject) => {
    debugLog('Next.js 서버 준비 상태 확인 중...');
    
    debugLog(`포트 ${nextPort} 확인 중...`);

    // 타임아웃 설정
    const timeout = setTimeout(() => {
      debugLog('Next.js 서버 연결 타임아웃. 기본 3000 포트 사용');
      resolve(3000); // 기본값으로 3000 반환
    }, 10000);

    const checkServer = () => {
      const options = {
        hostname: 'localhost',
        port: nextPort,
        path: '/',
        method: 'HEAD',
        timeout: 2000
      };

      const req = http.request(options, (res) => {
        clearTimeout(timeout);
        if (res.statusCode === 200 || res.statusCode === 304) {
          debugLog(`Next.js 서버가 포트 ${nextPort}에서 실행 중입니다.`);
          resolve(nextPort);
        } else {
          debugLog(`Next.js 서버 응답 코드: ${res.statusCode}, 다시 시도 중...`);
          setTimeout(checkServer, 1000);
        }
      });

      req.on('error', (error) => {
        debugLog(`Next.js 서버 연결 오류: ${error.message}, 다시 시도 중...`);
        setTimeout(checkServer, 1000);
      });

      req.end();
    };

    // 서버 준비 상태 확인 시작
    checkServer();
  });
}

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

    // 앱 아이콘 설정
    let iconPath;
    try {
      // 여러 가능한 아이콘 경로 시도
      const possiblePaths = [
        // appState에 저장된 아이콘 경로를 먼저 시도
        appState.appIcon,
        path.join(__dirname, '../../public/app_icon.webp'),
        path.join(__dirname, '../../public/app-icon.png'),
        path.join(__dirname, '../../assets/app_icon.webp'),
        path.join(app.getAppPath(), 'public/app_icon.webp'),
        path.join(app.getAppPath(), 'public/app-icon.png')
      ];
      
      // 실제로 존재하는 첫 번째 아이콘 파일 찾기
      for (const candidate of possiblePaths) {
        if (candidate && fs.existsSync(candidate)) {
          iconPath = candidate;
          debugLog(`유효한 아이콘 찾음: ${candidate}`);
          break;
        }
      }
      
      if (!iconPath) {
        debugLog('유효한 아이콘을 찾을 수 없음, 기본값 사용');
      }
    } catch (error) {
      debugLog(`아이콘 경로 설정 오류: ${error.message}`);
    }

    // 메인 윈도우 생성
    appState.mainWindow = new BrowserWindow({
      width: Math.min(1280, width),
      height: Math.min(800, height),
      minWidth: 800,
      minHeight: 600,
      backgroundColor: '#000000', // 검은색 배경이 더 전문적
      icon: iconPath,
      show: false, // 렌더링 완료 후 표시하기 위해 숨김 상태로 시작
      webPreferences: {
        nodeIntegration: false, // 보안을 위해 비활성화
        contextIsolation: true, // 보안을 위해 활성화
        sandbox: false, // contextIsolation이 적용되어 있으므로 sandbox는 해제
        preload: path.join(__dirname, '../preload/preload.js'), // preload.js 경로 수정
        devTools: true, // 개발 모드에서는 항상 DevTools 활성화
        
        // 보안 관련 설정
        webSecurity: !isDev, // 개발 환경에서는 웹 보안 비활성화
        allowRunningInsecureContent: isDev, // 개발 환경에서는 안전하지 않은 콘텐츠 허용
      }
    });

    // 개발 환경에서만 DevTools 열기
    if (isDev) {
      appState.mainWindow.webContents.openDevTools({ mode: 'detach', activate: false });
      
      // 개발 환경에서 CSP 관련 회피 설정 (개선된 방식)
      appState.mainWindow.webContents.session.webRequest.onHeadersReceived(
        { urls: ['*://*/*'] },
        (details, callback) => {
          const responseHeaders = {...details.responseHeaders};
          
          // CSP 헤더 제거
          Object.keys(responseHeaders).forEach(key => {
            if (key.toLowerCase().includes('content-security-policy')) {
              delete responseHeaders[key];
            }
          });
          
          callback({ responseHeaders });
        }
      );
    }

    // 준비되면 창 보여주기
    appState.mainWindow.once('ready-to-show', () => {
      debugLog('창이 표시 준비됨, 보여주기 시작');
      appState.mainWindow.show();
      debugLog('메인 윈도우 표시 완료');
      debugLog('메인 윈도우 준비됨');
    });

    // 보안 설정 적용
    try {
      debugLog('창에 보안 설정 적용됨');
      securityChecks.applySecuritySettings(appState.mainWindow, isDev);
    } catch (error) {
      console.error('보안 설정 적용 중 오류:', error);
    }

    // 렌더링 실패 이벤트 모니터링
    appState.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('페이지 로딩 실패:', errorCode, errorDescription);
      // 오류 페이지 표시 (필요시)
    });

    // DOM 준비 이벤트
    appState.mainWindow.webContents.on('dom-ready', () => {
      debugLog('DOM이 준비됨, 문서 렌더링 중...');
    });

    // 렌더러 프로세스의 콘솔 메시지 캡처
    appState.mainWindow.webContents.on('console-message', (event, level, message) => {
      const LEVELS = ['info', 'warn', 'error', 'debug'];
      console.log(`[렌더러-${LEVELS[level] || 'info'}] ${message}`);
    });

    // 로드 실패 이벤트 처리
    appState.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`[로드 실패] 코드: ${errorCode}, 설명: ${errorDescription}, URL: ${validatedURL}`);
      
      // 로드 실패 시 간단한 오류 페이지 표시
      appState.mainWindow.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="padding: 20px; font-family: Arial, sans-serif;">' +
          '<h2>페이지 로딩 실패</h2>' +
          '<p>오류 코드: ${errorCode}</p>' +
          '<p>설명: ${errorDescription}</p>' +
          '<p>URL: ${validatedURL}</p>' +
          '<button onclick="location.reload()">다시 시도</button>' +
        '</div>';
        document.body.style.backgroundColor = "#f9f9f9";
        document.body.style.color = "#333";
      `).catch(err => console.error('에러 페이지 표시 중 오류:', err));
    });

    // 렌더링 프로세스 충돌 처리
    appState.mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error(`[렌더러 충돌] 이유: ${details.reason}, 종료 코드: ${details.exitCode}`);
    });

    // 윈도우 모드 설정 적용
    if (appState.settings?.windowMode === 'fullscreen') {
      appState.mainWindow.setFullScreen(true);
    } else if (appState.settings?.windowMode === 'fullscreen-auto-hide') {
      appState.mainWindow.setFullScreen(true);
      appState.autoHideToolbar = true;
    }

    // 다크 모드 설정 적용
    if (appState.settings?.darkMode) {
      appState.mainWindow.webContents.executeJavaScript(
        'document.documentElement.classList.add("dark-mode");'
      );
    }

    // 특수 플래그 설정을 위한 URL 매개변수 추가
    let loadUrl = '';
    
    // 개발 모드에서는 Next.js 서버 준비 상태 확인 후 로드
    if (isDev) {
      debugLog('개발 모드 감지됨, Next.js 서버 확인 중...');
      
      // Next.js 서버 준비 상태 확인
      await checkIfNextServerReady();
      
      // 로드 URL - 개발 모드 (GPU 관련 매개변수 삭제)
      loadUrl = `http://localhost:${nextPort}`;
      debugLog(`메인 윈도우 URL 로딩 시작 (개발): ${loadUrl}`);
    } else {
      // 프로덕션 모드에서는 미리 빌드된 앱을 로드
      loadUrl = url.format({
        pathname: path.join(__dirname, '../../build/index.html'),
        protocol: 'file:',
        slashes: true
      });
      debugLog(`메인 윈도우 URL 로딩 시작 (프로덕션): ${loadUrl}`);
    }

    // DOM 준비 이벤트 처리
    appState.mainWindow.webContents.on('dom-ready', () => {
      debugLog('DOM이 준비됨, 문서 렌더링 중...');
    });

    // 로딩 시작 진단
    debugLog(`URL 로딩 시작: ${loadUrl}`);

    // 윈도우 로딩 처리
    try {
      // 개발 모드에서는 URL 직접 로드
      appState.mainWindow.loadURL(loadUrl);
      debugLog('loadURL 메서드 호출 완료');
    } catch (error) {
      console.error('URL 로드 오류:', error);
      
      // 로드 실패 시 에러 페이지 로드
      const errorPage = path.join(__dirname, '../../error.html');
      if (fs.existsSync(errorPage)) {
        appState.mainWindow.loadFile(errorPage);
      } else {
        appState.mainWindow.webContents.executeJavaScript(`
          document.body.innerHTML = '<div style="padding: 20px"><h1>로딩 오류</h1><p>${error.message}</p></div>';
        `);
      }
    }

    // 윈도우 닫기 이벤트 처리
    appState.mainWindow.on('close', (e) => {
      // 트레이로 최소화 설정 시 닫기 동작 가로채서 숨김으로 변경
      if (appState.settings?.minimizeToTray && !appState.allowQuit) {
        e.preventDefault();
        appState.mainWindow.hide();

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
    appState.mainWindow.on('closed', () => {
      appState.mainWindow = null;

      // 미니뷰도 함께 닫기
      if (appState.miniViewWindow && !appState.miniViewWindow.isDestroyed()) {
        appState.miniViewWindow.close();
        appState.miniViewWindow = null;
      }
    });

    return appState.mainWindow;
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
    ? `http://localhost:${nextPort}/mini-view`
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
