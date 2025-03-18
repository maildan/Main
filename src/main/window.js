const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const { appState, isDev } = require('./constants');
const { applyWindowMode } = require('./settings');

/**
 * 메인 윈도우 생성 함수
 */
function createWindow() {
  const mainWindowConfig = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: true,
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
      
      // 오류 화면 표시
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>타이핑 통계 앱</title>
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
            <h1>타이핑 통계 앱</h1>
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

  appState.mainWindow.on('closed', () => {
    appState.mainWindow = null;
  });
  
  return appState.mainWindow;
}

module.exports = {
  createWindow
};
