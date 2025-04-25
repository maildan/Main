/**
 * 앱 자동 업데이트 모듈
 *
 * Electron 앱의 자동 업데이트 기능을 관리합니다.
 */

const { app, autoUpdater, dialog, BrowserWindow, ipcMain } = require('electron');
const { is } = require('electron-util');
const os = require('os');
const log = require('electron-log');

// 업데이트 서버 URL
let updateServerUrl = '';
// 업데이트 확인 간격 (1시간 = 60 * 60 * 1000ms)
let checkInterval = 60 * 60 * 1000;
// 업데이트 확인 타이머 ID
let updateCheckTimer = null;
// 업데이트 상태 추적
let updateStatus = {
  checking: false,
  available: false,
  downloaded: false,
  error: null,
  info: null,
  lastCheck: null,
};

/**
 * 자동 업데이트 초기화
 * @param {object} options 초기화 옵션
 */
function initializeAutoUpdater(options = {}) {
  // 개발 모드나 로컬 빌드에서는 업데이트 비활성화
  if (is.development || !app.isPackaged) {
    log.info('개발 모드에서는 자동 업데이트가 비활성화됩니다.');
    return;
  }

  // 지원되지 않는 플랫폼 확인
  if (!(is.macos || is.windows)) {
    log.info('현재 플랫폼에서는 자동 업데이트가 지원되지 않습니다:', process.platform);
    return;
  }

  try {
    // 기본 옵션
    const defaultOptions = {
      // 서버 기본 URL - 실제 배포에서는 변경 필요
      server: 'https://update.loop.com',
      // 업데이트 확인 간격 (기본 1시간)
      interval: 60 * 60 * 1000,
      // 자동 다운로드 (기본 true)
      autoDownload: true,
      // 자동 설치 (기본 false)
      autoInstall: false,
    };

    // 옵션 병합
    const updaterOptions = { ...defaultOptions, ...options };
    updateServerUrl = updaterOptions.server;
    checkInterval = updaterOptions.interval;

    // 업데이트 서버 URL 설정
    const platform = process.platform;
    const arch = process.arch;
    const version = app.getVersion();

    // 서버 URL 구성 (서버 설정에 따라 조정 필요)
    let feedURL;
    if (is.macos) {
      feedURL = `${updateServerUrl}/update/mac/${version}`;
    } else if (is.windows) {
      feedURL = `${updateServerUrl}/update/win/${arch}/${version}`;
    }

    if (feedURL) {
      log.info('자동 업데이트 피드 URL:', feedURL);

      // 자동 업데이트 설정
      autoUpdater.setFeedURL({
        url: feedURL,
        headers: { 'User-Agent': `${app.getName()}/${version} (${platform}; ${arch})` },
      });

      // 자동 다운로드 설정
      autoUpdater.autoDownload = updaterOptions.autoDownload;
      autoUpdater.autoInstallOnAppQuit = updaterOptions.autoInstall;

      // 로그 설정
      autoUpdater.logger = log;

      // 이벤트 핸들러 등록
      setupAutoUpdaterEvents();

      // 주기적 업데이트 확인 설정
      startPeriodicUpdateCheck();

      log.info('자동 업데이트가 초기화되었습니다.');
    }
  } catch (error) {
    log.error('자동 업데이트 초기화 오류:', error);
  }
}

/**
 * 자동 업데이트 이벤트 핸들러 설정
 */
