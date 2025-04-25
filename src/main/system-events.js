/**
 * 시스템 이벤트 처리 모듈
 *
 * OS 수준의 시스템 이벤트를 처리하고 앱에 알립니다.
 */

const { app, BrowserWindow, powerMonitor, ipcMain } = require('electron');
const log = require('electron-log');

// 시스템 이벤트 리스너 목록
const systemEventListeners = new Map();

/**
 * 시스템 이벤트 처리 초기화
 */
function initializeSystemEvents() {
  log.info('시스템 이벤트 처리기 초기화');

  // 기본 이벤트 리스너 설정
  setupPowerMonitorEvents();
  setupAppLifecycleEvents();
  setupIpcEventHandlers();

  return true;
}

/**
 * 전원 관련 이벤트 리스너 설정
 */
function setupPowerMonitorEvents() {
  // 절전 모드 진입 이벤트
  powerMonitor.on('suspend', () => {
    log.info('시스템 절전 모드 진입');
    emitSystemEvent('system-suspend');

    // 메모리 최적화 및 정리 작업
    const memoryOptimizer = require('./memory-optimizer');
    if (memoryOptimizer && typeof memoryOptimizer.optimizeBeforeSystemSleep === 'function') {
      memoryOptimizer.optimizeBeforeSystemSleep();
    }
  });

  // 절전 모드 해제 이벤트
  powerMonitor.on('resume', () => {
    log.info('시스템 절전 모드 해제');
    emitSystemEvent('system-resume');

    // 앱 상태 복원
    restoreAppState();
  });

  // 시스템 잠금 이벤트
  powerMonitor.on('lock-screen', () => {
    log.info('화면 잠금');
    emitSystemEvent('system-lock');

    // 필요한 정리 작업
    pauseResourceIntensiveTasks();
  });

  // 시스템 잠금 해제 이벤트
  powerMonitor.on('unlock-screen', () => {
    log.info('화면 잠금 해제');
    emitSystemEvent('system-unlock');

    // 중지된 작업 재개
    resumeResourceIntensiveTasks();
  });

  // 유휴 상태 감지 (사용자 입력 없음)
  powerMonitor.on('user-did-become-idle', () => {
    log.info('사용자 유휴 상태 감지');
    emitSystemEvent('user-idle');

    // 유휴 상태 처리
    handleUserIdle();
  });

  // 유휴 상태 종료 (사용자 입력 감지)
  powerMonitor.on('user-did-resign-idle', () => {
    log.info('사용자 유휴 상태 종료');
    emitSystemEvent('user-active');

    // 유휴 상태 종료 처리
    handleUserActive();
  });

  // 시스템 종료 (Windows/Linux)
  if (process.platform !== 'darwin') {
    powerMonitor.on('shutdown', () => {
      log.info('시스템 종료 감지');
      emitSystemEvent('system-shutdown');

      // 데이터 저장 및 정리
      saveAndCleanupBeforeShutdown();
    });
  }

  // 배터리 상태 변경
  powerMonitor.on('on-battery', () => {
    log.info('배터리 모드로 전환');
    emitSystemEvent('on-battery');

    // 배터리 최적화 모드 활성화
    enableBatteryOptimization();
  });

  // AC 전원 연결
  powerMonitor.on('on-ac', () => {
    log.info('AC 전원 연결됨');
    emitSystemEvent('on-ac');

    // 성능 모드 활성화
    disableBatteryOptimization();
  });
}

/**
 * 앱 수명 주기 이벤트 리스너 설정
 */
