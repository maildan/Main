const { app } = require('electron');
const { appState, MEMORY_CHECK_INTERVAL, HIGH_MEMORY_THRESHOLD } = require('./constants');
const { createWindow } = require('./window');
const { setupKeyboardListener } = require('./keyboard');
const { setupIpcHandlers } = require('./ipc-handlers');
const { loadSettings } = require('./settings');
const { debugLog } = require('./utils');
const { setupTray, destroyTray } = require('./tray');
// 메모리 관리자 모듈 추가
const { setupMemoryMonitoring, performGC } = require('./memory-manager');
// GPU 설정 관련 모듈 추가
const { switchToLowMemoryMode } = require('./stats');

// GPU 설정 확인 및 적용 함수
async function setupGpuConfiguration() {
  try {
    // 설정 로드
    await loadSettings();
    
    // 하드웨어 가속 설정 적용
    const useHardwareAcceleration = appState.settings?.useHardwareAcceleration || false;
    
    if (!useHardwareAcceleration) {
      app.disableHardwareAcceleration();
      debugLog('사용자 설정에 따라 하드웨어 가속 비활성화됨');
      appState.gpuEnabled = false;
    } else {
      // GPU 가속 활성화 및 최적화 플래그 설정
      debugLog('하드웨어 가속 활성화됨');
      appState.gpuEnabled = true;
      
      // 성능 최적화 플래그 설정
      app.commandLine.appendSwitch('enable-gpu-rasterization');
      app.commandLine.appendSwitch('enable-zero-copy');
      app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
      
      // 메모리 관리 관련 플래그
      app.commandLine.appendSwitch('renderer-process-limit', '4');
      app.commandLine.appendSwitch('enable-features', 'NetworkService,NetworkServiceInProcess');
    }
    
    // 처리 모드 적용
    const processingMode = appState.settings?.processingMode || 'auto';
    debugLog(`처리 모드 설정: ${processingMode}`);
    
    // 메모리 임계치 설정
    const maxMemoryThreshold = appState.settings?.maxMemoryThreshold || 100;
    debugLog(`메모리 임계치 설정: ${maxMemoryThreshold}MB`);
    
    return true;
  } catch (error) {
    console.error('GPU 설정 적용 중 오류:', error);
    return false;
  }
}

// 앱 시작 시 하드웨어 가속 비활성화 여부 설정 - app.ready 이벤트 전에 실행
if (appState.settings && !appState.settings.useHardwareAcceleration) {
  try {
    app.disableHardwareAcceleration();
    debugLog('하드웨어 가속 비활성화됨');
  } catch (error) {
    debugLog('하드웨어 가속 비활성화 실패:', error);
  }
}

// GC 플래그 확인 (이 시점에서는 변경 불가능, 정보 제공용)
try {
  const hasGcFlag = process.argv.includes('--expose-gc') || 
                   process.execArgv.some(arg => arg.includes('--expose-gc'));
  
  debugLog('GC 플래그 상태:', hasGcFlag ? '사용 가능' : '사용 불가능');
  debugLog('Process argv:', process.argv);
  debugLog('Process execArgv:', process.execArgv);
  
  appState.gcEnabled = typeof global.gc === 'function';
  debugLog('GC 사용 가능 상태:', appState.gcEnabled);
} catch (error) {
  debugLog('GC 상태 확인 중 오류:', error);
}

/**
 * 앱 초기화 함수
 */
async function initializeApp() {
  debugLog('앱 초기화 시작');
  
  // GPU 설정 초기화 - 새로 추가된 부분
  await setupGpuConfiguration();
  
  // 메모리 사용량 모니터링 시작 - 새 모듈 사용
  setupMemoryMonitoring();
  
  // 설정 로드
  await loadSettings();
  
  // 메인 윈도우 생성
  createWindow();
  
  // 키보드 리스너 설정
  setupKeyboardListener();
  
  // IPC 핸들러 설정
  setupIpcHandlers();
  
  // 트레이 설정 추가
  if (appState.settings.minimizeToTray) {
    setupTray();
  }
  
  // GC가 사용 가능한지 확인
  if (typeof global.gc === 'function') {
    debugLog('GC 사용 가능 - 초기화 후 메모리 정리 실행');
    
    // 초기 GC 실행으로 시작 시 사용된 메모리 정리
    setTimeout(() => {
      performGC();
      debugLog('초기 메모리 정리 완료');
    }, 3000); // 앱 시작 3초 후 GC 실행
  } else {
    debugLog('경고: GC를 사용할 수 없습니다. 메모리 관리가 제한됩니다.');
    debugLog('GC 활성화를 위해 --expose-gc 플래그로 앱을 다시 시작하세요.');
  }
  
  debugLog('앱 초기화 완료');
}

