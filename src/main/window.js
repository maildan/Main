const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const { appState, isDev } = require('./constants');
const { applyWindowMode } = require('./settings');
const { debugLog } = require('./utils');

/**
 * 메인 윈도우 생성 함수
 */
function createWindow() {
  // 메인 윈도우 생성
  appState.mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    // 불필요한 시각적 요소 제거로 메모리 감소
    frame: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    show: false, // 준비되기 전에는 표시하지 않음
    // 웹뷰 설정 최적화
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload.js'),
      // 메모리 사용량 감소를 위한 캐시 설정
      backgroundThrottling: true, // 백그라운드에서 타이머 스로틀링
      enableWebSQL: false, // WebSQL 비활성화
      webgl: false, // 필요없는 WebGL 비활성화
      webaudio: false, // 오디오 기능 비활성화
      // SPELLCHECK 비활성화
      spellcheck: false,
      // 하드웨어 가속 필요없는 경우 비활성화
      disableHardwareAcceleration: !appState.settings.useHardwareAcceleration
    }
  });

  // 개발/배포 환경에 따라 다른 URL 로드
  let startUrl;
  if (isDev) {
    // 개발 환경: 로컬 서버 사용
    startUrl = 'http://localhost:3000';
  } else {
    // 배포 환경: 로컬 서버 사용 (npm start로 실행된 서버)
    startUrl = 'http://localhost:3000';
  }
  
  console.log('앱 시작 URL:', startUrl);
  
  appState.mainWindow.loadURL(startUrl)
    .catch(err => {
      console.error('URL 로드 실패:', err);
      
      // 오류 화면 표시 - 타이틀 제거
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title></title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial; padding: 20px; color: #333; background: #f0f0f0; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #2196F3; }
            pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; }
            .error { color: #e53935; }
            .solution { margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1></h1>
            <p>Next.js 서버에 연결할 수 없습니다.</p>
            <p class="error">오류: Next.js 서버가 실행 중인지 확인하세요.</p>
            <div class="solution">
              <h3>해결 방법:</h3>
              <p>터미널에서 아래 명령어 실행 후 앱을 다시 시작하세요:</p>
              <ol>
                <li>개발 모드: <code>npm run dev</code></li>
                <li>또는 프로덕션 모드: <code>npm run build</code> 후 <code>npm run start</code></li>
              </ol>
              <p>그런 다음 앱을 다시 실행하세요: <code>npm run electron</code></p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const tempPath = path.join(__dirname, '../../error.html');
      fs.writeFileSync(tempPath, errorHtml);
      
      return appState.mainWindow.loadFile(tempPath);
    });

  // 창이 준비되면 표시
  appState.mainWindow.once('ready-to-show', () => {
    appState.mainWindow.show();
    
    // 설정에 따라 창 모드 적용
    applyWindowMode(appState.settings.windowMode);
  });

  // 기본 메뉴 비활성화
  appState.mainWindow.setMenu(null);

  // 개발 도구 설정
  if (isDev) {
    appState.mainWindow.webContents.openDevTools();
  }

  // 윈도우 닫기 이벤트 처리 추가
  appState.mainWindow.on('close', (event) => {
    // 설정에서 트레이로 최소화 옵션이 활성화되어 있고, 완전히 종료하지 않는 경우
    if (appState.settings.minimizeToTray && !appState.allowQuit) {
      event.preventDefault(); // 창 닫기 이벤트 취소
      
      // 백그라운드 모드 최적화 실행
      optimizeForBackground();
      
      // 창 숨기기
      appState.mainWindow.hide();
      
      // 트레이 알림 표시 (선택 사항)
      if (appState.settings.showTrayNotifications) {
        appState.mainWindow.webContents.send('show-tray-notification', {
          title: '타이핑 통계 앱',
          message: '앱이 계속 백그라운드에서 실행 중입니다.'
        });
      }
      
      debugLog('창을 숨기고 백그라운드 모드로 전환');
      return false;
    }
  });

  appState.mainWindow.on('closed', () => {
    appState.mainWindow = null;
  });
  
  return appState.mainWindow;
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
    title: '타이핑 통계 미니뷰',
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

  const { screen } = require('electron');
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

module.exports = {
  createWindow,
  optimizeForBackground,
  disableBackgroundOptimization,
  createMiniViewWindow,
  toggleMiniView
};
