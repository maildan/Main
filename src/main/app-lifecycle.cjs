const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const constants = require('./constants.cjs');
const { appState, IDLE_TIMEOUT } = constants;
const { MEMORY_CHECK_INTERVAL, HIGH_MEMORY_THRESHOLD } = constants;
const windowModule = require('./window.cjs');
const { createWindow } = windowModule;
const { setupKeyboardListener } = require('./keyboard.cjs');
const { setupIpcHandlers } = require('./ipc-handlers.cjs');
const { loadSettings } = require('./settings.cjs');
const { debugLog } = require('./utils.cjs');
const { setupTray, destroyTray } = require('./tray.cjs');
const { setupMemoryMonitoring, performGC } = require('./memory-manager.cjs');
const { switchToLowMemoryMode } = require('./stats.cjs');

// GPU 설정 확인 및 적용 함수
async function setupGpuConfiguration() {
  try {
    debugLog('GPU 설정 적용 시작');
    
    // 설정 로드
    await loadSettings();
    
    // 하드웨어 가속 설정 적용
    const useHardwareAcceleration = appState.settings?.useHardwareAcceleration || false;
    const processingMode = appState.settings?.processingMode || 'auto';
    const highPerformance = processingMode === 'gpu-intensive';
    
    debugLog(`GPU 가속 설정 상태: ${useHardwareAcceleration ? '활성화됨' : '비활성화됨'}, 모드: ${processingMode}`);
    
    // Rust 네이티브 모듈 사용 시도
    try {
      const nativeModule = require('../native-modules.cjs');
      
      if (nativeModule) {
        // 초기화 함수 확인 - 여러 가능한 함수명 시도
        const initFuncNames = [
          'initialize_gpu',
          'initialize_gpu_module',
          'init_gpu'
        ];
        
        let initialized = false;
        for (const funcName of initFuncNames) {
          if (typeof nativeModule[funcName] === 'function') {
            initialized = nativeModule[funcName]();
            if (initialized) {
              debugLog(`Rust 네이티브 GPU 모듈 초기화 성공: ${funcName}`);
              break;
            }
          }
        }
        
        // 초기화 성공 여부 저장
        appState.gpuEnabled = initialized && useHardwareAcceleration;
        
        if (initialized) {
          // 가속화 활성화 여부 설정 - 여러 가능한 함수명 시도
          if (useHardwareAcceleration) {
            const enableFuncNames = [
              'enable_gpu_acceleration',
              'enable_acceleration',
              'set_gpu_acceleration'
            ];
            
            let accelerationSuccess = false;
            for (const funcName of enableFuncNames) {
              if (typeof nativeModule[funcName] === 'function') {
                accelerationSuccess = nativeModule[funcName]();
                if (accelerationSuccess) {
                  debugLog(`GPU 가속화 활성화 성공: ${funcName}`);
                  break;
                }
              }
            }
          } else {
            const disableFuncNames = [
              'disable_gpu_acceleration',
              'disable_acceleration',
              'set_gpu_acceleration'
            ];
            
            let disableSuccess = false;
            for (const funcName of disableFuncNames) {
              if (typeof nativeModule[funcName] === 'function') {
                // set_gpu_acceleration 함수는 boolean 인자를 받음
                if (funcName === 'set_gpu_acceleration') {
                  disableSuccess = nativeModule[funcName](false);
                } else {
                  disableSuccess = nativeModule[funcName]();
                }
                
                if (disableSuccess) {
                  debugLog(`GPU 가속화 비활성화 성공: ${funcName}`);
                  break;
                }
              }
            }
          }
        }
      }
    } catch (nativeError) {
      debugLog('네이티브 GPU 모듈 초기화 실패, JS 구현으로 폴백:', nativeError);
    }
    
    // 네이티브 모듈 사용 불가능한 경우 기본 Electron 설정 적용
    const { configureGPU } = require('./electron-config.cjs');
    
    // GPU 벤더 감지 (가능한 경우)
    let gpuVendor = 'auto';
    try {
      // WebGL을 통한 GPU 벤더 감지 시도 (렌더러 프로세스에서 수행)
      // 여기서는 기본값 사용
    } catch (vendorError) {
      debugLog('GPU 벤더 감지 실패, 자동 설정 사용:', vendorError);
    }
    
    // Electron GPU 설정 적용
    const configSuccess = configureGPU({
      enableHardwareAcceleration: useHardwareAcceleration,
      processingMode,
      highPerformance,
      gpuVendor
    });
    
    appState.gpuEnabled = useHardwareAcceleration && configSuccess;
    debugLog(`Electron GPU 설정 적용 ${configSuccess ? '성공' : '실패'}`);
    
    // 메모리 설정도 함께 적용
    const { configureMemorySettings } = require('./electron-config.cjs');
    configureMemorySettings(highPerformance);
    
    return configSuccess;
  } catch (error) {
    console.error('GPU 설정 적용 중 오류:', error);
    
    // 오류 발생 시 안전 모드로 설정 (GPU 비활성화)
    try {
      app.disableHardwareAcceleration();
      app.commandLine.appendSwitch('disable-gpu');
      debugLog('오류로 인해 안전 모드(GPU 비활성화)로 설정됨');
    } catch (safetyError) {
      console.error('안전 모드 설정 실패:', safetyError);
    }
    
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

// GC 플래그 확인
try {
  const hasGcFlag = process.argv.includes('--expose-gc') || 
                   process.execArgv.some(arg => arg.includes('--expose-gc'));
  
  debugLog('GC 플래그 상태:', hasGcFlag ? '사용 가능' : '사용 불가능');
  appState.gcEnabled = typeof global.gc === 'function';
} catch (error) {
  debugLog('GC 상태 확인 중 오류:', error);
}

/**
 * 앱 초기화 함수
 */
async function initializeApp() {
  try {
    debugLog('앱 초기화 시작');
    
    // 메모리 최적화를 위한 주기적 GC
    setInterval(() => {
      try {
        // performGC 함수 오류 수정
        if (global.gc) {
          debugLog('주기적인 GC 수행');
          global.gc();
        } else if (appState.gcEnabled) {
          debugLog('gc 함수가 설정되어 있으나 global.gc가 없음');
        } else {
          debugLog('gc 함수 사용 불가');
        }
      } catch (error) {
        debugLog('주기적 GC 수행 중 오류:', error);
      }
    }, 120000); // 2분마다
    
    debugLog('앱 초기화 시작');
    
    try {
      // GPU 설정 초기화
      await setupGpuConfiguration();
      debugLog('GPU 설정 초기화 완료');
      
      // 설정 확인
      debugLog(`GPU 가속 상태: ${appState.gpuEnabled ? '활성화됨' : '비활성화됨'}`);
      
      // 메모리 사용량 모니터링 시작
      setupMemoryMonitoring();
      
      // 설정 로드 (이미 GPU 설정에서 로드했으므로 중복되지 않게 수정)
      if (!appState.settings) {
        await loadSettings();
      }
      
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
    } catch (error) {
      console.error('앱 초기화 중 오류:', error);
      // 오류 발생 시 기본 설정으로 계속 시도
      createWindow();
      setupKeyboardListener();
      setupIpcHandlers();
    }
  } catch (error) {
    console.error('앱 초기화 중 오류:', error);
  }
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
  
  // 앱이 백그라운드로 전환될 때 메모리 최적화 처리
  app.on('browser-window-blur', () => {
    try {
      // 메모리 최적화 함수를 메모리 매니저에서 가져와서 사용
      const memoryManager = require('./memory-manager.cjs');
      
      // 함수 존재 여부 확인 후 호출
      if (typeof memoryManager.optimizeMemoryForBackground === 'function') {
        memoryManager.optimizeMemoryForBackground(true);
        debugLog('앱이 백그라운드로 전환됨: 메모리 최적화 모드 활성화');
      } else {
        debugLog('optimizeMemoryForBackground 함수를 찾을 수 없습니다. 대체 로직 사용');
      }
    } catch (err) {
      // memory-manager 모듈이 없는 경우 안전하게 처리
      debugLog('memory-manager 모듈을 로드할 수 없습니다:', err.message);
      const fallbackMemoryManager = createFallbackMemoryManager();
      fallbackMemoryManager.optimizeMemoryForBackground(true);
    }
  });
  
  // 앱이 포그라운드로 돌아왔을 때 일반 상태로 전환
  app.on('browser-window-focus', () => {
    try {
      // 메모리 매니저 모듈 동적 로드 시도
      const memoryManager = require('./memory-manager.cjs');
      
      // 함수 존재 여부 확인 후 호출
      if (typeof memoryManager.optimizeMemoryForBackground === 'function') {
        memoryManager.optimizeMemoryForBackground(false);
        debugLog('앱이 포그라운드로 복귀, 기본 상태로 전환');
      } else {
        debugLog('optimizeMemoryForBackground 함수를 찾을 수 없습니다. 대체 로직 사용');
        // 대체 로직: 필요시 리소스 복원
        if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
          appState.mainWindow.webContents.send('background-mode', false);
        }
      }
    } catch (error) {
      console.error('포그라운드 메모리 최적화 해제 오류:', error);
    }
  });
  
  // 메모리 부족 경고 이벤트 추가
  app.on('render-process-gone', (event, webContents, details) => {
    if (details.reason === 'oom' || details.reason === 'crashed') {
      debugLog('렌더러 프로세스 메모리 부족 또는 충돌:', details);
      // 메모리 긴급 정리
      try {
        const { freeUpMemoryResources } = require('./memory-manager.cjs');
        freeUpMemoryResources(true);
      } catch (error) {
        console.error('메모리 긴급 정리 중 오류:', error);
      }
    }
  });
  
  debugLog('앱 이벤트 리스너 설정 완료');
}

/**
 * 전역 예외 핸들러 설정
 * 처리되지 않은 예외를 잡아 앱이 충돌하지 않도록 함
 */
function setupGlobalExceptionHandlers() {
  // 처리되지 않은 예외 처리
  process.on('uncaughtException', (error) => {
    console.error('처리되지 않은 예외:', error);
    debugLog(`치명적인 오류 발생: ${error.message}`);
    
    // 오류 로깅 - 실제 프로덕션에서는 로그 파일이나 원격 서버에 기록
    try {
      const fs = require('fs');
      const path = require('path');
      const logDir = path.join(app.getPath('userData'), 'logs');
      
      // 로그 디렉토리 확인 및 생성
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      // 오류 로그 파일에 기록
      const logFile = path.join(logDir, `error-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
      const logContent = `[${new Date().toISOString()}] ${error.stack || error.message}\n`;
      
      fs.appendFileSync(logFile, logContent);
    } catch (logError) {
      console.error('오류 로깅 실패:', logError);
    }
    
    // 앱을 종료하지 않고 계속 실행
    debugLog('앱이 예외를 처리하고 계속 실행됩니다.');
  });
  
  // 처리되지 않은 Promise 거부 처리
  process.on('unhandledRejection', (reason, promise) => {
    console.error('처리되지 않은 Promise 거부:', reason);
    debugLog(`Promise 오류: ${reason}`);
  });
  
  // 렌더러 프로세스 충돌 처리
  app.on('render-process-gone', (event, webContents, details) => {
    console.error('렌더러 프로세스 종료:', details);
    debugLog(`렌더러 프로세스 오류: ${details.reason}`);
    
    // 메인 창이 충돌한 경우 복구 시도
    if (appState.mainWindow && webContents === appState.mainWindow.webContents) {
      debugLog('메인 창 복구 시도 중...');
      
      // 타이머로 지연시켜 안전하게 재생성
      setTimeout(() => {
        try {
          if (appState.mainWindow && appState.mainWindow.isDestroyed()) {
            debugLog('파괴된 창 재생성 시도');
            const { createWindow } = require('./window.cjs');
            createWindow();
          }
        } catch (e) {
          console.error('창 복구 실패:', e);
        }
      }, 1000);
    }
  });
  
  debugLog('전역 예외 핸들러 설정 완료');
}

/**
 * 메모리 매니저 모듈이 로드되지 않을 경우 대체 구현 제공
 * @returns {Object} 기본 메모리 관리 기능
 */
function createFallbackMemoryManager() {
  debugLog('대체 메모리 매니저 생성');
  return {
    optimizeMemoryForBackground: function(enable) {
      debugLog(`대체 메모리 최적화 함수 호출됨 (활성화: ${enable})`);
      // 기본 작업 수행
      if (enable) {
        // GC 직접 호출만 시도
        if (global.gc) {
          setTimeout(() => {
            global.gc();
            debugLog('GC 호출 완료');
          }, 500);
        }
        
        // 백그라운드 모드 알림
        if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
          appState.mainWindow.webContents.send('background-mode', true);
        }
      } else {
        // 포그라운드 모드 알림
        if (appState.mainWindow && !appState.mainWindow.isDestroyed()) {
          appState.mainWindow.webContents.send('background-mode', false);
        }
      }
      return true;
    },
    
    freeUpMemoryResources: function(emergency) {
      debugLog(`대체 메모리 정리 함수 호출됨 (긴급: ${emergency})`);
      // 기본 GC 수행
      if (global.gc) {
        global.gc();
        debugLog('기본 GC 수행 완료');
      }
      return true;
    }
  };
}

/**
 * 앱 생명주기 관리
 * 
 * 앱의 시작, 실행, 종료 등 생명주기를 관리하고
 * 메모리 및 리소스 관리를 담당합니다.
 */

const { initializeMemoryManager, stopMemoryMonitoring, forceMemoryOptimization } = require('./memory-manager.cjs');

// 앱 시작 시 초기화
function initializeAppLifecycle(settings) {
  // 메모리 관리자 초기화
  initializeMemoryManager({
    monitoringInterval: settings?.reduceMemoryInBackground ? 30000 : 60000,
    thresholds: {
      normal: settings?.maxMemoryThreshold ? settings.maxMemoryThreshold * 0.7 : 100,
      high: settings?.maxMemoryThreshold || 150,
      critical: settings?.maxMemoryThreshold ? settings.maxMemoryThreshold * 1.5 : 200
    },
    enableAutoOptimization: true
  });
  
  // 앱 종료 전 정리 작업
  app.on('before-quit', async (event) => {
    // 동기적으로 메모리 최적화를 수행하기 위해 이벤트 기본 동작 일시 중지
    event.preventDefault();
    
    try {
      console.log('앱 종료 전 정리 작업 수행 중...');
      
      // 메모리 모니터링 중지
      stopMemoryMonitoring();
      
      // 마지막 메모리 최적화 수행
      await forceMemoryOptimization(2, false);
      
      // 정리 작업 완료 후 앱 종료
      console.log('정리 작업 완료, 앱 종료');
      app.exit();
    } catch (error) {
      console.error('앱 종료 정리 작업 중 오류:', error);
      app.exit();
    }
  });
  
  // 시스템 저전력 모드 감지
  if (process.platform === 'darwin') {
    app.on('battery-status-changed', (status) => {
      // 배터리 부족 상태에서 메모리 최적화
      if (status.percent < 20 && !status.charging) {
        console.log('배터리 부족, 메모리 최적화 수행');
        forceMemoryOptimization(3, false);
      }
    });
  }
  
  // 앱이 백그라운드로 전환될 때 메모리 최적화
  app.on('browser-window-blur', () => {
    if (settings?.reduceMemoryInBackground) {
      console.log('앱이 백그라운드로 전환됨, 메모리 최적화 수행');
      forceMemoryOptimization(2, false);
    }
  });
  
  console.log('앱 생명주기 관리 초기화 완료');
}

// 모듈 내보내기
module.exports = {
  initializeAppLifecycle
};

module.exports = {
  initializeApp,
  cleanupApp,
  setupAppEventListeners,
  setupGpuConfiguration
};