/**
 * 앱 종료 정리 함수 - 메모리 최적화
 */
function cleanupApp() {
  debugLog('앱 종료 정리 시작');
  
  // 키보드 리스너 해제
  if (appState.keyboardListener) {
    appState.keyboardListener.kill();
    appState.keyboardListener = null;
  }
  
  // 모든 인터벌 정리
  if (appState.miniViewStatsInterval) {
    clearInterval(appState.miniViewStatsInterval);
    appState.miniViewStatsInterval = null;
  }
  
  if (appState.updateInterval) {
    clearInterval(appState.updateInterval);
    appState.updateInterval = null;
  }
  
  // 대용량 객체 참조 해제
  if (appState.currentStats) {
    // 복제본 생성하지 않고 직접 속성 초기화
    Object.keys(appState.currentStats).forEach(key => {
      if (typeof appState.currentStats[key] === 'object' && appState.currentStats[key] !== null) {
        appState.currentStats[key] = null;
      }
    });
  }
  
  // 이벤트 리스너 참조 해제
  if (appState.mainWindow) {
    appState.mainWindow.removeAllListeners();
  }
  
  if (appState.miniViewWindow) {
    appState.miniViewWindow.removeAllListeners();
  }
  
  // 트레이 제거 추가
  destroyTray();
  
  // 최종 메모리 정리
  if (global.gc) {
    debugLog('종료 전 메모리 정리 실행');
    global.gc();
  }
  
  debugLog('앱 종료 정리 완료');
}

/**
 * 앱 이벤트 리스너 설정
 */
function setupAppEventListeners() {
  // 앱 준비 이벤트
  app.on('ready', async () => {
    debugLog('앱 준비 완료');
    await initializeApp();
  });
  
  // 모든 창이 닫힐 때 이벤트 (트레이 모드 지원 추가)
  app.on('window-all-closed', () => {
    // 설정에서 트레이로 최소화 옵션이 비활성화되었거나
    // 명시적으로 종료가 허용된 경우에만 앱 종료
    if (process.platform !== 'darwin' && (!appState.settings.minimizeToTray || appState.allowQuit)) {
      app.quit();
    }
  });
  
  // 앱 활성화 이벤트 (macOS)
  app.on('activate', () => {
    if (appState.mainWindow === null) {
      createWindow();
    }
  });
  
  // 앱 종료 전 이벤트
  app.on('will-quit', cleanupApp);
  
  // 앱이 백그라운드로 전환될 때 메모리 최적화
  app.on('browser-window-blur', () => {
    if (appState.settings.reduceMemoryInBackground) {
      const { optimizeMemoryForBackground } = require('./memory-manager');
      optimizeMemoryForBackground(true);
      debugLog('앱이 백그라운드로 전환됨, 메모리 최적화 실행');
    }
  });
  
  // 앱이 포그라운드로 돌아올 때
  app.on('browser-window-focus', () => {
    if (appState.inBackgroundMode) {
      const { optimizeMemoryForBackground } = require('./memory-manager');
      optimizeMemoryForBackground(false);
      debugLog('앱이 포그라운드로 복귀, 기본 상태로 전환');
    }
  });
  
  // 메모리 부족 경고 이벤트 추가
  app.on('render-process-gone', (event, webContents, details) => {
    if (details.reason === 'oom' || details.reason === 'crashed') {
      debugLog('렌더러 프로세스 메모리 부족 또는 충돌:', details);
      // 메모리 긴급 정리
      const { freeUpMemoryResources } = require('./memory-manager');
      freeUpMemoryResources(true);
    }
  });
  
  debugLog('앱 이벤트 리스너 설정 완료');
}

module.exports = {
  initializeApp,
  cleanupApp,
  setupAppEventListeners,
  setupGpuConfiguration // 새로운 함수 내보내기
};
