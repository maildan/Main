const { app } = require('electron');
const { appState, MEMORY_CHECK_INTERVAL, HIGH_MEMORY_THRESHOLD } = require('./constants');
const { createWindow } = require('./window');
const { setupKeyboardListener } = require('./keyboard');
const { setupIpcHandlers } = require('./ipc-handlers');
const { loadSettings } = require('./settings');
const { debugLog } = require('./utils');
const { setupTray, destroyTray } = require('./tray');
const { setupMemoryMonitoring, performGC } = require('./memory-manager');
const { switchToLowMemoryMode } = require('./stats');

// GPU 설정 확인 및 적용 함수
async function setupGpuConfiguration() {
  try {
    debugLog('GPU 설정 적용 시작 - Chrome 스타일 구성');
    
    // 설정 로드
    await loadSettings();
    
    // 하드웨어 가속 설정 적용
    const useHardwareAcceleration = appState.settings?.useHardwareAcceleration || false;
    
    debugLog(`GPU 가속 설정 상태: ${useHardwareAcceleration ? '활성화됨' : '비활성화됨'}`);
    
    // 이미 실행 중인 앱의 설정 변경인 경우, 재시작 필요 메시지 표시
    if (appState.mainWindow && appState.gpuEnabled !== useHardwareAcceleration) {
      debugLog('GPU 가속 설정이 변경되었습니다. 재시작이 필요합니다.');
    }
    
    if (!useHardwareAcceleration) {
      // GPU 가속이 비활성화된 경우
      app.disableHardwareAcceleration();
      debugLog('사용자 설정에 따라 하드웨어 가속 비활성화됨');
      appState.gpuEnabled = false;
      
      // 강제로 소프트웨어 렌더링 사용 (Chrome 스타일)
      app.commandLine.appendSwitch('disable-gpu');
      app.commandLine.appendSwitch('disable-gpu-compositing');
      app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
      app.commandLine.appendSwitch('disable-accelerated-video-decode');
      app.commandLine.appendSwitch('disable-accelerated-video-encode');
      app.commandLine.appendSwitch('disable-gpu-rasterization');
      app.commandLine.appendSwitch('disable-zero-copy');
      app.commandLine.appendSwitch('disable-webgl');
      debugLog('소프트웨어 렌더링 모드 활성화됨 (모든 GPU 기능 비활성화)');
    } else {
      // Chrome 스타일의 GPU 가속 활성화 및 최적화 플래그 설정
      debugLog('Chrome 스타일의 하드웨어 가속 활성화 시작');
      appState.gpuEnabled = true;
      
      // 기존 플래그 제거 (중복 적용 방지)
      try {
        app.commandLine.hasSwitch('ignore-gpu-blocklist') && app.commandLine.removeSwitch('ignore-gpu-blocklist');
        app.commandLine.hasSwitch('disable-gpu') && app.commandLine.removeSwitch('disable-gpu');
      } catch (e) {
        debugLog('기존 GPU 플래그 제거 중 오류 (무시됨):', e);
      }
      
      // Chrome의 GPU 가속 최적화 플래그 추가
      
      // 1. 기본 GPU 가속 활성화
      app.commandLine.appendSwitch('ignore-gpu-blocklist');
      
      // 2. 컴포지팅 및 래스터화 최적화 (Chrome 스타일)
      app.commandLine.appendSwitch('enable-gpu-rasterization');
      app.commandLine.appendSwitch('enable-zero-copy');
      app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
      app.commandLine.appendSwitch('enable-gpu-compositing');
      
      // 3. 비디오 가속 (Chrome 스타일)
      app.commandLine.appendSwitch('enable-accelerated-video-decode');
      if (process.platform !== 'darwin') { // macOS에서는 지원 안 됨
        app.commandLine.appendSwitch('enable-accelerated-video-encode');
      }
      
      // 4. WebGL 가속 (Chrome 스타일)
      app.commandLine.appendSwitch('enable-webgl');
      app.commandLine.appendSwitch('enable-webgl2');
      
      // 5. 네이티브 GPU 메모리 버퍼 최적화 (Chrome 스타일)
      app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
      
      // 6. 하드웨어 가속을 위한 플랫폼별 최적화 설정 (Chrome 스타일)
      if (process.platform === 'win32') {
        // Windows에서 DirectX 관련 최적화
        app.commandLine.appendSwitch('enable-direct-composition');
        app.commandLine.appendSwitch('enable-features', 'D3D11VideoDecoder,UseOzonePlatform,VaapiVideoDecoder');
        
        // ANGLE(Almost Native Graphics Layer) 설정 (Chrome 방식)
        app.commandLine.appendSwitch('use-angle', 'gl'); // 또는 'd3d11', 'd3d9', 'metal'
      } 
      else if (process.platform === 'darwin') {
        // macOS에서 Metal API 사용 (Chrome 방식)
        app.commandLine.appendSwitch('use-metal');
        app.commandLine.appendSwitch('enable-features', 'Metal');
      } 
      else if (process.platform === 'linux') {
        // Linux에서 Vulkan/VA-API 최적화
        app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,VaapiVideoEncoder,Vulkan');
        
        // OpenGL 최적화 설정
        app.commandLine.appendSwitch('use-gl', 'desktop');
      }
      
      // 7. GPU 프로세스 관리 최적화 (Chrome 스타일)
      app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');
      app.commandLine.appendSwitch('gpu-rasterization-msaa-sample-count', '0');
      
      // 8. 실험적 기능 활성화 (Chrome 방식)
      app.commandLine.appendSwitch('enable-features', 
        'CanvasOopRasterization,GpuMemoryBufferCompositor,LazyFrameGeneration,OverlayScrollbar');
      
      debugLog('Chrome 스타일의 GPU 가속 플래그 설정 완료');
    }
    
    // 처리 모드 적용
    const processingMode = appState.settings?.processingMode || 'auto';
    debugLog(`처리 모드 설정: ${processingMode}`);
    
    // 메모리 임계치 설정
    const maxMemoryThreshold = appState.settings?.maxMemoryThreshold || 100;
    debugLog(`메모리 임계치 설정: ${maxMemoryThreshold}MB`);
    
    // 설정 적용 시간 지연 추가 (안정화 시간)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    debugLog('GPU 설정 적용 완료');
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
    
    // 안정화를 위한 지연 추가 (필요한 경우에만)
    if (appState.gpuEnabled) {
      debugLog('GPU 초기화 안정화 대기 중...');
      await new Promise(resolve => setTimeout(resolve, 500));
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
