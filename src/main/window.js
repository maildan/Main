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
  const mainWindowConfig = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // 기본 창 프레임 사용
    autoHideMenuBar: true, // 메뉴바를 항상 자동 숨김으로 설정
    title: '', // 창 제목을 비워둠
    icon: path.join(__dirname, '../../public/app-icon.svg'), // 아이콘 설정
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload.js')
    },
    show: false // 준비되기 전까지 표시하지 않음
  };

  appState.mainWindow = new BrowserWindow(mainWindowConfig);

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
    // 백그라운드에서 애니메이션/렌더링 중지를 위한 CSS 삽입
    const backgroundModeCss = `
      * {
        animation-play-state: paused !important;
        transition: none !important;
        animation: none !important;
      }
      .chart-container, canvas, .animation {
        display: none !important;
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
  // 이미 존재하는 경우 보이게 하고 포커스
  if (appState.miniViewWindow && !appState.miniViewWindow.isDestroyed()) {
    if (appState.miniViewWindow.isMinimized()) {
      appState.miniViewWindow.restore();
    }
    appState.miniViewWindow.show();
    appState.miniViewWindow.focus();
    return appState.miniViewWindow;
  }

  const miniViewConfig = {
    width: 280,
    height: 200,
    minWidth: 240,
    minHeight: 160,
    maxWidth: 400,
    maxHeight: 300,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: '타이핑 통계 미니뷰',
    icon: path.join(__dirname, '../../public/app-icon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../../preload.js')
    },
    show: false
  };

  appState.miniViewWindow = new BrowserWindow(miniViewConfig);

  // 개발/배포 환경에 따라 다른 URL 로드
  let miniViewUrl;
  if (isDev) {
    miniViewUrl = 'http://localhost:3000/mini-view';
  } else {
    miniViewUrl = 'http://localhost:3000/mini-view';
  }
  
  debugLog('미니뷰 URL 로드:', miniViewUrl);
  
  appState.miniViewWindow.loadURL(miniViewUrl)
    .catch(err => {
      console.error('미니뷰 URL 로드 실패:', err);
      
      // 오류 화면 표시
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title></title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial; padding: 10px; color: #333; background: #f0f0f0; font-size: 12px; }
            .error { color: #e53935; }
          </style>
        </head>
        <body>
          <p class="error">미니뷰 로드 실패</p>
        </body>
        </html>
      `;
      
      const tempPath = path.join(__dirname, '../../miniview-error.html');
      fs.writeFileSync(tempPath, errorHtml);
      
      return appState.miniViewWindow.loadFile(tempPath);
    });

  // 창이 준비되면 표시
  appState.miniViewWindow.once('ready-to-show', () => {
    appState.miniViewWindow.show();
  });

  // 미니뷰 닫히면 참조 제거
  appState.miniViewWindow.on('closed', () => {
    appState.miniViewWindow = null;
  });

  // 미니뷰에 통계 데이터 전송 시작
  startSendingStatsToMiniView();

  return appState.miniViewWindow;
}

/**
 * 미니뷰 토글 함수
 */
function toggleMiniView() {
  if (appState.miniViewWindow && !appState.miniViewWindow.isDestroyed()) {
    appState.miniViewWindow.close();
    appState.miniViewWindow = null;
  } else {
    createMiniViewWindow();
  }
}

/**
 * 미니뷰에 통계 데이터 전송
 */
function startSendingStatsToMiniView() {
  if (appState.miniViewStatsInterval) {
    clearInterval(appState.miniViewStatsInterval);
  }
  
  // 5초마다 미니뷰에 통계 전송
  appState.miniViewStatsInterval = setInterval(() => {
    if (appState.miniViewWindow && !appState.miniViewWindow.isDestroyed()) {
      try {
        appState.miniViewWindow.webContents.send('mini-view-stats-update', {
          keyCount: appState.currentStats.keyCount,
          typingTime: appState.currentStats.typingTime,
          windowTitle: appState.currentStats.currentWindow,
          browserName: appState.currentStats.currentBrowser,
          totalChars: appState.currentStats.totalChars,
          totalWords: appState.currentStats.totalWords,
          accuracy: appState.currentStats.accuracy
        });
      } catch (error) {
        debugLog('미니뷰 통계 전송 오류:', error);
      }
    } else {
      // 미니뷰가 닫혔으면 인터벌 중지
      clearInterval(appState.miniViewStatsInterval);
      appState.miniViewStatsInterval = null;
    }
  }, 5000);
}

module.exports = {
  createWindow,
  optimizeForBackground,
  disableBackgroundOptimization,
  createMiniViewWindow,
  toggleMiniView
};
