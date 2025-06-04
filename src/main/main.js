/**
 * main.js
 * 
 * 일렉트론 애플리케이션 메인 프로세스 시작점
 * Next.js 서버 설정 및 Electron 윈도우 생성을 관리합니다.
 */

const { app, BrowserWindow, globalShortcut, dialog } = require('electron');
const path = require('path');
const { setupTray } = require('./tray');
const { createWindow } = require('./window');
const { setupKeyboardListener, initializeKeyboard } = require('./keyboard');
const { getSettings, loadSettings } = require('./settings');
const { debugLog } = require('./utils');
const { setupProtocols } = require('./protocols');
const { setupIpcHandlers } = require('./ipc-handlers');
const { setupMemoryManager } = require('./memory-manager');
const { setupClipboardWatcher } = require('./clipboard-watcher');
const { setupSafeStorage } = require('./safe-storage');
const { setupAllHandlers } = require('./handlers');
const appLifecycle = require('./app-lifecycle');
const { setupAutoLaunch } = require('./auto-launch');
const { setupPowerMonitor } = require('./power-monitor');
const { setupWindowMode } = require('./settings');
const { setupSecurityChecks } = require('./security-checks');
const { crashReporterSetup } = require('./crash-reporter');
const errorHandler = require('./error-handler');

// 메인 윈도우 및 앱 상태 관리
let mainWindow = null;
let isQuitting = false;
let isReady = false;

// 개발 모드 확인
const isDev = process.env.NODE_ENV === 'development';

/**
 * 앱 초기화 함수
 * 필요한 모든 설정 및 모듈 초기화
 */
async function initializeApp() {
  try {
    debugLog('앱 초기화 중...');
    
    // 딱 한 번의 인스턴스만 허용
      const gotTheLock = app.requestSingleInstanceLock();
      if (!gotTheLock) {
      debugLog('다른 앱 인스턴스가 이미 실행 중. 종료합니다.');
        app.quit();
        return;
      }
      
    // 이미 실행 중인 인스턴스가 있을 때 포커스 처리
  app.on('second-instance', (event, commandLine, workingDirectory) => {
      debugLog('두 번째 인스턴스가 감지됨, 기존 창에 포커스');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

    // macOS에서 독에서 앱 아이콘 클릭 시 창이 없으면 새로 생성
    app.on('activate', () => {
      debugLog('앱 활성화 이벤트 발생');
      if (BrowserWindow.getAllWindows().length === 0) {
        debugLog('활성화 중 창이 없음. 메인 창 생성');
        createMainWindow();
      } else if (mainWindow && !mainWindow.isVisible()) {
        debugLog('창이 숨겨져 있음. 표시로 전환');
        mainWindow.show();
      }
    });

    // 최소한의 필요 모듈 초기화
    await setupProtocols();
    setupIpcHandlers();
    setupSecurityChecks();
    
    // 기본 설정 로드
    await loadSettings();
    
    // 메인 창 생성
    await createMainWindow();
    
    // 앱이 완전히 준비된 후 추가 모듈 설정
    appLifecycle.setupAppEventListeners();
    setupAllHandlers();
    setupMemoryManager();
    setupPowerMonitor();
    setupSafeStorage();
    setupClipboardWatcher();
    
    // 키보드 이벤트 리스너 초기화
    debugLog('키보드 모듈 초기화 중...');
    initializeKeyboard();
    
    // 자동 실행 설정
    const settings = getSettings();
    setupAutoLaunch(settings?.autoLaunch || false);
    
    // 크래시 리포터 설정 (개발 모드에서만)
    if (isDev) {
      crashReporterSetup();
    }
    
    // 앱 준비 상태
    isReady = true;
    debugLog('앱 초기화 완료 ✓');
    
  } catch (error) {
    debugLog(`앱 초기화 중 오류: ${error.message}`);
    errorHandler.showErrorDialog('앱 초기화 오류', error);
  }
}

/**
 * 메인 윈도우 생성 함수
 */
async function createMainWindow() {
  try {
    debugLog('메인 윈도우 생성 중...');
    mainWindow = await createWindow();

    // 창 닫기 동작 재정의: 앱 종료 대신 창 숨기기
    mainWindow.on('close', (event) => {
      // 실제 종료 중이 아니면 창 닫기를 막고 숨기기
      if (!isQuitting) {
        event.preventDefault();
        mainWindow.hide();
        return false;
      }
      return true;
    });

    // 창이 닫힌 후 정리 작업
    mainWindow.on('closed', () => {
      mainWindow = null;
    });
    
    // 개발 모드에서 DevTools 자동 열기
    if (isDev) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.openDevTools({ mode: 'right' });
        debugLog('개발 모드: DevTools 자동으로 열림');
      });
      
      // 개발용 디버깅 정보 설정
      mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        debugLog(`페이지 로드 실패: ${errorDescription} (${errorCode})`);
      });
      
      // 렌더러 프로세스 충돌 감지
      mainWindow.webContents.on('render-process-gone', (event, details) => {
        debugLog(`렌더러 프로세스 종료: ${details.reason}`);
        errorHandler.logToFile(`렌더러 프로세스 비정상 종료: ${details.reason}`, 'renderer-crashed');
        
        if (details.reason !== 'clean-exit') {
          dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: '렌더러 프로세스 충돌',
            message: '앱의 렌더러 프로세스가 충돌했습니다.',
            detail: `원인: ${details.reason}\n앱을 다시 시작하는 것을 권장합니다.`,
            buttons: ['확인', '앱 재시작'],
            defaultId: 0
          }).then(result => {
            if (result.response === 1) {
              app.relaunch();
              app.exit();
            }
          });
        }
      });
      
      // 예기치 않은 오류 감지
      mainWindow.webContents.on('unresponsive', () => {
        debugLog('웹 컨텐츠가 응답하지 않음');
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: '앱 응답 없음',
          message: '앱이 응답하지 않습니다.',
          detail: '앱이 응답하지 않습니다. 잠시 기다리거나 앱을 재시작할 수 있습니다.',
          buttons: ['기다리기', '앱 재시작'],
          defaultId: 0
        }).then(result => {
          if (result.response === 1) {
            app.relaunch();
            app.exit();
          }
        });
      });
      
      mainWindow.webContents.on('responsive', () => {
        debugLog('웹 컨텐츠 응답 복구됨');
      });
    }
    
    // 트레이 설정
    setupTray(mainWindow);
    
    // 윈도우 모드 설정
    setupWindowMode(mainWindow);
    
    return mainWindow;
  } catch (error) {
    debugLog(`메인 윈도우 생성 중 오류: ${error.message}`);
    errorHandler.logErrorToFile(error, 'create-main-window');
    throw error; // 오류 전파
  }
}

