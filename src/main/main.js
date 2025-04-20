const { app, BrowserWindow, ipcMain, protocol, dialog } = require('electron');
const path = require('path');
const { setupAppLifecycle } = require('./app-lifecycle');
const { setupIpcHandlers } = require('./ipc-handlers');
const { setupKeyboardListener } = require('./keyboard');
const fs = require('fs');
const { setupMemoryManagement, optimizeForBackground } = require('./memory-manager');
const { setupTray } = require('./tray');
const { setupWorkers } = require('./workers');
const os = require('os');
const { setupErrorHandling } = require('./error-handling');
const { setupProtocolHandlers } = require('./protocol-handlers');
const { setupDebugging } = require('./debugging');
const { initConfig } = require('./electron-config');
const { appState } = require('./constants');
const { createWindow, getMainWindow } = require('./window');
const { debugLog } = require('./utils');
const http = require('http');
const { Menu } = require('electron');
const isDev = require('electron-is-dev');
const axios = require('axios');

// electron-reload 설정 개선
if (isDev) {
  try {
    const electronReload = require('electron-reload');
    const appRoot = path.join(__dirname, '../..');
    
    // 재시작 시 모든 모듈이 제대로 로드되도록 설정 개선
    electronReload(
      [
        path.join(appRoot, 'src/**/*'), 
        path.join(appRoot, 'main.js'),
        path.join(appRoot, 'preload.js'),
      ], 
      {
        electron: path.join(appRoot, 'node_modules', '.bin', 'electron'),
        hardResetMethod: 'exit',
        forceHardReset: true,
        // 일관된 모듈 로딩을 위해 캐시 무효화
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100
        }
      }
    );
    
    debugLog('electron-reload 설정 완료 - 개발 모드 핫 리로드 활성화');
  } catch (err) {
    console.error('electron-reload 설정 실패:', err);
  }
}

let isQuitting = false;

// 메인 프로세스 시작 로그
console.log(`[${new Date().toISOString()}] Electron 메인 프로세스 시작`);

// 메뉴바 제거
function removeMenuBar() {
  // 앱의 기본 메뉴바를 null로 설정하여 제거
  Menu.setApplicationMenu(null);
  debugLog('메뉴바가 제거되었습니다.');
}

