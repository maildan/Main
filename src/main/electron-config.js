/**
 * Electron 앱 구성 및 GPU 가속화 설정
 * 메모리 및 GPU 최적화를 위한 설정을 관리합니다.
 */

const { app } = require('electron');
const { debugLog } = require('./utils');

/**
 * GPU 가속화 설정 적용
 * @param {Object} options - 가속화 옵션
 * @param {boolean} options.enableHardwareAcceleration - 하드웨어 가속 활성화 여부
 * @param {string} options.processingMode - 처리 모드 ('auto', 'normal', 'cpu-intensive', 'gpu-intensive')
 * @param {boolean} options.highPerformance - 고성능 모드 여부
 * @returns {boolean} 설정 적용 성공 여부
 */
function configureGPU(options = {}) {
  try {
    const {
      enableHardwareAcceleration = true,
      processingMode = 'auto',
      highPerformance = false
    } = options;
    
    debugLog(`GPU 설정 구성: 하드웨어 가속=${enableHardwareAcceleration}, 모드=${processingMode}, 고성능=${highPerformance}`);
    
    // 하드웨어 가속 비활성화 여부에 따라 설정
    if (!enableHardwareAcceleration) {
      debugLog('하드웨어 가속 비활성화 중...');
      app.disableHardwareAcceleration();
      
      // 소프트웨어 렌더링 활성화 및 관련 기능 비활성화
      app.commandLine.appendSwitch('disable-gpu');
      app.commandLine.appendSwitch('disable-gpu-compositing');
      app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
      app.commandLine.appendSwitch('disable-accelerated-video-decode');
      app.commandLine.appendSwitch('disable-accelerated-video-encode');
      
      return true;
    }
    
    // 하드웨어 가속 활성화 시 추가 설정
    debugLog('하드웨어 가속 활성화 중...');
    
    // 기본 하드웨어 가속 설정
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    
    // 고성능 모드일 경우 추가 설정
    if (highPerformance) {
      debugLog('고성능 GPU 모드 적용 중...');
      
      // 플랫폼별 최적화 설정
      if (process.platform === 'win32') {
        // Windows 환경 최적화
        app.commandLine.appendSwitch('enable-direct-composition');
        app.commandLine.appendSwitch('enable-features', 'D3D11VideoDecoder');
        app.commandLine.appendSwitch('use-angle', 'd3d11'); // Direct3D 11 사용
        
      } else if (process.platform === 'darwin') {
        // macOS 환경 최적화
        app.commandLine.appendSwitch('use-metal'); // Metal API 사용
        app.commandLine.appendSwitch('enable-features', 'Metal');
        
      } else if (process.platform === 'linux') {
        // Linux 환경 최적화
        app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,Vulkan');
        app.commandLine.appendSwitch('use-gl', 'desktop');
      }
      
      // 고급 GPU 메모리 및 성능 최적화
      app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');
      app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
      app.commandLine.appendSwitch('enable-oop-rasterization');
    }
    
    // 처리 모드에 따른 추가 설정
    if (processingMode === 'gpu-intensive') {
      debugLog('GPU 집약적 처리 모드 설정...');
      
      // WebGL 가속 활성화
      app.commandLine.appendSwitch('enable-webgl');
      app.commandLine.appendSwitch('enable-webgl2');
      
      // GPU 용 메모리 관리
      app.commandLine.appendSwitch('gpu-memory-buffer-pool-size', highPerformance ? '1024' : '512');
      
      // 캔버스 가속
      app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
      app.commandLine.appendSwitch('canvas-oop-rasterization');
    }
    
    // 메모리 관리 설정
    configureMemorySettings(highPerformance);
    
    return true;
  } catch (error) {
    console.error('GPU 설정 적용 중 오류:', error);
    return false;
  }
}

/**
 * 메모리 관련 설정 구성
 * @param {boolean} highPerformance - 고성능 모드 여부
 */
