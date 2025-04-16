const { app } = require('electron');
const path = require('path');
const { setupAppEventListeners } = require('./app-lifecycle');
const { debugLog } = require('./utils');
const { createWindow, getMainWindow } = require('./window');
const fs = require('fs');
const http = require('http');
const { Menu } = require('electron');

// 메뉴바 제거
function removeMenuBar() {
  // 앱의 기본 메뉴바를 null로 설정하여 제거
  Menu.setApplicationMenu(null);
  debugLog('메뉴바가 제거되었습니다.');
}

// Next.js 서버가 준비되었는지 확인하는 함수
function checkIfNextServerReady() {
  return new Promise((resolve) => {
    const checkServer = () => {
      debugLog('Next.js 서버 준비 상태 확인 중...');
      
      http.get('http://localhost:3000', (res) => {
        if (res.statusCode === 200) {
          debugLog('Next.js 서버 준비됨');
          resolve(true);
        } else {
          debugLog(`Next.js 서버 응답 코드: ${res.statusCode}, 재시도 중...`);
          setTimeout(checkServer, 1000);
        }
      }).on('error', (err) => {
        debugLog(`Next.js 서버 연결 실패: ${err.message}, 재시도 중...`);
        setTimeout(checkServer, 1000);
      });
    };
    
    checkServer();
  });
}

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
  
  // app ready 이벤트에서 Next.js 서버 준비 상태 확인 추가
  app.on('ready', async () => {
    try {
      debugLog('앱 준비됨, Next.js 서버 확인 중...');
      
      // 메뉴바 제거 호출
      removeMenuBar();
      
      // 개발 모드에서는 Next.js 서버 준비 상태 확인
      if (process.env.NODE_ENV === 'development') {
        await checkIfNextServerReady();
      }
      
      // 창 생성
      createWindow();
    } catch (error) {
      debugLog('시작 오류:', error);
    }
  });
  
  // 두 번째 인스턴스 실행 시 기존 창 활성화
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    debugLog('다른 인스턴스가 실행됨, 기존 창 활성화');
    const mainWindow = getMainWindow();
    
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
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
    
    // 창 생성 전에 메모리 설정 초기화
    setupMemoryManagement();
    
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
  
  try {
    // 네이티브 메모리 모듈 초기화
    const { isNativeModuleAvailable, initializeMemorySettings } = require('../server/native');
    
    // 네이티브 모듈이 사용 가능한 경우 설정 초기화
    if (isNativeModuleAvailable()) {
      console.log('네이티브 메모리 모듈 초기화 중...');
      
      // 네이티브 모듈에 설정 전달
      const memorySettings = {
        enable_automatic_optimization: true,
        optimization_threshold: settings?.maxMemoryThreshold || 150,
        optimization_interval: appState.memoryMonitorInterval,
        aggressive_gc: false,
        enable_logging: true,
        enable_performance_metrics: true,
        use_hardware_acceleration: settings?.useHardwareAcceleration || false,
        processing_mode: settings?.processingMode || 'auto',
        use_memory_pool: true,
        pool_cleanup_interval: 300000 // 5분
      };
      
      initializeMemorySettings(JSON.stringify(memorySettings));
      console.log('네이티브 메모리 모듈 설정 초기화 완료');
    } else {
      console.log('네이티브 메모리 모듈을 사용할 수 없음, JavaScript 기반 메모리 관리 사용');
    }
  } catch (error) {
    console.error('네이티브 메모리 모듈 초기화 오류:', error);
    console.log('JavaScript 기반 메모리 관리로 폴백');
  }
}

/**
 * 메모리 최적화를 위한 이벤트 리스너 설정
 */