function setupAppLifecycleEvents() {
  // 모든 창이 닫혔을 때 (macOS에서는 앱이 종료되지 않음)
  app.on('window-all-closed', () => {
    log.info('모든 창이 닫힘');

    // macOS가 아니면 앱 종료
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 앱 활성화 (macOS에서 Dock 아이콘 클릭 등)
  app.on('activate', () => {
    log.info('앱 활성화');

    // 열린 창이 없으면 새 창 생성
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  // 앱 종료 준비
  app.on('before-quit', event => {
    log.info('앱 종료 준비');
    emitSystemEvent('app-before-quit');

    // 저장되지 않은 상태 확인 및 처리
    const hasUnsavedChanges = checkForUnsavedChanges();

    if (hasUnsavedChanges) {
      // 종료 중단 및 확인 대화 상자 표시
      event.preventDefault();
      promptForUnsavedChanges();
    } else {
      // 데이터 저장 및 정리
      saveAndCleanupBeforeShutdown();
    }
  });

  // 앱이 두 번째로 실행된 경우 (Windows)
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    log.info('앱의 두 번째 인스턴스 감지됨');

    // 기존 창 활성화
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      if (windows[0].isMinimized()) {
        windows[0].restore();
      }
      windows[0].focus();

      // 명령줄 인수 처리 (필요한 경우)
      handleSecondInstanceArguments(commandLine);
    }
  });

  // 앱 준비 완료
  app.on('ready', () => {
    log.info('앱 준비 완료');

    // 시스템 이벤트 모니터링 시작
    startSystemMonitoring();
  });
}

/**
 * IPC 이벤트 핸들러 설정
 */
function setupIpcEventHandlers() {
  // 시스템 이벤트 구독 요청
  ipcMain.handle('subscribe-system-event', (event, eventName) => {
    const webContents = event.sender;

    // 구독 목록에 추가
    if (!systemEventListeners.has(eventName)) {
      systemEventListeners.set(eventName, new Set());
    }

    const listeners = systemEventListeners.get(eventName);
    listeners.add(webContents.id);

    // 자원 정리를 위해 webContents 닫힘 이벤트 리스닝
    webContents.once('destroyed', () => {
      if (systemEventListeners.has(eventName)) {
        const listeners = systemEventListeners.get(eventName);
        listeners.delete(webContents.id);

        if (listeners.size === 0) {
          systemEventListeners.delete(eventName);
        }
      }
    });

    return true;
  });

  // 시스템 이벤트 구독 해제 요청
  ipcMain.handle('unsubscribe-system-event', (event, eventName) => {
    const webContents = event.sender;

    if (systemEventListeners.has(eventName)) {
      const listeners = systemEventListeners.get(eventName);
      listeners.delete(webContents.id);

      if (listeners.size === 0) {
        systemEventListeners.delete(eventName);
      }
    }

    return true;
  });

  // 시스템 정보 요청
  ipcMain.handle('get-system-info', async () => {
    return getSystemInfo();
  });
}

/**
 * 시스템 이벤트 발행
 * @param {string} eventName 이벤트 이름
 * @param {object} data 이벤트 데이터
 */
function emitSystemEvent(eventName, data = {}) {
  if (!systemEventListeners.has(eventName)) {
    return;
  }

  const timestamp = Date.now();
  const eventData = {
    type: eventName,
    timestamp,
    ...data,
  };

  const listeners = systemEventListeners.get(eventName);
  for (const webContentsId of listeners) {
    try {
      const webContents = require('electron').webContents.fromId(webContentsId);
      if (webContents && !webContents.isDestroyed()) {
        webContents.send('system-event', eventData);
      }
    } catch (error) {
      log.error(`시스템 이벤트 전송 오류 (${eventName}):`, error);
    }
  }
}

/**
 * 앱 상태 복원
 */
function restoreAppState() {
  const windows = BrowserWindow.getAllWindows();
  for (const win of windows) {
    if (!win.isDestroyed()) {
      // 연결 상태 확인
      win.webContents.send('check-connection');

      // 앱 상태 새로고침
      win.webContents.send('restore-app-state');
    }
  }
}

/**
 * 리소스 집약적 작업 일시 중지
 */
function pauseResourceIntensiveTasks() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('pause-resource-tasks');
    }
  }

  // 백그라운드 작업 관리자 호출
  try {
    const memoryManager = require('./memory-manager');
    if (memoryManager && typeof memoryManager.optimizeMemory === 'function') {
      memoryManager.optimizeMemory(true); // 공격적 최적화
    }
  } catch (error) {
    log.error('리소스 최적화 오류:', error);
  }
}

/**
 * 리소스 집약적 작업 재개
 */
function resumeResourceIntensiveTasks() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('resume-resource-tasks');
    }
  }
}

/**
 * 유휴 상태 처리
 */
function handleUserIdle() {
  // 유휴 시 메모리 최적화
  try {
    const memoryManager = require('./memory-manager');
    if (memoryManager && typeof memoryManager.optimizeMemory === 'function') {
      memoryManager.optimizeMemory(false); // 일반 최적화
    }
  } catch (error) {
    log.error('유휴 상태 최적화 오류:', error);
  }

  // UI 업데이트
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('user-idle-state', { idle: true });
    }
  }
}

/**
 * 유휴 상태 종료 처리
 */
function handleUserActive() {
  // UI 업데이트
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('user-idle-state', { idle: false });
    }
  }
}

/**
 * 시스템 종료 전 데이터 저장 및 정리
 */
function saveAndCleanupBeforeShutdown() {
  // 열린 모든 창으로 저장 메시지 전송
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('save-before-exit');
    }
  }

  // 모든 임시 파일 정리
  try {
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(app.getPath('temp'), app.getName());

    if (fs.existsSync(tempDir)) {
      fs.readdirSync(tempDir).forEach(file => {
        try {
          fs.unlinkSync(path.join(tempDir, file));
        } catch (error) {
          log.warn(`임시 파일 삭제 실패 (${file}):`, error);
        }
      });
    }
  } catch (error) {
    log.error('임시 파일 정리 오류:', error);
  }
}

/**
 * 저장되지 않은 변경사항 확인
 * @returns {boolean} 저장되지 않은 변경사항 여부
 */
function checkForUnsavedChanges() {
  // 구현할 것: 저장되지 않은 변경사항 확인 로직
  // 여기서는 간단한 예시로 false 반환
  return false;
}

/**
 * 저장되지 않은 변경사항 확인 대화 상자 표시
 */