function setupAutoUpdaterEvents() {
  // 업데이트 확인 시작
  autoUpdater.on('checking-for-update', () => {
    log.info('업데이트 확인 중...');
    updateStatus.checking = true;
    updateStatus.lastCheck = new Date();

    // 모든 창에 업데이트 확인 중 알림
    sendStatusToWindows('checking-for-update');
  });

  // 업데이트 사용 가능
  autoUpdater.on('update-available', info => {
    log.info('새 업데이트가 있습니다:', info);
    updateStatus.available = true;
    updateStatus.info = info;
    updateStatus.checking = false;

    // 모든 창에 업데이트 가능 알림
    sendStatusToWindows('update-available', info);

    // 사용자에게 업데이트 알림 (자동 다운로드가 비활성화된 경우)
    if (!autoUpdater.autoDownload) {
      showUpdateNotification(info);
    }
  });

  // 업데이트 없음
  autoUpdater.on('update-not-available', info => {
    log.info('사용 가능한 업데이트가 없습니다.');
    updateStatus.available = false;
    updateStatus.checking = false;
    updateStatus.info = info;

    // 모든 창에 업데이트 없음 알림
    sendStatusToWindows('update-not-available', info);
  });

  // 업데이트 다운로드 중
  autoUpdater.on('download-progress', progressObj => {
    log.info(`다운로드 진행 중... ${progressObj.percent.toFixed(2)}%`);

    // 모든 창에 다운로드 진행 상황 전송
    sendStatusToWindows('download-progress', progressObj);
  });

  // 업데이트 다운로드 완료
  autoUpdater.on('update-downloaded', info => {
    log.info('업데이트 다운로드 완료:', info);
    updateStatus.downloaded = true;

    // 모든 창에 다운로드 완료 알림
    sendStatusToWindows('update-downloaded', info);

    // 사용자에게 업데이트 설치 알림
    showUpdateReadyNotification(info);
  });

  // 오류 발생
  autoUpdater.on('error', error => {
    log.error('업데이트 오류:', error);
    updateStatus.error = error;
    updateStatus.checking = false;

    // 모든 창에 오류 알림
    sendStatusToWindows('update-error', { error: error.message });
  });

  // IPC 이벤트 리스너 (렌더러에서의 요청 처리)
  ipcMain.handle('check-for-updates', async () => {
    return checkForUpdates(true);
  });

  ipcMain.handle('download-update', async () => {
    return downloadUpdate();
  });

  ipcMain.handle('install-update', () => {
    return installUpdate();
  });

  ipcMain.handle('get-update-status', () => {
    return updateStatus;
  });
}

/**
 * 업데이트 상태를 모든 창에 전송
 * @param {string} status 업데이트 상태
 * @param {object} data 상태 데이터
 */
function sendStatusToWindows(status, data = {}) {
  // 모든 창에 업데이트 상태 전송
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('update-status', { status, ...data });
    }
  }
}

/**
 * 주기적 업데이트 확인 시작
 */
function startPeriodicUpdateCheck() {
  // 기존 타이머가 있으면 정리
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
  }

  // 앱 시작 시 한 번 확인
  setTimeout(() => {
    checkForUpdates(false);
  }, 10000); // 앱 시작 10초 후 확인

  // 주기적 확인 설정
  updateCheckTimer = setInterval(() => {
    checkForUpdates(false);
  }, checkInterval);

  log.info(`주기적 업데이트 확인 설정됨 (간격: ${checkInterval / 1000 / 60}분)`);
}

/**
 * 업데이트 확인
 * @param {boolean} userInitiated 사용자 요청에 의한 확인 여부
 * @returns {Promise<object>} 업데이트 상태
 */
async function checkForUpdates(userInitiated = false) {
  // 업데이트 확인 중이거나 이미 다운로드된 경우 중복 확인 방지
  if (updateStatus.checking || updateStatus.downloaded) {
    return updateStatus;
  }

  try {
    log.info(`업데이트 확인 시작 (${userInitiated ? '사용자 요청' : '자동'})`);

    // 사용자에 의해 시작된 경우 UI 알림 표시
    if (userInitiated) {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        dialog.showMessageBox(focusedWindow, {
          type: 'info',
          title: '업데이트 확인',
          message: '업데이트를 확인하는 중입니다.',
          buttons: ['확인'],
        });
      }
    }

    // 업데이트 확인 (Promise로 변환)
    await new Promise((resolve, reject) => {
      try {
        autoUpdater.checkForUpdates();
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    return updateStatus;
  } catch (error) {
    log.error('업데이트 확인 중 오류:', error);
    updateStatus.error = error;
    updateStatus.checking = false;

    // 오류 알림 (사용자 요청 시에만)
    if (userInitiated) {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        dialog.showMessageBox(focusedWindow, {
          type: 'error',
          title: '업데이트 오류',
          message: '업데이트를 확인하는 중 오류가 발생했습니다.',
          detail: error.message,
          buttons: ['확인'],
        });
      }
    }

    return updateStatus;
  }
}

/**
 * 업데이트 다운로드
 * @returns {Promise<object>} 업데이트 상태
 */
async function downloadUpdate() {
  if (!updateStatus.available || updateStatus.downloaded) {
    return updateStatus;
  }

  try {
    log.info('업데이트 다운로드 시작');

    // 다운로드 시작 (Promise로 변환)
    await new Promise((resolve, reject) => {
      try {
        autoUpdater.downloadUpdate();
        resolve();
      } catch (error) {
        reject(error);
      }
    });

    return updateStatus;
  } catch (error) {
    log.error('업데이트 다운로드 중 오류:', error);
    updateStatus.error = error;

    // 오류 알림
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      dialog.showMessageBox(focusedWindow, {
        type: 'error',
        title: '다운로드 오류',
        message: '업데이트를 다운로드하는 중 오류가 발생했습니다.',
        detail: error.message,
        buttons: ['확인'],
      });
    }

    return updateStatus;
  }
}

