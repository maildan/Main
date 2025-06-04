/**
 * window.js
 * 
 * 메인 창(BrowserWindow) 생성 및 관리 모듈
 */

const { BrowserWindow, screen, shell, Menu, MenuItem, app } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');
const http = require('http');
const { appState } = require('./constants');
const { applyWindowMode, loadSettings } = require('./settings');
const { debugLog } = require('./utils');
const { setupTray } = require('./tray');
const securityChecks = require('./security-checks');
const errorHandler = require('./error-handler');

// 개발 모드 여부 직접 확인
const isDev = process.env.NODE_ENV === 'development';
// Next.js 서버 포트 (3000으로 고정)
const nextPort = process.env.NEXT_PORT || 3000;
// 연결 재시도 최대 횟수 증가
const maxRetries = 15;
// 타임아웃 시간 증가 (20초)
const timeout = 20000;

/**
 * Next.js 서버가 준비되었는지 확인하는 함수
 * 개선된 버전으로 재시도 로직 및 에러 처리 추가
 */
function checkIfNextServerReady() {
  return new Promise((resolve, reject) => {
    debugLog('Next.js 서버 준비 상태 확인 중...');
    debugLog(`포트 ${nextPort} 확인 중...`);

    let retries = 0;
    let checkComplete = false;

    const checkServer = () => {
      if (checkComplete) return;
      
      retries += 1;
      debugLog(`Next.js 서버 연결 시도 중... (시도 ${retries}/${maxRetries})`);

      const req = http.get(`http://localhost:${nextPort}`, (res) => {
        if (res.statusCode === 200) {
          checkComplete = true;
          debugLog(`Next.js 서버가 포트 ${nextPort}에서 실행 중입니다.`);
          
          // 번들링이 완료되었는지 추가 확인
          setTimeout(() => {
            debugLog('Next.js 번들링이 완료되었습니다.');
            resolve(true);
          }, 2000);
        } else {
          if (retries < maxRetries) {
          setTimeout(checkServer, 1000);
          } else {
            checkComplete = true;
            const error = new Error(`Next.js 서버가 응답했지만 상태 코드가 200이 아닙니다: ${res.statusCode}`);
            debugLog(`Next.js 서버 오류: ${error.message}`);
            reject(error);
          }
        }
      });

      req.on('error', (error) => {
        if (retries < maxRetries && !checkComplete) {
        setTimeout(checkServer, 1000);
        } else if (!checkComplete) {
          checkComplete = true;
          debugLog('Next.js 서버 연결 시간 초과');
          reject(new Error('Next.js 서버 연결 시간 초과'));
        }
      });

      req.setTimeout(2000, () => {
        req.abort();
        if (retries < maxRetries && !checkComplete) {
          setTimeout(checkServer, 1000);
        } else if (!checkComplete) {
          checkComplete = true;
          debugLog('Next.js 서버 연결 시간 초과');
          reject(new Error('Next.js 서버 연결 시간 초과'));
        }
      });
    };

    // 처음 시도
    checkServer();
    
    // 전체 타임아웃
    setTimeout(() => {
      if (!checkComplete) {
        checkComplete = true;
        debugLog(`Next.js 서버 연결 전체 타임아웃 (${timeout / 1000}초)`);
        reject(new Error(`Next.js 서버 연결 타임아웃 (${timeout / 1000}초 후)`));
      }
    }, timeout);
  });
}

/**
 * Next.js 개발 서버 상태를 확인하는 함수
 * 주기적으로 서버 상태를 체크하고, 문제가 있으면 알림
 */