function promptForUnsavedChanges() {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (!focusedWindow) {
    app.exit(0);
    return;
  }

  require('electron')
    .dialog.showMessageBox(focusedWindow, {
      type: 'question',
      title: '저장되지 않은 변경사항',
      message: '저장되지 않은 변경사항이 있습니다. 저장하시겠습니까?',
      buttons: ['저장 후 종료', '변경사항 버리고 종료', '취소'],
      defaultId: 0,
    })
    .then(({ response }) => {
      if (response === 0) {
        // 저장 후 종료
        focusedWindow.webContents.send('save-and-exit');
      } else if (response === 1) {
        // 변경사항 버리고 종료
        app.exit(0);
      }
      // 취소 시 아무 작업 없음
    });
}

/**
 * 두 번째 인스턴스 실행 시 명령줄 인수 처리
 * @param {string[]} args 명령줄 인수
 */
function handleSecondInstanceArguments(args) {
  // 파일 열기 요청인지 확인 (Windows)
  if (process.platform === 'win32' && args.length > 1) {
    for (let i = 1; i < args.length; i++) {
      const filePath = args[i];
      if (filePath && !filePath.startsWith('--') && require('fs').existsSync(filePath)) {
        // 파일 열기 요청 전송
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].webContents.send('open-file-request', { filePath });
          break;
        }
      }
    }
  }
}

/**
 * 배터리 최적화 모드 활성화
 */
function enableBatteryOptimization() {
  // 배터리 최적화 설정
  try {
    const gpuUtils = require('./gpu-utils');
    if (gpuUtils && typeof gpuUtils.optimizeForBattery === 'function') {
      gpuUtils.optimizeForBattery(true);
    }

    const memoryManager = require('./memory-manager');
    if (memoryManager && typeof memoryManager.setBatteryMode === 'function') {
      memoryManager.setBatteryMode(true);
    }
  } catch (error) {
    log.error('배터리 최적화 활성화 오류:', error);
  }

  // UI에 배터리 모드 알림
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('power-mode-changed', { onBattery: true });
    }
  }
}

/**
 * 배터리 최적화 모드 비활성화
 */
function disableBatteryOptimization() {
  // 배터리 최적화 해제
  try {
    const gpuUtils = require('./gpu-utils');
    if (gpuUtils && typeof gpuUtils.optimizeForBattery === 'function') {
      gpuUtils.optimizeForBattery(false);
    }

    const memoryManager = require('./memory-manager');
    if (memoryManager && typeof memoryManager.setBatteryMode === 'function') {
      memoryManager.setBatteryMode(false);
    }
  } catch (error) {
    log.error('배터리 최적화 비활성화 오류:', error);
  }

  // UI에 AC 전원 모드 알림
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('power-mode-changed', { onBattery: false });
    }
  }
}

/**
 * 시스템 모니터링 시작
 */
function startSystemMonitoring() {
  // 시스템 메모리 모니터링
  try {
    const memoryManager = require('./memory-manager');
    if (memoryManager && typeof memoryManager.startMonitoring === 'function') {
      memoryManager.startMonitoring();
    }
  } catch (error) {
    log.error('메모리 모니터링 시작 오류:', error);
  }

  // 배터리 상태 초기 확인
  checkInitialPowerStatus();

  // 시스템 네트워크 상태 모니터링
  monitorNetworkStatus();
}

/**
 * 초기 전원 상태 확인
 */
function checkInitialPowerStatus() {
  try {
    const onBattery = powerMonitor.isOnBatteryPower();
    log.info(`초기 전원 상태: ${onBattery ? '배터리' : 'AC 전원'}`);

    if (onBattery) {
      enableBatteryOptimization();
    } else {
      disableBatteryOptimization();
    }
  } catch (error) {
    log.error('전원 상태 확인 오류:', error);
  }
}

/**
 * 네트워크 상태 모니터링
 */
function monitorNetworkStatus() {
  // 온라인/오프라인 상태 감지
  window.addEventListener('online', () => {
    log.info('네트워크 연결됨');
    emitSystemEvent('network-online');
  });

  window.addEventListener('offline', () => {
    log.info('네트워크 연결 끊김');
    emitSystemEvent('network-offline');
  });
}

/**
 * 시스템 정보 가져오기
 * @returns {object} 시스템 정보
 */
function getSystemInfo() {
  const os = require('os');

  return {
    platform: process.platform,
    arch: process.arch,
    osVersion: os.release(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    cpuCount: os.cpus().length,
    hostname: os.hostname(),
    uptime: os.uptime(),
    loadAverage: os.loadavg(),
    userInfo: os.userInfo(),
    onBattery: powerMonitor.isOnBatteryPower(),
    appVersion: app.getVersion(),
    timestamp: Date.now(),
  };
}

/**
 * 메인 윈도우 생성 (필요한 경우)
 */
function createMainWindow() {
  // 이 함수는 앱 코드에서 구현 필요
  log.info('메인 윈도우 생성 요청됨');

  // 이벤트 발생
  emitSystemEvent('create-main-window');
}

module.exports = {
  initializeSystemEvents,
  emitSystemEvent,
  getSystemInfo,
  enableBatteryOptimization,
  disableBatteryOptimization,
  saveAndCleanupBeforeShutdown,
};