function setupMemoryOptimizationEvents() {
  const { app, ipcMain } = require('electron');
  const { isNativeModuleAvailable, optimizeMemory, forceGarbageCollection } = require('../server/native');
  
  // 메모리 사용량 모니터링 타이머
  let memoryMonitorTimer = null;
  
  // 메모리 사용량 확인 및 최적화
  const checkMemoryUsage = async () => {
    try {
      // 현재 메모리 사용량 가져오기
      const memoryInfo = process.memoryUsage();
      const heapUsedMB = Math.round(memoryInfo.heapUsed / 1024 / 1024);
      const { high, critical } = appState.memoryThreshold;
      
      // 메모리 사용량이 임계값 초과 시 최적화 수행
      if (heapUsedMB > critical) {
        console.log(`메모리 사용량 위험 수준 (${heapUsedMB}MB > ${critical}MB), 긴급 최적화 수행`);
        
        // 네이티브 모듈 사용 가능 시 네이티브 최적화 사용
        if (isNativeModuleAvailable()) {
          await optimizeMemory(4, true); // 레벨 4(긴급)로 최적화
        } else {
          // JavaScript 기반 메모리 최적화
          global.gc && global.gc(true);
        }
      } else if (heapUsedMB > high) {
        console.log(`메모리 사용량 높음 (${heapUsedMB}MB > ${high}MB), 일반 최적화 수행`);
        
        // 네이티브 모듈 사용 가능 시 네이티브 최적화 사용
        if (isNativeModuleAvailable()) {
          await optimizeMemory(2, false); // 레벨 2(중간)로 최적화
        } else {
          // JavaScript 기반 메모리 최적화
          global.gc && global.gc();
        }
      }
    } catch (error) {
      console.error('메모리 사용량 확인 중 오류:', error);
    }
  };
  
  // 앱이 백그라운드로 전환될 때 메모리 최적화
  app.on('browser-window-blur', async () => {
    if (appState.settings?.reduceMemoryInBackground) {
      try {
        console.log('앱이 백그라운드로 전환됨, 메모리 최적화 수행');
        
        // 네이티브 모듈 사용 가능 시 네이티브 최적화 사용
        if (isNativeModuleAvailable()) {
          await optimizeMemory(3, false); // 레벨 3(높음)로 최적화
        } else {
          // JavaScript 기반 메모리 최적화
          global.gc && global.gc();
        }
      } catch (error) {
        console.error('백그라운드 메모리 최적화 중 오류:', error);
      }
    }
  });
  
  // 렌더러에서 메모리 최적화 요청 처리
  ipcMain.handle('optimize-memory', async (event, emergency = false) => {
    try {
      console.log(`메모리 최적화 요청 수신 (긴급: ${emergency})`);
      
      if (isNativeModuleAvailable()) {
        const level = emergency ? 4 : 2;
        const result = await optimizeMemory(level, emergency);
        return { success: true, result };
      } else {
        // JavaScript 기반 메모리 최적화
        global.gc && global.gc(emergency);
        return { success: true };
      }
    } catch (error) {
      console.error('메모리 최적화 요청 처리 중 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 렌더러에서 GC 요청 처리
  ipcMain.handle('request-gc', async (event, emergency = false) => {
    try {
      console.log(`GC 요청 수신 (긴급: ${emergency})`);
      
      if (isNativeModuleAvailable()) {
        const result = await forceGarbageCollection();
        return { success: true, result };
      } else {
        // JavaScript 기반 GC
        global.gc && global.gc(emergency);
        return { success: true };
      }
    } catch (error) {
      console.error('GC 요청 처리 중 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 주기적 메모리 모니터링 시작
  if (memoryMonitorTimer) {
    clearInterval(memoryMonitorTimer);
  }
  
  memoryMonitorTimer = setInterval(checkMemoryUsage, appState.memoryMonitorInterval);
  
  // 앱 종료 시 모니터링 중지
  app.on('before-quit', () => {
    if (memoryMonitorTimer) {
      clearInterval(memoryMonitorTimer);
      memoryMonitorTimer = null;
    }
  });
  
  console.log(`메모리 최적화 이벤트 리스너 설정 완료 (모니터링 간격: ${appState.memoryMonitorInterval}ms)`);
}