// Next.js 서버가 준비되었는지 확인하는 함수
function checkIfNextServerReady() {
  return new Promise((resolve, reject) => {
    const checkServer = () => {
      axios.get('http://localhost:3000') // Ensure correct port
        .then(() => {
          debugLog('Next.js 서버 준비 완료');
          resolve();
        })
        .catch(() => {
          debugLog('Next.js 서버 대기 중...');
          setTimeout(checkServer, 1000); // Check again after 1 second
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
  const useHardwareAcceleration = settings?.useHardwareAcceleration || false;

  // 네이티브 모듈 API 로드
  let nativeModuleApi = null;
  try {
    nativeModuleApi = require('@/server/native');
  } catch (err) {
    console.error('네이티브 모듈 API 로드 실패:', err);
  }

  // GPU 하드웨어 가속 설정에 따라 스위치 적용
  if (useHardwareAcceleration) {
    // --- 기존 Electron 명령줄 스위치 설정 --- 
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top');
    app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
    app.commandLine.appendSwitch('enable-webgl');
    app.commandLine.appendSwitch('canvas-oop-rasterization');
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
    debugLog('Electron GPU 하드웨어 가속 관련 스위치 적용됨');

    // --- 네이티브 모듈 GPU 설정 추가 ---
    if (nativeModuleApi && typeof nativeModuleApi.isNativeModuleAvailable === 'function' 
        && nativeModuleApi.isNativeModuleAvailable()) {
      try {
        console.log('네이티브 GPU 모듈 초기화 및 설정 중...');
        
        // 1. GPU 모듈 초기화
        if (typeof nativeModuleApi.initializeGpuModule === 'function') {
          const initialized = nativeModuleApi.initializeGpuModule();
          console.log(`네이티브 GPU 모듈 초기화 ${initialized ? '성공' : '실패'}`);
        }
        
        // 2. GPU 가속화 설정
        if (typeof nativeModuleApi.setGpuAcceleration === 'function') {
          const accelerationEnabled = nativeModuleApi.setGpuAcceleration(true);
          console.log(`네이티브 GPU 가속화 ${accelerationEnabled ? '활성화됨' : '실패 또는 이미 활성화됨'}`);
        }
      } catch (error) {
        console.error('네이티브 GPU 모듈 설정 중 오류:', error);
      }
    } else {
      console.log('네이티브 모듈을 사용할 수 없거나 폴백 모드이므로 네이티브 GPU 설정을 건너뛰었습니다.');
    }

  } else {
    // --- 기존 Electron GPU 비활성화 코드 --- 
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048');
    debugLog('Electron GPU 하드웨어 가속 비활성화됨');

    // --- 네이티브 모듈 GPU 비활성화 ---
    if (nativeModuleApi && typeof nativeModuleApi.isNativeModuleAvailable === 'function' 
        && nativeModuleApi.isNativeModuleAvailable()) {
      try {
        // GPU 가속화 비활성화 설정
        if (typeof nativeModuleApi.setGpuAcceleration === 'function') {
          const accelerationDisabled = nativeModuleApi.setGpuAcceleration(false);
          console.log(`네이티브 GPU 가속화 ${accelerationDisabled ? '비활성화됨' : '실패 또는 이미 비활성화됨'}`);
        }
      } catch (error) {
        console.error('네이티브 GPU 모듈 비활성화 중 오류:', error);
      }
    } else {
       console.log('네이티브 모듈을 사용할 수 없거나 폴백 모드이므로 네이티브 GPU 비활성화를 건너뛰었습니다.');
    }
  }
  
  // --- 나머지 기존 공통 설정 코드 ---
  app.commandLine.appendSwitch('enable-features', 'SharedArrayBuffer');
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  app.commandLine.appendSwitch('disable-site-isolation-trials');
  
  // 메모리 압축 활성화
  app.commandLine.appendSwitch('enable-features', 'MemoryPressureBasedSourceBufferGC');
  app.commandLine.appendSwitch('force-fieldtrials', 'MemoryPressureBasedSourceBufferGC/Enabled');
  
  // CrashPad 비활성화 (선택적, 메모리 사용 감소)
  app.commandLine.appendSwitch('disable-crash-reporter');
  
  return useHardwareAcceleration;
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
    const nativeModuleApi = require('@/server/native'); 
    
    // 네이티브 모듈이 사용 가능한 경우 설정 초기화
    if (nativeModuleApi && typeof nativeModuleApi.isNativeModuleAvailable === 'function' && nativeModuleApi.isNativeModuleAvailable()) {
      console.log('네이티브 메모리 모듈 초기화 중...');
      
      // 네이티브 모듈에 설정 전달 (MemorySettings 인터페이스에 맞게 수정)
      const memorySettings = {
        enable_automatic_optimization: true, 
        // reduce_memory_in_background: settings?.reduceMemoryInBackground || true, // JS 레벨 설정, 네이티브에 직접 전달 X
        optimization_threshold: settings?.maxMemoryThreshold || 150, // 필드명 변경 (MB)
        optimization_interval: settings?.reduceMemoryInBackground ? 60000 : 120000, // 필드명 변경 (ms)
        aggressive_gc: false, // 네이티브에서 이 설정 받는지 확인 필요 (인터페이스에는 있음)
        enable_logging: true, // 네이티브에서 이 설정 받는지 확인 필요 (인터페이스에는 있음)
        enable_performance_metrics: true, // 네이티브에서 이 설정 받는지 확인 필요 (인터페이스에는 있음)
        use_hardware_acceleration: settings?.useHardwareAcceleration || false, // 인터페이스에 맞게 추가
        processing_mode: settings?.processingMode || 'auto', // 네이티브에서 이 설정 받는지 확인 필요 (인터페이스에는 있음)
        use_memory_pool: true, // 네이티브에서 이 설정 받는지 확인 필요 (인터페이스에는 있음)
        pool_cleanup_interval: 300000 // 네이티브에서 이 설정 받는지 확인 필요 (인터페이스에는 있음, ms)
      };
      
      // nativeModuleApi 객체를 통해 initializeMemorySettings 호출
      if (typeof nativeModuleApi.initializeMemorySettings === 'function') {
        nativeModuleApi.initializeMemorySettings(memorySettings);
      } else {
        console.error('nativeModuleApi에 initializeMemorySettings 함수가 없습니다.');
      }
    } else {
      console.log('네이티브 모듈을 사용할 수 없거나 폴백 모드입니다. 메모리 설정 초기화를 건너뛰었습니다.');
    }
  } catch (error) {
    console.error('메모리 관리 설정 중 오류:', error);
  }
}

/**
 * 메모리 최적화를 위한 이벤트 리스너 설정
 */
function setupMemoryOptimizationEvents() {
  const { settings } = appState;
  
  // 백그라운드 최적화 설정이 켜져 있는 경우에만 실행
  if (!settings?.reduceMemoryInBackground) {
    return;
  }
  
  let memoryCheckInterval = null;
  let lastActiveTime = Date.now();
  const idleThreshold = 60000; // 1분간 활동이 없으면 백그라운드로 간주
  
  // 포커스 변경 감지 (창이 비활성화 되었을 때)
  app.on('browser-window-blur', () => {
    if (!memoryCheckInterval && settings?.reduceMemoryInBackground) {
      // 백그라운드 메모리 체크 시작
      memoryCheckInterval = setInterval(checkMemoryUsage, 30000); // 30초마다 체크
      console.log('앱이 백그라운드로 전환됨, 메모리 최적화 시작');
    }
  });
  
  // 포커스 복원 감지 (창이 활성화 되었을 때)
  app.on('browser-window-focus', () => {
    // 타이머 중지
    if (memoryCheckInterval) {
      clearInterval(memoryCheckInterval);
      memoryCheckInterval = null;
      console.log('앱이 포그라운드로 전환됨, 메모리 최적화 중지');
    }
    
    // 마지막 활성 시간 갱신
    lastActiveTime = Date.now();
  });
  
  // 메모리 사용량을 체크하고 필요시 GC 실행하는 함수
  const checkMemoryUsage = async () => {
    try {
      // 현재 메모리 사용량 확인
      const memoryInfo = process.memoryUsage();
      const heapUsedMB = Math.round(memoryInfo.heapUsed / 1024 / 1024);
      
      console.log(`현재 힙 메모리 사용량: ${heapUsedMB}MB`);
      
      // 임계값 이상인 경우 가비지 컬렉션 실행
      if (heapUsedMB > (settings?.maxMemoryThreshold || 150)) {
        console.log('메모리 사용량이 임계값을 초과하여 GC를 실행합니다.');
        
        // V8 GC 실행 (--expose-gc 플래그가 활성화되어 있어야 함)
        if (global.gc) {
          global.gc(true); // force: true - 강제 GC 실행
          
          // GC 후 메모리 확인
          const afterGC = process.memoryUsage();
          const afterHeapUsedMB = Math.round(afterGC.heapUsed / 1024 / 1024);
          console.log(`GC 후 힙 메모리 사용량: ${afterHeapUsedMB}MB (${heapUsedMB - afterHeapUsedMB}MB 감소)`);
        } else {
          console.warn('GC를 직접 호출할 수 없습니다. --expose-gc 플래그가 설정되지 않았습니다.');
        }
      }
      
      // 오랜 시간 비활성 상태인 경우 추가 최적화
      const now = Date.now();
      const idleTime = now - lastActiveTime;
      
      if (idleTime > idleThreshold) {
        console.log(`앱이 ${Math.round(idleTime / 1000)}초 동안 비활성 상태입니다. 추가 최적화를 수행합니다.`);
        
        // 비활성 최적화 함수 호출
        await optimizeForBackground();
      }
    } catch (error) {
      console.error('메모리 체크 도중 오류 발생:', error);
    }
  };
  
  // 앱이 종료될 때 타이머 정리
  app.on('before-quit', () => {
    if (memoryCheckInterval) {
      clearInterval(memoryCheckInterval);
      memoryCheckInterval = null;
    }
  });
}

// 예상치 못한 오류 처리
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] 예상치 못한 오류:`, error);
  dialog.showErrorBox('예상치 못한 오류', `앱에서 예상치 못한 오류가 발생했습니다: ${error.message}`);
  
  // 심각한 오류 발생 시 애플리케이션 재시작
  const mainWindow = getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.close();
  }
  app.relaunch();
  app.exit(1);
});

// 앱 이벤트 리스너 설정 함수 (파일 레벨로 이동)
function setupAppEventListeners() {
  app.on('window-all-closed', () => {
    debugLog('모든 창이 닫혔습니다.');
    if (process.platform !== 'darwin') {
      debugLog('Darwin이 아니므로 앱을 종료합니다.');
      app.quit();
    }
  });

  app.on('before-quit', () => {
    debugLog('앱 종료 시작...');
    isQuitting = true;
  });

  // ... (기타 필요한 이벤트 리스너 유지)

  // Handle backgrounding (e.g., minimize)
  app.on('browser-window-blur', () => {
    console.log('Window blurred (backgrounded)');
    // Consider optimizing memory when backgrounded
    optimizeForBackground(true);
  });

  // Handle foregrounding (e.g., restore)
  app.on('browser-window-focus', () => {
    console.log('Window focused (foregrounded)');
    // Restore normal operation
    optimizeForBackground(false);
  });
}

// 초기화 함수 (파일 레벨)
function initialize() {
  // ... (내용 유지, setupAppConfig 호출 전)

  // 앱 시작 전 설정
  setupAppConfig(); // 내부에서 setupAppEventListeners 호출하지 않도록 수정
  // setupAppEventListeners 호출을 initialize 함수 끝으로 이동
}

// 앱 시작 전 설정 함수 (파일 레벨)
function setupAppConfig() {
  try {
    debugLog('앱 설정 초기화 시작');

    // ... (내용 유지)

    // 메인 프로세스 초기화 시간 확보
    debugLog('메인 프로세스 초기화 대기 중...');
    setTimeout(() => {
      // 앱 이벤트 리스너 설정 호출 제거 (initialize 함수 끝에서 호출)
      // setupAppEventListeners();
      debugLog('앱 설정 완료 (이벤트 리스너는 나중에 설정)');
    }, 100);
  } catch (error) {
    console.error('앱 설정 초기화 중 오류:', error);
    // 오류 발생 시에도 이벤트 리스너 설정 시도
    // setupAppEventListeners(); // 제거
  }
}

// GPU 가속 설정 함수 (파일 레벨)
function setupGpuAcceleration() {
  // ... (내용 유지)
}

// 앱 초기화 함수 (파일 레벨)
async function initializeApp() {
  // ... (내용 유지)
}

// 메모리 관리 설정 함수 (파일 레벨)
function setupMemoryManagement() {
  // ... (내용 유지)
}

// 앱 초기화 실행
initialize();
setupAppEventListeners(); // initialize 함수 호출 후 이벤트 리스너 설정

// app ready 이벤트
app.on('ready', async () => {
  try {
    debugLog('앱 준비됨, Next.js 서버 확인 중...');

    removeMenuBar();

    if (process.env.NODE_ENV === 'development') {
      await checkIfNextServerReady();
    }
    
    // 창 생성 및 기타 초기화
    appState.mainWindow = createWindow(); // createWindow 호출 위치 변경
    appState.tray = setupTray();
    setupKeyboardListener();
    setupWorkers();
    setupMemoryManagement();
    setupIpcHandlers();
    setupAppLifecycle();
    setupErrorHandling();
    setupDebugging(); // setupDebugging 호출 추가
    setupProtocolHandlers(); // setupProtocolHandlers 호출 추가

    console.log('App initialization complete');
  } catch (error) {
    debugLog('시작 오류:', error);
    app.quit(); // 시작 오류 시 종료
  }
});

// 두 번째 인스턴스 처리
app.on('second-instance', (event, commandLine, workingDirectory) => {
  // ... (내용 유지)
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (appState) {
       appState.mainWindow = createWindow();
    } else {
       console.error('appState is not initialized yet during activate event');
       // appState가 준비되지 않았을 때의 예외 처리
       // 필요하다면 여기서 초기화 로직을 다시 호출하거나, 오류를 로깅하고 종료
    }
  }
});


app.on('will-quit', () => {
  console.log('App will quit');
  // Ensure all cleanup happens here
  if (appState && appState.workers) { // appState null 체크 추가
    appState.workers.terminateAll();
  }
  if (appState && appState.keyboardListener) { // appState null 체크 추가
    appState.keyboardListener.stop();
  }
});


// 예기치 않은 오류 처리
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // 필요한 경우 추가 로깅 또는 사용자 알림
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // 필요한 경우 추가 로깅
});
