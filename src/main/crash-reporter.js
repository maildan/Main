/**
 * 앱 충돌 보고 및 로깅 모듈
 *
 * 앱의 예상치 못한 종료나 오류를 감지하고 보고하는 기능을 제공합니다.
 */

const { app, crashReporter, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 충돌 보고서 저장 디렉토리
const CRASH_REPORTS_DIR = path.join(app.getPath('userData'), 'crash-reports');
// 오류 로그 파일 경로
const ERROR_LOG_FILE = path.join(app.getPath('userData'), 'logs', 'error.log');
// 앱 실행 중 발생한 예외 목록
const uncaughtExceptions = [];
// 로그 파일 스트림
let errorLogStream = null;

/**
 * 충돌 보고 시스템 초기화
 * @param {object} options 초기화 옵션
 * @returns {boolean} 초기화 성공 여부
 */
function initializeCrashReporter(options = {}) {
  try {
    // 충돌 보고서 디렉토리 생성
    if (!fs.existsSync(CRASH_REPORTS_DIR)) {
      fs.mkdirSync(CRASH_REPORTS_DIR, { recursive: true });
    }

    // 로그 디렉토리 생성
    const logDir = path.dirname(ERROR_LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 오류 로그 스트림 열기
    errorLogStream = fs.createWriteStream(ERROR_LOG_FILE, { flags: 'a' });

    // 충돌 보고 설정
    const defaultOptions = {
      productName: app.getName(),
      companyName: options.companyName || 'Loop',
      submitURL: options.submitURL || '',
      uploadToServer:
        options.uploadToServer === undefined
          ? process.env.NODE_ENV === 'production'
          : options.uploadToServer,
      ignoreSystemCrashHandler: false,
      extra: {
        appVersion: app.getVersion(),
        osVersion: `${os.type()} ${os.release()}`,
        ...options.extra,
      },
    };

    // 충돌 보고자 시작
    crashReporter.start(defaultOptions);

    // 로그 시작 메시지
    const startMessage = `[${new Date().toISOString()}] 앱 시작 - ${app.getName()} v${app.getVersion()} - ${os.type()} ${os.release()}\n`;
    errorLogStream.write(startMessage);

    return true;
  } catch (error) {
    console.error('충돌 보고 시스템 초기화 오류:', error);
    return false;
  }
}

/**
 * 전역 예외 처리기 설정
 */
function setupExceptionHandlers() {
  // 메인 프로세스 처리되지 않은 예외
  process.on('uncaughtException', error => {
    handleUncaughtException(error);
  });

  // 메인 프로세스 처리되지 않은 거부된 프로미스
  process.on('unhandledRejection', reason => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    handleUncaughtException(error, 'unhandledRejection');
  });

  // 렌더러 프로세스 충돌
  app.on('renderer-process-crashed', (event, webContents, killed) => {
    const browserWindow = BrowserWindow.fromWebContents(webContents);
    const windowTitle = browserWindow ? browserWindow.getTitle() : 'Unknown';

    const crashInfo = {
      type: 'renderer-crash',
      killed,
      windowTitle,
      timestamp: new Date().toISOString(),
    };

    logError('렌더러 프로세스 충돌', crashInfo);

    // 사용자에게 충돌 알림
    if (browserWindow && !browserWindow.isDestroyed()) {
      dialog
        .showMessageBox(browserWindow, {
          type: 'error',
          title: '앱 오류',
          message: '앱이 충돌했습니다.',
          detail: '문제가 지속되면 앱을 다시 시작해주세요.',
          buttons: ['다시 로드', '앱 종료'],
          defaultId: 0,
        })
        .then(({ response }) => {
          if (response === 0) {
            // 페이지 다시 로드
            webContents.reload();
          } else {
            // 앱 종료
            app.quit();
          }
        });
    }
  });

  // GPU 프로세스 충돌
  app.on('gpu-process-crashed', (event, killed) => {
    const crashInfo = {
      type: 'gpu-crash',
      killed,
      timestamp: new Date().toISOString(),
    };

    logError('GPU 프로세스 충돌', crashInfo);

    // 현재 활성화된 창에 알림
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow && !focusedWindow.isDestroyed()) {
      dialog
        .showMessageBox(focusedWindow, {
          type: 'warning',
          title: 'GPU 오류',
          message: 'GPU 프로세스가 충돌했습니다.',
          detail: '하드웨어 가속을 비활성화하고 계속하시겠습니까?',
          buttons: ['하드웨어 가속 끄기', '그대로 진행'],
          defaultId: 0,
        })
        .then(({ response }) => {
          if (response === 0) {
            // 다음 실행 시 하드웨어 가속 비활성화
            app.disableHardwareAcceleration();

            // 앱 다시 시작 제안
            dialog
              .showMessageBox(focusedWindow, {
                type: 'info',
                message: '설정이 저장되었습니다. 변경사항을 적용하려면 앱을 다시 시작해야 합니다.',
                buttons: ['다시 시작', '나중에'],
                defaultId: 0,
              })
              .then(({ response: restartResponse }) => {
                if (restartResponse === 0) {
                  app.relaunch();
                  app.exit(0);
                }
              });
          }
        });
    }
  });

  // 앱 종료 시 정리
  app.on('will-quit', () => {
    if (errorLogStream) {
      const endMessage = `[${new Date().toISOString()}] 앱 종료\n`;
      errorLogStream.write(endMessage);
      errorLogStream.end();
    }
  });
}

