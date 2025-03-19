const { app } = require('electron');
const path = require('path');
const { setupAppEventListeners } = require('./app-lifecycle');
const { debugLog } = require('./utils');

// Electron 앱이 단일 인스턴스로 실행되도록 설정
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  // 앱 초기화 전 GC 플래그 설정 (app.commandLine.appendSwitch는 app.ready 전에 호출해야 함)
  try {
    // 중요: 이 플래그는 앱 초기화 전에 설정해야 합니다
    if (process.argv.indexOf('--expose-gc') === -1) {
      app.commandLine.appendSwitch('js-flags', '--expose-gc');
      debugLog('GC 노출 플래그 설정 완료');
    } else {
      debugLog('GC 노출 플래그가 이미 설정되어 있습니다');
    }
    
    // Chrome 스타일의 GPU 가속을 위한 기본 플래그 추가 (app.ready 전)
    if (!app.commandLine.hasSwitch('disable-gpu')) {
      // 기본 GPU 설정 - app-lifecycle에서 세부 설정함
      app.commandLine.appendSwitch('enable-hardware-acceleration');
      app.commandLine.appendSwitch('enable-gpu-rasterization');
      app.commandLine.appendSwitch('enable-zero-copy');
      
      debugLog('기본 GPU 가속 플래그 설정 완료');
    }
  } catch (error) {
    debugLog('플래그 설정 실패:', error);
  }
  
  // 앱 시작 전 설정
  function setupAppConfig() {
    try {
      debugLog('앱 설정 초기화 시작');
      
      // 메모리 관련 플래그 추가
      app.commandLine.appendSwitch('js-flags', '--max-old-space-size=256');
      app.commandLine.appendSwitch('disable-site-isolation-trials');
      
      // GPU 설정을 app-lifecycle에서 처리하도록 변경
      // 이 시점에서는 기본 설정만 적용
      
      debugLog('기본 앱 설정 적용 완료');
      
      // 초기 실행 설정
      const gotTheLock = app.requestSingleInstanceLock();
      if (!gotTheLock) {
        debugLog('이미 다른 인스턴스가 실행 중입니다. 앱을 종료합니다.');
        app.quit();
        return;
      }
      
      // 메인 프로세스 초기화 시간 확보
      debugLog('메인 프로세스 초기화 대기 중...');
      setTimeout(() => {
        // 앱 이벤트 리스너 설정
        setupAppEventListeners();
        debugLog('앱 이벤트 리스너 설정 완료');
      }, 100);
    } catch (error) {
      console.error('앱 설정 초기화 중 오류:', error);
      // 오류 발생해도 앱은 계속 실행
      setupAppEventListeners();
    }
  }
  
  setupAppConfig();
}

/**
 * 애플리케이션 시작 전 GPU 설정 및 성능 최적화
 */
function setupGpuAcceleration() {
  const { settings } = appState;
  
  // GPU 하드웨어 가속 설정에 따라 스위치 적용
  if (settings && settings.useHardwareAcceleration) {
    // GPU 가속화 활성화
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top');
    app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
    
    // 고급 WebGL 최적화
    app.commandLine.appendSwitch('enable-webgl');
    app.commandLine.appendSwitch('canvas-oop-rasterization');
    
    // V8 최적화
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
    
    debugLog('GPU 하드웨어 가속이 활성화되었습니다.');
  } else {
    // 소프트웨어 렌더링 사용 (GPU 가속 비활성화)
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    
    // 메모리 사용 최적화 (하드웨어 가속이 꺼진 경우)
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048');
    
    debugLog('GPU 하드웨어 가속이 비활성화되었습니다. 소프트웨어 렌더링을 사용합니다.');
  }
  
  // 공통 성능 최적화 설정
  app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  app.commandLine.appendSwitch('disable-site-isolation-trials');
  
  // 메모리 압축 활성화
  app.commandLine.appendSwitch('enable-features', 'MemoryPressureBasedSourceBufferGC');
  app.commandLine.appendSwitch('force-fieldtrials', 'MemoryPressureBasedSourceBufferGC/Enabled');
  
  // CrashPad 비활성화 (선택적, 메모리 사용 감소)
  app.commandLine.appendSwitch('disable-crash-reporter');
  
  return settings?.useHardwareAcceleration || false;
}

/**
 * 앱 초기화 함수
 */
