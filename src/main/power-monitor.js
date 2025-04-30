const { powerMonitor, ipcMain } = require('electron');

/**
 * 시스템 전원 상태 모니터링 모듈
 * - 전원 상태 변화 감지 및 이벤트 처리
 * - 시스템 잠금/해제 상태 감지
 * - 에너지 절약 모드 감지
 */

/**
 * 파워 모니터 모듈 초기화
 * @param {Electron.App} app - Electron 애플리케이션 인스턴스
 * @param {Electron.BrowserWindow} mainWindow - 메인 브라우저 윈도우 인스턴스
 */
function initPowerMonitor(app, mainWindow) {
  if (!mainWindow) {
    console.error('메인 윈도우가 없어 파워 모니터를 초기화할 수 없습니다.');
    return;
  }

  // 시스템 대기 모드 진입 감지
  powerMonitor.on('suspend', () => {
    console.log('시스템이 대기 모드로 진입합니다.');
    mainWindow.webContents.send('power-monitor-update', {
      event: 'suspend',
      timestamp: new Date().toISOString(),
    });
  });

  // 시스템 대기 모드 해제 감지
  powerMonitor.on('resume', () => {
    console.log('시스템이 대기 모드에서 복귀했습니다.');
    mainWindow.webContents.send('power-monitor-update', {
      event: 'resume',
      timestamp: new Date().toISOString(),
    });
  });

  // 시스템 잠금 감지
  powerMonitor.on('lock-screen', () => {
    console.log('시스템이 잠금 상태로 전환되었습니다.');
    mainWindow.webContents.send('power-monitor-update', {
      event: 'lock-screen',
      timestamp: new Date().toISOString(),
    });
  });

  // 시스템 잠금 해제 감지
  powerMonitor.on('unlock-screen', () => {
    console.log('시스템이 잠금 해제 상태로 전환되었습니다.');
    mainWindow.webContents.send('power-monitor-update', {
      event: 'unlock-screen',
      timestamp: new Date().toISOString(),
    });
  });

  // AC 전원 연결/해제 감지 (노트북용)
  powerMonitor.on('on-ac', () => {
    console.log('시스템이 AC 전원에 연결되었습니다.');
    mainWindow.webContents.send('power-monitor-update', {
      event: 'on-ac',
      timestamp: new Date().toISOString(),
    });
  });

  powerMonitor.on('on-battery', () => {
    console.log('시스템이 배터리 전원으로 전환되었습니다.');
    mainWindow.webContents.send('power-monitor-update', {
      event: 'on-battery',
      timestamp: new Date().toISOString(),
    });
  });

  // 남은 배터리 시간 및 충전 상태 요청 처리
  ipcMain.handle('get-battery-info', async () => {
    try {
      const onBattery = powerMonitor.isOnBatteryPower();
      
      return {
        onBattery,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('배터리 정보를 가져오는 중 오류 발생:', error);
      return { error: error.message };
    }
  });

  // 시스템 유휴 상태 감지
  let idleThreshold = 60; // 기본값: 60초
  
  ipcMain.handle('set-idle-threshold', (event, seconds) => {
    if (typeof seconds === 'number' && seconds > 0) {
      idleThreshold = seconds;
      return { success: true, newThreshold: idleThreshold };
    }
    return { success: false, error: '유효한 임계값이 아닙니다.' };
  });

  ipcMain.handle('get-system-idle-time', () => {
    try {
      const idleTime = powerMonitor.getSystemIdleTime();
      const isIdle = idleTime >= idleThreshold;
      
      return {
        idleTime,
        isIdle,
        threshold: idleThreshold,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('시스템 유휴 시간을 가져오는 중 오류 발생:', error);
      return { error: error.message };
    }
  });

  console.log('파워 모니터 모듈이 초기화되었습니다.');
}

module.exports = {
  initPowerMonitor
};
