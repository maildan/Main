/**
 * error-handler.js
 * 
 * 전역 오류 처리 기능 제공
 * 애플리케이션에서 발생하는 예외를 잡아 사용자에게 알리고 로깅합니다.
 */

const { app, dialog, BrowserWindow } = require('electron');
const { debugLog } = require('./utils');
const path = require('path');
const fs = require('fs');

// 오류 로깅을 위한 디렉터리와 파일 설정
const errorLogDir = path.join(app.getPath('userData'), 'logs');
const errorLogFile = path.join(errorLogDir, 'error.log');

// 오류 로그 디렉터리가 없으면 생성
function ensureErrorLogDir() {
  if (!fs.existsSync(errorLogDir)) {
    try {
      fs.mkdirSync(errorLogDir, { recursive: true });
    } catch (err) {
      console.error('오류 로그 디렉터리 생성 실패:', err);
    }
  }
}

/**
 * 오류를 로그 파일에 기록
 * @param {Error} error - 기록할 오류 객체
 * @param {string} context - 오류가 발생한 컨텍스트 정보
 */
function logErrorToFile(error, context = 'unknown') {
  ensureErrorLogDir();
  
  const timestamp = new Date().toISOString();
  const errorMessage = error.stack || error.toString();
  const logEntry = `[${timestamp}] [${context}] ${errorMessage}\n\n`;
  
  try {
    fs.appendFileSync(errorLogFile, logEntry);
  } catch (err) {
    console.error('오류 로깅 실패:', err);
  }
}

/**
 * 사용자에게 오류 대화상자 표시
 * @param {Error} error - 표시할 오류 객체
 * @param {string} title - 대화상자 제목
 * @param {string} context - 오류 컨텍스트 설명
 * @param {boolean} fatal - 치명적인 오류 여부
 */
function showErrorDialog(error, title = '오류 발생', context = '', fatal = false) {
  const errorMessage = error.message || error.toString();
  let detailedMessage = `${context ? context + '\n\n' : ''}${errorMessage}`;
  
  if (error.stack) {
    detailedMessage += `\n\n기술 정보 (개발자용):\n${error.stack}`;
  }

  if (fatal && app.isReady()) {
    dialog.showErrorBox(title, detailedMessage);
    app.exit(1);
  } else if (app.isReady()) {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    dialog.showMessageBox(focusedWindow, {
      type: 'error',
      title: title,
      message: title,
      detail: detailedMessage,
      buttons: ['확인'],
      defaultId: 0
    });
  }
}

/**
 * 렌더러 프로세스에 오류 알림
 * @param {BrowserWindow} window - 대상 윈도우
 * @param {string} errorType - 오류 유형
 * @param {string} errorMessage - 오류 메시지
 */
function notifyRendererOfError(window, errorType, errorMessage, details = {}) {
  if (window && !window.isDestroyed() && window.webContents) {
    window.webContents.send('error-notification', {
      type: errorType,
      message: errorMessage,
      timestamp: new Date().toISOString(),
      ...details
    });
  }
}

/**
 * 권한 관련 오류 처리
 * @param {BrowserWindow} window - 메인 윈도우
 * @param {string} permissionType - 필요한 권한 유형
 * @param {string} message - 오류 메시지
 */
function handlePermissionError(window, permissionType, message, details = {}) {
  if (window && !window.isDestroyed() && window.webContents) {
    window.webContents.send('permission-error', {
      code: permissionType,
      message: message,
      detail: details.detail || '앱에 필요한 권한이 없습니다.',
      requiredApps: details.requiredApps || []
    });
  }
}

/**
 * 네이티브 모듈 로딩 오류 처리
 * @param {string} moduleName - 모듈 이름
 * @param {Error} error - 오류 객체
 * @param {boolean} isCritical - 중요 모듈 여부
 */
function handleNativeModuleError(moduleName, error, isCritical = false) {
  const errorMessage = `네이티브 모듈 '${moduleName}' 로드 실패: ${error.message || '알 수 없는 오류'}`;
  debugLog(errorMessage);
  
  logErrorToFile(error, `native-module:${moduleName}`);
  
  // 중요 모듈이 아니면 대화상자를 표시하지 않음
  if (isCritical && app.isReady()) {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    dialog.showMessageBox(focusedWindow, {
      type: 'warning',
      title: '모듈 로드 실패',
      message: `네이티브 모듈 로드 실패: ${moduleName}`,
      detail: `${errorMessage}\n\n제한된 기능으로 계속 실행됩니다.`,
      buttons: ['확인'],
      defaultId: 0
    });
  }
}

/**
 * Next.js 서버 연결 오류 처리
 * @param {BrowserWindow} window - 메인 윈도우
 * @param {Error} error - 오류 객체
 */
function handleNextServerError(window, error) {
  logErrorToFile(error, 'next-server-connection');
  
  if (window && !window.isDestroyed() && window.webContents) {
    window.webContents.send('next-server-error', {
      message: 'Next.js 개발 서버 연결 실패',
      error: error.message || '알 수 없는 오류',
      retry: true
    });
  }
}

/**
 * 글로벌 예외 핸들러 설정
 */
function setupGlobalErrorHandlers() {
  // Node.js의 처리되지 않은 프라미스 거부 처리
  process.on('unhandledRejection', (reason, promise) => {
    debugLog('처리되지 않은 프라미스 거부:', reason);
    logErrorToFile(reason instanceof Error ? reason : new Error(String(reason)), 'unhandledRejection');
  });

  // Node.js의 처리되지 않은 예외 처리
  process.on('uncaughtException', (error) => {
    debugLog('처리되지 않은 예외:', error);
    logErrorToFile(error, 'uncaughtException');
    
    // 처리되지 않은 예외는 심각하므로 사용자에게 알림
    if (app.isReady()) {
      showErrorDialog(
        error,
        '예기치 않은 오류 발생',
        '애플리케이션에 문제가 발생했습니다. 앱을 다시 시작해 주세요.',
        false
      );
    }
  });
  
  // 렌더러 프로세스 충돌 처리
  app.on('renderer-process-crashed', (event, webContents, killed) => {
    const error = new Error('렌더러 프로세스 충돌');
    debugLog('렌더러 프로세스 충돌:', { killed });
    logErrorToFile(error, 'renderer-crash');
    
    // 앱이 준비되었다면 사용자에게 알림
    if (app.isReady()) {
      showErrorDialog(
        error,
        '애플리케이션 오류',
        '렌더러 프로세스가 충돌했습니다. 앱을 다시 시작해 주세요.',
        false
      );
    }
  });
  
  // GPU 프로세스 충돌 처리
  app.on('gpu-process-crashed', (event, killed) => {
    const error = new Error('GPU 프로세스 충돌');
    debugLog('GPU 프로세스 충돌:', { killed });
    logErrorToFile(error, 'gpu-crash');
    
    // 앱이 준비되었다면 사용자에게 알림
    if (app.isReady()) {
      showErrorDialog(
        error,
        '그래픽 오류',
        'GPU 프로세스가 충돌했습니다. 하드웨어 가속을 비활성화하고 앱을 다시 시작합니다.',
        false
      );
    }
  });
}

module.exports = {
  logErrorToFile,
  showErrorDialog,
  notifyRendererOfError,
  handlePermissionError,
  handleNativeModuleError,
  handleNextServerError,
  setupGlobalErrorHandlers
}; 