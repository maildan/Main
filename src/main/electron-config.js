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
 * @param {string} options.gpuVendor - GPU 벤더 ('nvidia', 'amd', 'intel', 'apple', 'auto')
 * @returns {boolean} 설정 적용 성공 여부
 */
function configureGPU(options = {}) {
  try {
    const {
      enableHardwareAcceleration = true,
      processingMode = 'auto',
      highPerformance = false,
      gpuVendor = 'auto'
    } = options;
    
    debugLog(`GPU 설정 구성: 하드웨어 가속=${enableHardwareAcceleration}, 모드=${processingMode}, 고성능=${highPerformance}, 벤더=${gpuVendor}`);
    
    // 하드웨어 가속 비활성화 여부에 따라 설정
    if (!enableHardwareAcceleration) {
      // GPU 가속이 비활성화된 경우
      app.disableHardwareAcceleration();
      debugLog('하드웨어 가속 비활성화됨');
      
      // 강제로 소프트웨어 렌더링 사용
      app.commandLine.appendSwitch('disable-gpu');
      app.commandLine.appendSwitch('disable-gpu-compositing');
      app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
      app.commandLine.appendSwitch('disable-accelerated-video-decode');
      
      return true;
    }
    
    // 기본 하드웨어 가속 설정 (Chrome 방식 적용)
    // 1. GPU 블랙리스트 무시 (더 많은 GPU 지원)
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
    
    // 2. 기본 GPU 가속화 활성화
    app.commandLine.appendSwitch('enable-gpu-rasterization');
    app.commandLine.appendSwitch('enable-zero-copy');
    
    // 3. 플랫폼별 특화 설정 (Chrome 방식)
    if (process.platform === 'win32') {
      // Windows 환경 최적화
      app.commandLine.appendSwitch('enable-direct-composition');
      app.commandLine.appendSwitch('enable-features', 'D3D11VideoDecoder');
      
      // GPU 벤더별 최적화
      if (gpuVendor === 'nvidia' || gpuVendor === 'auto') {
        app.commandLine.appendSwitch('use-angle', 'd3d11'); // NVIDIA에 최적화된 D3D11 사용
      } else if (gpuVendor === 'amd') {
        app.commandLine.appendSwitch('use-angle', 'd3d11');
        app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
      } else if (gpuVendor === 'intel') {
        app.commandLine.appendSwitch('use-angle', 'd3d11');
      } else {
        app.commandLine.appendSwitch('use-angle', 'd3d11'); // 기본값
      }
    } else if (process.platform === 'darwin') {
      // macOS 환경 최적화
      app.commandLine.appendSwitch('use-metal'); // Metal API 사용
      app.commandLine.appendSwitch('enable-features', 'Metal');
      
    } else if (process.platform === 'linux') {
      // Linux 환경 최적화
      app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,Vulkan');
      app.commandLine.appendSwitch('use-gl', 'desktop');
    }
    
    // 고성능 모드일 경우 추가 설정
    if (highPerformance) {
      debugLog('고성능 GPU 모드 적용 중...');
      
      // 고급 GPU 메모리 및 성능 최적화
      app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');
      app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
      app.commandLine.appendSwitch('enable-oop-rasterization');
      
      // 비디오 가속
      app.commandLine.appendSwitch('enable-accelerated-video-decode');
      if (process.platform !== 'darwin') { // macOS에서는 지원되지 않음
        app.commandLine.appendSwitch('enable-accelerated-video-encode');
      }
      
      // WebGL 가속
      app.commandLine.appendSwitch('enable-webgl2-compute-context');
    }
    
    // 처리 모드에 따른 추가 설정
    if (processingMode === 'gpu-intensive') {
      // GPU 사용 극대화
      app.commandLine.appendSwitch('enable-unsafe-webgpu'); // WebGPU 활성화
      app.commandLine.appendSwitch('enable-webgpu-developer-features');
      debugLog('고성능 GPU 집약적 모드 활성화됨');
    } else if (processingMode === 'cpu-intensive') {
      // CPU 중심 처리 (일부 GPU 기능 비활성화)
      app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
      debugLog('CPU 집약적 모드가 일부 GPU 기능을 비활성화함');
    }
    
    // 실험적 기능: 하드웨어 오버레이
    if (highPerformance && processingMode === 'gpu-intensive') {
      app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
    }
    
    debugLog('GPU 설정 적용 완료');
    return true;
  } catch (error) {
    console.error('GPU 설정 적용 중 오류:', error);
    // 오류 발생 시 안전 모드 적용
    try {
      app.disableHardwareAcceleration();
      app.commandLine.appendSwitch('disable-gpu');
      debugLog('오류로 인해 안전 모드(GPU 비활성화)로 대체');
    } catch (e) {
      console.error('안전 모드 적용 실패:', e);
    }
    return false;
  }
}

/**
 * 메모리 관련 설정 구성
 * @param {boolean} highPerformance - 고성능 모드 여부
 */
function configureMemorySettings(highPerformance = false) {
  try {
    // 메모리 최적화 설정
    if (highPerformance) {
      // 고성능 모드: 메모리 제한 완화
      debugLog('고성능 모드: 메모리 제한 완화');
      app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096'); // 4GB 힙 크기
    } else {
      // 일반 모드: 메모리 제한 적용
      debugLog('일반 모드: 메모리 최적화 적용');
      app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048'); // 2GB 힙 크기
    }
    
    return true;
  } catch (error) {
    console.error('메모리 설정 구성 중 오류:', error);
    return false;
  }
}

/**
 * 네이티브 모듈을 통한 GPU 가속화 설정
 * @param {Object} options - 가속화 옵션
 * @returns {boolean} 성공 여부
 */
function configureGpuWithNativeModule(options = {}) {
  try {
    const nativeModule = require('../native-modules');
    if (!nativeModule || typeof nativeModule.initialize_gpu === 'function') {
      debugLog('네이티브 모듈로 GPU 초기화 시도');
      const success = nativeModule.initialize_gpu();
      
      if (success) {
        // 가속화 활성화 여부 설정
        if (options.enableHardwareAcceleration) {
          nativeModule.enable_gpu_acceleration();
          debugLog('네이티브 모듈로 GPU 가속화 활성화됨');
        } else {
          nativeModule.disable_gpu_acceleration();
          debugLog('네이티브 모듈로 GPU 가속화 비활성화됨');
        }
        return true;
      }
      
      debugLog('네이티브 모듈 GPU 초기화 실패');
    }
    
    // 네이티브 모듈 사용 불가 시 일반 설정으로 폴백
    return configureGPU(options);
  } catch (error) {
    console.error('네이티브 모듈 GPU 설정 중 오류:', error);
    return configureGPU(options); // 일반 설정으로 폴백
  }
}

// 모듈 내보내기
module.exports = {
  configureGPU,
  configureMemorySettings,
  configureGpuWithNativeModule
};