function configureMemorySettings(highPerformance = false) {
  try {
    // V8 엔진 메모리 관련 설정
    const memoryLimit = highPerformance ? 4096 : 2048; // MB 단위
    app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${memoryLimit}`);
    
    // 메모리 압축 활성화
    app.commandLine.appendSwitch('enable-features', 'MemoryPressureBasedSourceBufferGC');
    
    debugLog(`메모리 설정 구성: 최대 힙 크기=${memoryLimit}MB`);
  } catch (error) {
    console.error('메모리 설정 구성 중 오류:', error);
  }
}

/**
 * 프레임 레이트 설정
 * @param {Electron.WebContents} webContents - WebContents 객체
 * @param {number} fps - 설정할 FPS (기본값: 60)
 * @param {boolean} vsync - 수직 동기화 활성화 여부
 */
function setFrameRate(webContents, fps = 60, vsync = true) {
  try {
    if (!webContents || webContents.isDestroyed()) {
      debugLog('프레임 레이트 설정 실패: 유효하지 않은 WebContents');
      return false;
    }
    
    // 프레임 레이트 설정
    webContents.setFrameRate(fps);
    
    // 수직 동기화 설정 (Electron 12 이상에서 지원)
    if (typeof webContents.enableDeviceEmulation === 'function') {
      try {
        // 직접적인 vsync 설정 방법이 없으므로 스크립트 주입
        webContents.executeJavaScript(`
          if (window.electronAPI && window.electronAPI.setVsync) {
            window.electronAPI.setVsync(${vsync});
          }
        `).catch(e => console.warn('vsync 스크립트 실행 오류:', e));
      } catch (e) {
        debugLog('vsync 설정 중 오류:', e);
      }
    }
    
    debugLog(`프레임 레이트 설정: ${fps}fps, vsync=${vsync}`);
    return true;
  } catch (error) {
    console.error('프레임 레이트 설정 중 오류:', error);
    return false;
  }
}

/**
 * 백그라운드에서 GPU 최적화 설정
 * @param {Electron.WebContents} webContents - WebContents 객체
 * @param {boolean} isBackground - 백그라운드 상태 여부
 */
function optimizeGPUForBackground(webContents, isBackground) {
  try {
    if (!webContents || webContents.isDestroyed()) {
      return;
    }
    
    if (isBackground) {
      // 백그라운드에서는 프레임 레이트 제한
      setFrameRate(webContents, 10, false);
      
      // 렌더러 프로세스에 백그라운드 모드 알림
      webContents.send('background-mode', true);
      
      debugLog('백그라운드 GPU 최적화 적용됨');
    } else {
      // 포그라운드로 복귀 시 정상 설정으로 복원
      setFrameRate(webContents, 60, true);
      
      // 렌더러 프로세스에 포그라운드 모드 알림
      webContents.send('background-mode', false);
      
      debugLog('포그라운드 GPU 설정 복원됨');
    }
  } catch (error) {
    console.error('백그라운드 GPU 최적화 중 오류:', error);
  }
}

/**
 * 현재 GPU 정보 반환
 * @returns {Promise<Object>} GPU 정보
 */
async function getGPUInfo() {
  try {
    if (!app.isReady()) {
      return { error: 'Electron 앱이 준비되지 않았습니다.' };
    }
    
    // GPU 정보를 가져오는 비동기 함수
    return new Promise((resolve) => {
      // 타임아웃 설정
      const timeout = setTimeout(() => {
        resolve({ error: 'GPU 정보 가져오기 시간 초과' });
      }, 3000);
      
      try {
        // GPU 정보 가져오기 시도
        app.getGPUInfo('complete').then(info => {
          clearTimeout(timeout);
          resolve(info);
        }).catch(error => {
          clearTimeout(timeout);
          resolve({ error: `GPU 정보 가져오기 오류: ${error.message}` });
        });
      } catch (e) {
        clearTimeout(timeout);
        resolve({ error: `GPU 정보 가져오기 예외: ${e.message}` });
      }
    });
  } catch (error) {
    return { error: `GPU 정보 가져오기 중 오류: ${error.message}` };
  }
}

// 모듈 내보내기
module.exports = {
  configureGPU,
  configureMemorySettings,
  setFrameRate,
  optimizeGPUForBackground,
  getGPUInfo
};