async function initializeApp() {
  try {
    // 설정 로드
    await loadSettings();
    
    // GPU 가속화 설정 적용 (앱 초기화 전에 호출해야 함)
    const isGpuEnabled = setupGpuAcceleration();
    
    // ...existing initialization code...
    
    // 창 생성 전에 메모리 설정 초기화
    setupMemoryManagement();
    
    // ...existing window creation code...
    
    // 메모리 최적화를 위한 이벤트 리스너 설정
    setupMemoryOptimizationEvents();
  } catch (error) {
    console.error('앱 초기화 중 오류:', error);
    app.quit();
  }
}

/**
 * 메모리 관리 설정
 */
function setupMemoryManagement() {
  const { settings } = appState;
  
  // 메모리 사용량 모니터링 간격 설정
  appState.memoryMonitorInterval = settings?.reduceMemoryInBackground ? 30000 : 60000; // 30초 또는 60초
  
  // 메모리 임계값 설정
  appState.memoryThreshold = {
    high: settings?.maxMemoryThreshold || 150, // MB 단위
    critical: (settings?.maxMemoryThreshold || 150) * 1.5
  };
  
  debugLog(`메모리 모니터링 설정: 간격=${appState.memoryMonitorInterval}ms, 임계값=${appState.memoryThreshold.high}MB`);
}

/**
 * 메모리 최적화를 위한 이벤트 리스너 설정
 */
function setupMemoryOptimizationEvents() {
  // 앱이 백그라운드로 갈 때 메모리 사용량 줄이기
  app.on('browser-window-blur', () => {
    if (appState.settings?.reduceMemoryInBackground) {
      debugLog('앱이 백그라운드로 전환됨: 메모리 최적화 모드 활성화');
      
      if (appState.mainWindow) {
        // 렌더러 프로세스에 백그라운드 모드 알림
        appState.mainWindow.webContents.send('background-mode', true);
        
        // 백그라운드에서 프레임 레이트 제한
        appState.mainWindow.webContents.setFrameRate(10);
        
        // 필요하지 않은 리소스 해제
        const { freeUpMemoryResources } = require('./memory-manager');
        freeUpMemoryResources(false);
      }
    }
  });
  
  // 앱이 포그라운드로 돌아왔을 때
  app.on('browser-window-focus', () => {
    if (appState.mainWindow) {
      debugLog('앱이 포그라운드로 전환됨: 일반 모드로 복원');
      
      // 렌더러 프로세스에 포그라운드 모드 알림
      appState.mainWindow.webContents.send('background-mode', false);
      
      // 프레임 레이트 복원
      appState.mainWindow.webContents.setFrameRate(60);
    }
  });
  
  // 앱이 일정 시간 유휴 상태일 때 메모리 정리
  let idleTimer = null;
  
  app.on('browser-window-blur', () => {
    if (idleTimer) clearTimeout(idleTimer);
    
    idleTimer = setTimeout(() => {
      debugLog('앱 유휴 상태 감지: 메모리 정리 수행');
      const { performGC } = require('./memory-manager');
      performGC();
      
      // 주기적 메모리 모니터링 시작
      startMemoryMonitoring();
    }, 60000); // 1분 후
  });
  
  app.on('browser-window-focus', () => {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  });
}

/**
 * 주기적 메모리 모니터링 시작
 */
function startMemoryMonitoring() {
  if (appState.memoryMonitorInterval <= 0) return;
  
  // 이미 실행 중인 타이머가 있으면 제거
  if (appState.memoryMonitorTimer) {
    clearInterval(appState.memoryMonitorTimer);
  }
  
  // 새 타이머 설정
  appState.memoryMonitorTimer = setInterval(() => {
    const { checkMemoryUsage } = require('./memory-manager');
    const memoryInfo = checkMemoryUsage();
    
    // 메모리 임계값 초과 시 자동 최적화
    if (memoryInfo.heapUsedMB > appState.memoryThreshold.high) {
      debugLog(`메모리 임계값 초과: ${memoryInfo.heapUsedMB}MB > ${appState.memoryThreshold.high}MB`);
      
      const { freeUpMemoryResources } = require('./memory-manager');
      const isEmergency = memoryInfo.heapUsedMB > appState.memoryThreshold.critical;
      
      freeUpMemoryResources(isEmergency);
      
      // 심각한 경우 GC 직접 호출
      if (isEmergency && global.gc) {
        debugLog('긴급 메모리 상황: GC 직접 호출');
        setTimeout(() => global.gc(), 100);
      }
    }
  }, appState.memoryMonitorInterval);
  
  debugLog(`메모리 모니터링 시작: 간격=${appState.memoryMonitorInterval}ms`);
}