/**
 * 처리되지 않은 예외 처리
 * @param {Error} error 발생한 오류 객체
 * @param {string} type 오류 유형
 */
function handleUncaughtException(error, type = 'uncaughtException') {
  try {
    // 오류 정보 구성
    const errorInfo = {
      type,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };

    // 오류 로깅
    console.error(`${type}:`, error);
    logError(type, errorInfo);

    // 내부 목록에 추가
    uncaughtExceptions.push(errorInfo);

    // 개발 모드에서는 오류 창 표시
    if (process.env.NODE_ENV === 'development') {
      dialog.showErrorBox(
        '처리되지 않은 예외 발생',
        `유형: ${type}\n메시지: ${error.message}\n\n${error.stack}`
      );
    } else if (uncaughtExceptions.length >= 3) {
      // 프로덕션에서는 예외가 3개 이상이면 사용자에게 알림
      const focusedWindow = BrowserWindow.getFocusedWindow();
      dialog
        .showMessageBox(focusedWindow, {
          type: 'error',
          title: '앱 오류',
          message: '앱에 여러 오류가 발생했습니다.',
          detail: '앱을 다시 시작하시겠습니까?',
          buttons: ['다시 시작', '계속 사용'],
          defaultId: 0,
        })
        .then(({ response }) => {
          if (response === 0) {
            app.relaunch();
            app.exit(1);
          }
        });
    }
  } catch (logError) {
    // 오류 처리 중 발생한 오류는 콘솔에만 출력
    console.error('오류 처리 중 추가 오류 발생:', logError);
  }
}

/**
 * 오류 로깅
 * @param {string} type 오류 유형
 * @param {object} errorInfo 오류 정보
 */
function logError(type, errorInfo) {
  try {
    if (!errorLogStream) {
      return;
    }

    const logEntry = {
      type,
      ...errorInfo,
      timestamp: errorInfo.timestamp || new Date().toISOString(),
    };

    // 로그 파일에 쓰기
    errorLogStream.write(`[${logEntry.timestamp}] [${type}] ${JSON.stringify(logEntry)}\n`);
  } catch (error) {
    console.error('오류 로깅 중 문제 발생:', error);
  }
}

/**
 * 충돌 보고서 정보 가져오기
 * @returns {object} 충돌 보고서 정보
 */
function getCrashReportInfo() {
  return {
    directory: CRASH_REPORTS_DIR,
    enabled: crashReporter.getUploadToServer(),
    lastCrashes: uncaughtExceptions.slice(-5), // 최근 5개
    uploadEnabled: crashReporter.getUploadToServer(),
    uploaded: crashReporter.getLastCrashReport() !== null,
    lastReport: crashReporter.getLastCrashReport(),
  };
}

/**
 * 충돌 보고서 업로드 설정
 * @param {boolean} shouldUpload 업로드 여부
 */
function setUploadCrashReports(shouldUpload) {
  crashReporter.setUploadToServer(shouldUpload);
}

/**
 * 오류 로그 파일 위치 가져오기
 * @returns {string} 로그 파일 경로
 */
function getErrorLogPath() {
  return ERROR_LOG_FILE;
}

module.exports = {
  initializeCrashReporter,
  setupExceptionHandlers,
  getCrashReportInfo,
  setUploadCrashReports,
  getErrorLogPath,
  logError,
};