/**
 * 다운로드된 업데이트 설치
 * @returns {boolean} 설치 시작 성공 여부
 */
function installUpdate() {
  if (!updateStatus.downloaded) {
    log.warn('설치할 수 있는 다운로드된 업데이트가 없습니다.');
    return false;
  }

  try {
    log.info('업데이트 설치 중...');

    // 앱 종료 및 업데이트 설치
    autoUpdater.quitAndInstall(false, true);
    return true;
  } catch (error) {
    log.error('업데이트 설치 중 오류:', error);
    return false;
  }
}

/**
 * 업데이트 가능 알림 표시
 * @param {object} info 업데이트 정보
 */
function showUpdateNotification(info) {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;

  const version = info.version || '새 버전';
  const releaseNotes = info.releaseNotes || '상세 정보 없음';

  dialog
    .showMessageBox(focusedWindow, {
      type: 'info',
      title: '업데이트 가능',
      message: `${app.getName()} ${version} 업데이트가 있습니다.`,
      detail: `현재 버전: ${app.getVersion()}\n새 버전: ${version}\n\n${releaseNotes}`,
      buttons: ['지금 다운로드', '나중에'],
      defaultId: 0,
    })
    .then(({ response }) => {
      if (response === 0) {
        // 다운로드 시작
        downloadUpdate();
      }
    });
}

/**
 * 업데이트 설치 준비 알림 표시
 * @param {object} info 업데이트 정보
 */
function showUpdateReadyNotification(info) {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) return;

  const version = info.version || '새 버전';

  dialog
    .showMessageBox(focusedWindow, {
      type: 'info',
      title: '업데이트 준비 완료',
      message: `${app.getName()} ${version} 업데이트가 준비되었습니다.`,
      detail: '지금 앱을 다시 시작하여 업데이트를 설치하시겠습니까?',
      buttons: ['지금 재시작', '나중에'],
      defaultId: 0,
    })
    .then(({ response }) => {
      if (response === 0) {
        // 업데이트 설치 및 재시작
        installUpdate();
      }
    });
}

/**
 * 수동으로 업데이트 확인 (외부에서 호출용)
 * @returns {Promise<object>} 업데이트 상태
 */
async function checkForUpdatesManually() {
  return checkForUpdates(true);
}

/**
 * 자동 업데이트 활성화 여부 설정
 * @param {boolean} enabled 활성화 여부
 */
function setAutoUpdateEnabled(enabled) {
  if (enabled) {
    startPeriodicUpdateCheck();
  } else {
    if (updateCheckTimer) {
      clearInterval(updateCheckTimer);
      updateCheckTimer = null;
    }
  }

  log.info(`자동 업데이트 ${enabled ? '활성화' : '비활성화'}`);
}

/**
 * 현재 업데이트 상태 가져오기
 * @returns {object} 업데이트 상태
 */
function getUpdateStatus() {
  return { ...updateStatus };
}

module.exports = {
  initializeAutoUpdater,
  checkForUpdatesManually,
  downloadUpdate,
  installUpdate,
  setAutoUpdateEnabled,
  getUpdateStatus,
};