function setupNextServerHealthCheck(mainWindow) {
  if (!isDev) return;
  
  const healthCheckInterval = 30000; // 30초마다 체크
  
  const checkServerHealth = async () => {
    try {
      const req = http.get(`http://localhost:${nextPort}/api/health`, (res) => {
        if (res.statusCode === 200) {
          // 서버가 정상이면 아무 작업 없음
          debugLog('Next.js 서버 상태 확인: 정상');
        } else {
          // 비정상 응답 코드
          const error = new Error(`Next.js 서버 상태 이상 (상태 코드: ${res.statusCode})`);
          if (mainWindow && !mainWindow.isDestroyed()) {
            errorHandler.notifyRendererOfError(mainWindow, 'next-server-warning', '개발 서버 상태 이상', {
              statusCode: res.statusCode,
              retry: true
            });
          }
        }
      });
      
      req.on('error', (error) => {
        debugLog(`Next.js 서버 상태 확인 실패: ${error.message}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
          errorHandler.notifyRendererOfError(mainWindow, 'next-server-error', '개발 서버 연결 실패', {
            error: error.message,
            retry: true
          });
        }
      });
      
      req.setTimeout(5000, () => {
        req.abort();
        debugLog('Next.js 서버 상태 확인 시간 초과');
      });
    } catch (error) {
      debugLog(`Next.js 서버 상태 확인 중 예외 발생: ${error.message}`);
    }
  };
  
  // 초기 지연 후 시작
  setTimeout(() => {
    checkServerHealth();
    return setInterval(checkServerHealth, healthCheckInterval);
  }, 10000);
}

// 기본 웹 서버 로딩 URL
let defaultLoadURL = '';

/**
 * 기본 URL 설정
 */
function setDefaultLoadURL(mode) {
  if (mode === 'development' || isDev) {
    defaultLoadURL = `http://localhost:${nextPort}`;
  } else {
    defaultLoadURL = url.format({
      pathname: path.join(__dirname, '../../client/out/index.html'),
      protocol: 'file:',
      slashes: true
    });
  }
}

// 앱 시작 시 기본 URL 설정
setDefaultLoadURL(process.env.NODE_ENV);

/**
 * React 앱이 마운트 되었는지 확인하는 함수
 */
function checkIfReactAppMounted(window) {
  if (!window || window.isDestroyed()) return;
  
  window.webContents.executeJavaScript(`
    new Promise((resolve) => {
      if (document.getElementById('__next') && document.getElementById('__next').children.length > 0) {
        console.warn('[Loop App] React/Next.js 앱이 마운트 되었습니다!');
        resolve(true);
      } else {
        console.warn('[Loop App] React/Next.js 앱이 아직 마운트되지 않았습니다. 기다리는 중...');
        
        // DOM 변화 관찰
        const observer = new MutationObserver((mutations) => {
          if (document.getElementById('__next') && document.getElementById('__next').children.length > 0) {
            console.warn('[Loop App] React/Next.js 앱이 마운트 되었습니다!');
            observer.disconnect();
            resolve(true);
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // 10초 후 타임아웃
        setTimeout(() => {
          observer.disconnect();
          console.warn('[Loop App] React 앱 마운트 확인 타임아웃');
          resolve(false);
        }, 10000);
      }
    });
  `)
  .then((mounted) => {
    if (mounted) {
      debugLog('Next.js 서버 준비됨, 페이지 로딩 완료');
      
      // 로딩 화면 제거 (필요한 경우)
      removeLoadingScreen(window);
      
      // 개발 모드에서 자동으로 DevTools 열기
      if (isDev && window && !window.isDestroyed()) {
        window.webContents.openDevTools({ mode: 'right' });
        debugLog('개발 모드: DevTools 자동으로 열림');
      }
    }
  })
  .catch((error) => {
    debugLog(`React 앱 마운트 확인 중 오류: ${error.message}`);
  });
}

/**
 * 로딩 화면 제거 함수
 */
function removeLoadingScreen(window) {
  if (!window || window.isDestroyed()) return;
  
  window.webContents.executeJavaScript(`
    if (document.getElementById('app-loading-screen')) {
      const loadingScreen = document.getElementById('app-loading-screen');
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        if (loadingScreen && loadingScreen.parentNode) {
          loadingScreen.parentNode.removeChild(loadingScreen);
        }
      }, 500);
    }
  `)
  .catch(error => {
    debugLog(`로딩 화면 제거 중 오류: ${error.message}`);
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
        preload: path.join(__dirname, '../preload.js'), // preload.js 경로 수정
        devTools: true, // 항상 DevTools 활성화
        
        // 개발 환경에서는 보안 설정 완화
        webSecurity: !isDev, // 개발 모드에서는 웹 보안 비활성화
        allowRunningInsecureContent: isDev, // 개발 모드에서는 안전하지 않은 컨텐츠 허용
        
        // 개발 모드에서 추가 설정
        ...(isDev ? {
          disableDialogs: false,           // 개발 중 대화 상자 허용
          webgl: true,                     // WebGL 활성화
        } : {}),
      }
    });

    // 개발 모드에서 DevTools 자동 열기 및 Next.js 로딩 문제 해결
    if (isDev) {
      debugLog('개발 모드: 자동 DevTools 열기 및 Next.js 로딩 최적화 적용');

      // DevTools를 분리 모드로 열어 Next.js 로딩 문제 해결 (강제 로드 트리거)
      appState.mainWindow.webContents.openDevTools({ mode: 'detach', activate: false });
      
      // Next.js 로딩 화면 표시 및 실제 로딩 대기 로직 추가
      appState.mainWindow.once('ready-to-show', () => {
        debugLog('창 표시 준비됨 (ready-to-show)');
        
        // 로딩 표시를 위한 간단한 HTML 삽입
        appState.mainWindow.webContents.executeJavaScript(`
          if (!document.getElementById('next-loading-screen')) {
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'next-loading-screen';
            loadingDiv.style.position = 'fixed';
            loadingDiv.style.top = '0';
            loadingDiv.style.left = '0';
            loadingDiv.style.width = '100%';
            loadingDiv.style.height = '100%';
            loadingDiv.style.display = 'flex';
            loadingDiv.style.flexDirection = 'column';
            loadingDiv.style.alignItems = 'center';
            loadingDiv.style.justifyContent = 'center';
            loadingDiv.style.backgroundColor = '#000';
            loadingDiv.style.color = '#fff';
            loadingDiv.style.fontFamily = 'Arial, sans-serif';
            loadingDiv.style.zIndex = '10000';
            
            const spinnerDiv = document.createElement('div');
            spinnerDiv.style.border = '4px solid rgba(255, 255, 255, 0.3)';
            spinnerDiv.style.borderTop = '4px solid #fff';
            spinnerDiv.style.borderRadius = '50%';
            spinnerDiv.style.width = '50px';
            spinnerDiv.style.height = '50px';
            spinnerDiv.style.animation = 'spin 1s linear infinite';
            
            const style = document.createElement('style');
            style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            
            const messageDiv = document.createElement('div');
            messageDiv.textContent = 'Next.js 개발 서버 로딩 중...';
            messageDiv.style.marginTop = '20px';
            
            // 재시도 버튼 추가
            const retryButton = document.createElement('button');
            retryButton.textContent = '연결 재시도';
            retryButton.style.marginTop = '15px';
            retryButton.style.padding = '8px 16px';
            retryButton.style.backgroundColor = '#4A90E2';
            retryButton.style.color = 'white';
            retryButton.style.border = 'none';
            retryButton.style.borderRadius = '4px';
            retryButton.style.cursor = 'pointer';
            retryButton.onclick = () => {
              messageDiv.textContent = 'Next.js 서버에 재연결 시도 중...';
              window.location.reload();
            };
            
            // 상태 메시지 추가 영역 생성
            const statusDiv = document.createElement('div');
            statusDiv.id = 'server-status';
            statusDiv.style.marginTop = '10px';
            statusDiv.style.fontSize = '12px';
            statusDiv.style.color = '#aaa';
            statusDiv.textContent = '서버 연결 확인 중...';
            
            loadingDiv.appendChild(spinnerDiv);
            loadingDiv.appendChild(messageDiv);
            loadingDiv.appendChild(statusDiv);
            loadingDiv.appendChild(retryButton);
            document.head.appendChild(style);
            document.body.appendChild(loadingDiv);
            
            // 서버 연결 상태 주기적으로 확인하는 기능 추가
            window.checkServerStatus = setInterval(() => {
              fetch('http://localhost:${nextPort}/api/health', { method: 'HEAD' })
                .then(response => {
                  if (response.ok) {
                    statusDiv.textContent = '서버 연결됨. 잠시 기다려주세요...';
                    statusDiv.style.color = '#8efa8e';
        }
                })
                .catch(err => {
                  statusDiv.textContent = '서버 연결 실패. 개발 서버가 실행 중인지 확인하세요.';
                  statusDiv.style.color = '#ff6b6b';
                });
            }, 3000);
          }
        `).catch(err => debugLog('로딩 화면 삽입 오류:', err));
        
        // 창은 일단 보여주기 (로딩 메시지가 표시됨)
      appState.mainWindow.show();
    });
    }

    // 보안 설정 적용
    try {
      debugLog('창에 보안 설정 적용됨');
      securityChecks.initializeSecuritySettings(app);
      // 키보드 이벤트 핸들러 설정
      securityChecks.setupKeyboardEventHandler();
    } catch (error) {
      console.error('보안 설정 적용 중 오류:', error);
    }

    // 렌더링 실패 이벤트 모니터링
    appState.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('페이지 로딩 실패:', errorCode, errorDescription);
      
      // 개발 모드에서 로딩 실패 시 오류 메시지와 재시도 버튼 표시
      if (isDev) {
        appState.mainWindow.webContents.executeJavaScript(`
          if (!document.getElementById('next-error-screen')) {
            const errorDiv = document.createElement('div');
            errorDiv.id = 'next-error-screen';
            errorDiv.style.position = 'fixed';
            errorDiv.style.top = '0';
            errorDiv.style.left = '0';
            errorDiv.style.width = '100%';
            errorDiv.style.height = '100%';
            errorDiv.style.display = 'flex';
            errorDiv.style.flexDirection = 'column';
            errorDiv.style.alignItems = 'center';
            errorDiv.style.justifyContent = 'center';
            errorDiv.style.backgroundColor = '#1a1a1a';
            errorDiv.style.color = '#fff';
            errorDiv.style.fontFamily = 'Arial, sans-serif';
            errorDiv.style.zIndex = '10000';
            errorDiv.style.padding = '20px';
            
            const errorTitle = document.createElement('h2');
            errorTitle.textContent = 'Next.js 개발 서버 연결 오류';
            errorTitle.style.color = '#ff5555';
            
            const errorMessage = document.createElement('div');
            errorMessage.innerHTML = '<p>개발 서버에 연결할 수 없습니다. 다음 사항을 확인하세요:</p>' +
              '<ul style="text-align: left; margin-bottom: 20px;">' +
              '<li>터미널에서 <code>yarn dev</code> 명령어가 실행 중인지 확인</li>' +
              '<li>포트 ${nextPort}가 사용 가능한지 확인</li>' +
              '<li>오류 코드: ${errorCode} - ${errorDescription}</li>' +
              '</ul>';
            
            const retryButton = document.createElement('button');
            retryButton.textContent = '새로고침';
            retryButton.style.padding = '10px 20px';
            retryButton.style.backgroundColor = '#4A90E2';
            retryButton.style.color = 'white';
            retryButton.style.border = 'none';
            retryButton.style.borderRadius = '4px';
            retryButton.style.cursor = 'pointer';
            retryButton.style.marginTop = '20px';
            retryButton.onclick = () => window.location.reload();
            
            errorDiv.appendChild(errorTitle);
            errorDiv.appendChild(errorMessage);
            errorDiv.appendChild(retryButton);
            document.body.appendChild(errorDiv);
          }
        `).catch(err => console.error('에러 화면 삽입 중 오류:', err));
      } else {
        // 프로덕션 모드에서는 간단한 오류 페이지 표시
        appState.mainWindow.webContents.executeJavaScript(`
          document.body.innerHTML = '<div style="padding: 20px"><h1>로딩 오류</h1><p>${errorDescription}</p></div>';
        `).catch(err => console.error('에러 페이지 표시 중 오류:', err));
      }
    });

    // DOM 준비 이벤트 처리
    appState.mainWindow.webContents.on('dom-ready', () => {
      debugLog('DOM이 준비됨, 문서 렌더링 중...');
      
      // React/Next.js 마운트 확인 스크립트 주입
      if (isDev) {
        // React 앱이 마운트됐는지 확인하는 스크립트
        appState.mainWindow.webContents.executeJavaScript(`
          // React 루트 요소 찾기 (Next.js의 일반적인 루트 ID)
          const checkReactMounted = () => {
            const reactRoots = document.querySelectorAll('div#__next, [data-reactroot], main, #app');
            return reactRoots.length > 0 && Array.from(reactRoots).some(el => el.children.length > 0);
          };
          
          // 로딩 화면 정리 함수
          const cleanupLoadingScreen = () => {
            // Next.js 로딩 인터벌 정리
            if (window.checkServerStatus) {
              clearInterval(window.checkServerStatus);
              window.checkServerStatus = null;
            }
            
            // 로딩 스크린 제거
            const loadingScreen = document.getElementById('next-loading-screen');
            if (loadingScreen) {
              loadingScreen.style.opacity = '0';
              loadingScreen.style.transition = 'opacity 0.5s ease';
              setTimeout(() => {
                loadingScreen.remove();
              }, 500);
            }
            
            // 에러 스크린 제거
            const errorScreen = document.getElementById('next-error-screen');
            if (errorScreen) {
              errorScreen.remove();
            }
          };
          
          // React 앱이 마운트될 때까지 기다리기
          if (!checkReactMounted()) {
            console.log("[Loop App] React/Next.js 앱이 아직 마운트되지 않았습니다. 기다리는 중...");
            const waitForReact = setInterval(() => {
              if (checkReactMounted()) {
                console.log("[Loop App] React/Next.js 앱이 마운트 되었습니다!");
                clearInterval(waitForReact);
                cleanupLoadingScreen();
              }
            }, 100);
          } else {
            console.log("[Loop App] React/Next.js 앱이 이미 마운트 되어 있습니다.");
            cleanupLoadingScreen();
          }
        `).catch(err => console.warn('React 마운트 확인 스크립트 오류:', err));
      }
      
      // 개발 모드에서 Fast Refresh를 위한 설정
      if (isDev) {
        // 페이지 새로고침 방지 (개발 모드 최적화)
        appState.mainWindow.webContents.executeJavaScript(`
          if (window.electronDevModeInitialized !== true) {
            window.electronDevModeInitialized = true;
            console.debug("개발 모드 최적화: Fast Refresh 설정됨");
            
            // React의 Fast Refresh가 전체 페이지를 새로 고치지 않도록 방지
            window.addEventListener('beforeunload', (e) => {
              // webpack HMR 여부 확인
              if (window.__webpack_hot_middleware_reporter__ && 
                  window.__webpack_hot_middleware_reporter__.state === 'idle') {
                e.preventDefault();
                console.debug("Fast Refresh 감지: 전체 새로고침 방지됨");
                return false;
              }
            });
          }
        `).catch(err => console.warn('개발 모드 최적화 스크립트 오류:', err));
      }
    });

    // 렌더러 프로세스의 콘솔 메시지 캡처
    appState.mainWindow.webContents.on('console-message', (event, level, message) => {
      const LEVELS = ['info', 'warn', 'error', 'debug'];
      console.log(`[렌더러-${LEVELS[level] || 'info'}] ${message}`);
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
      
      try {
      // Next.js 서버 준비 상태 확인
      await checkIfNextServerReady();
      
        // 로드 URL - 개발 모드
      loadUrl = `http://localhost:${nextPort}`;
      debugLog(`메인 윈도우 URL 로딩 시작 (개발): ${loadUrl}`);
      
      // 개발 모드에서 Fast Refresh가 작동하도록 전체 페이지 리로드 방지
      appState.mainWindow.webContents.on('did-finish-load', () => {
        debugLog('Next.js 서버 준비됨');
      });
      
      // Fast Refresh 시 창 전체를 리로드하지 않도록 설정
      appState.mainWindow.webContents.on('did-fail-provisional-load', (event) => {
        // 개발 서버 HMR에 의한 임시 로드 실패는 무시 (Fast Refresh 관련)
        if (event.url.startsWith(`http://localhost:${nextPort}`)) {
          debugLog('개발 모드 HMR 로드 이벤트 감지 - 창 리로드 방지');
          event.preventDefault();
        }
      });
      } catch (serverError) {
        console.error('Next.js 서버 연결 실패:', serverError.message);
        
        // 오류 시에도 기본 URL은 설정
        loadUrl = `http://localhost:${nextPort}`;
        
        // 서버 연결 실패 시 오류 메시지를 보여주는 HTML 로드
        const errorHtml = `
          <html>
            <head>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  background-color: #1a1a1a;
                  color: #f0f0f0;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  padding: 20px;
                  text-align: center;
                }
                h1 { color: #ff5555; }
                pre {
                  background-color: #2a2a2a;
                  padding: 10px;
                  border-radius: 4px;
                  white-space: pre-wrap;
                  text-align: left;
                  max-width: 80%;
                  overflow-x: auto;
                }
                button {
                  background-color: #4A90E2;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 4px;
                  cursor: pointer;
                  margin-top: 20px;
                }
                .tips {
                  margin-top: 20px;
                  text-align: left;
                  background-color: #333;
                  padding: 15px;
                  border-radius: 4px;
                  max-width: 600px;
                }
                .tip-title {
                  color: #4A90E2;
                  margin-bottom: 5px;
                }
              </style>
            </head>
            <body>
              <h1>Next.js 개발 서버 연결 실패</h1>
              <p>개발 서버에 연결할 수 없습니다. 다음을 확인해 주세요:</p>
              <pre>${serverError.message}</pre>
              
              <div class="tips">
                <div class="tip-title">해결 방법:</div>
                <ol>
                  <li>터미널에서 <code>yarn dev</code> 명령어가 실행 중인지 확인하세요.</li>
                  <li>포트 ${nextPort}가 다른 프로세스에 의해 사용 중인지 확인하세요.</li>
                  <li>개발 서버가 정상적으로 시작되었는지 터미널 출력을 확인하세요.</li>
                  <li>문제가 지속되면 프로젝트를 재시작해 보세요.</li>
                </ol>
              </div>
              
              <button onclick="window.location.reload()">다시 시도</button>
            </body>
          </html>
        `;
        
        // data URI로 HTML 로드
        loadUrl = `data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`;
      }
    } else {
      // 프로덕션 모드에서는 미리 빌드된 앱을 로드
      loadUrl = url.format({
        pathname: path.join(__dirname, '../../build/index.html'),
        protocol: 'file:',
        slashes: true
      });
      debugLog(`메인 윈도우 URL 로딩 시작 (프로덕션): ${loadUrl}`);
    }

    // 로딩 시작 진단
    debugLog(`URL 로딩 시작: ${loadUrl}`);

    // 윈도우 로딩 처리
    try {
      // URL 로드
      appState.mainWindow.loadURL(loadUrl);
      debugLog('loadURL 메서드 호출 완료');
      
      // 페이지 로딩이 완료되면 명시적으로 창 보여주기
      appState.mainWindow.webContents.on('did-finish-load', () => {
        debugLog('페이지 로딩 완료, 창 표시 중...');
        // 창이 아직 표시되지 않았다면 표시
        if (appState.mainWindow && !appState.mainWindow.isDestroyed() && !appState.mainWindow.isVisible()) {
          appState.mainWindow.show();
          debugLog('메인 윈도우 표시됨 (did-finish-load 이벤트)');
        }
        
        if (isDev) {
          debugLog('Next.js 서버 준비됨, 페이지 로딩 완료');
        }
      });
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
  getMainWindow,
  checkIfNextServerReady,
  setupNextServerHealthCheck,
  checkIfReactAppMounted,
  removeLoadingScreen
};