/**
 * 앱 종료 함수
 */
function quitApp() {
  isQuitting = true;
  app.quit();
}

/**
 * 전역 단축키 해제 설정
 */
function unregisterShortcuts() {
  try {
    debugLog('전역 단축키 해제 중...');
    globalShortcut.unregisterAll();
  } catch (error) {
    debugLog(`단축키 해제 중 오류: ${error.message}`);
  }
}

/**
 * 앱 실행 전 준비 작업 및 이벤트 설정
 */
app.on('ready', async () => {
  try {
    debugLog('앱이 준비되었습니다. 초기화 시작...');
    await initializeApp();
  } catch (error) {
    debugLog(`앱 준비 단계에서 오류 발생: ${error.message}`);
    errorHandler.showErrorDialog('앱 준비 오류', error);
  }
});

/**
 * 모든 창이 닫혔을 때의 동작 (macOS 제외)
 */
app.on('window-all-closed', () => {
  debugLog('모든 창이 닫혔습니다.');
        if (process.platform !== 'darwin') {
    debugLog('macOS가 아니므로 앱 종료');
    quitApp();
  }
});

/**
 * 앱 종료 전 정리 작업
 */
app.on('will-quit', () => {
  debugLog('앱 종료 중...');
  unregisterShortcuts();
});

/**
 * 앱 상태 관리 객체 설정
 */
global.appState = {
  isTracking: false,
  stats: {
    keyCount: 0,
    typingTime: 0
  },
  mainWindow: null,
  // 개발 상태 추가
  isDev: isDev
};

// 공개 API
module.exports = {
  app,
  createWindow: createMainWindow,
  quitApp
};
