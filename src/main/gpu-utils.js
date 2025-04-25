/**
 * GPU 가속 및 최적화 관련 유틸리티 모듈
 * 
 * - GPU 가속 설정 관리
 * - 배터리 최적화 모드 관리
 * - 하드웨어 가속 설정 처리
 */

const { app } = require('electron');
const log = require('electron-log');
const store = require('./store');

// 기본 설정값
const DEFAULT_GPU_SETTINGS = {
  gpuAcceleration: true,
  hardwareAcceleration: true,
  vsync: true,
  webGLEnabled: true,
  batteryOptimizationMode: 'auto', // 'auto', 'always', 'never'
};

// 현재 GPU 설정 상태
let currentSettings = { ...DEFAULT_GPU_SETTINGS };

/**
 * GPU 설정 초기화
 * @returns {Object} 현재 GPU 설정
 */
function initGpuSettings() {
  try {
    // 저장된 설정 불러오기
    currentSettings = {
      ...DEFAULT_GPU_SETTINGS,
      ...store.get('gpu', {}),
    };

    log.info('GPU 설정 초기화됨:', currentSettings);
    
    // 현재 설정 적용
    applyGpuSettings();
    
    return currentSettings;
  } catch (error) {
    log.error('GPU 설정 초기화 오류:', error);
    return DEFAULT_GPU_SETTINGS;
  }
}

/**
 * GPU 설정 적용
 * @returns {boolean} 성공 여부
 */
function applyGpuSettings() {
  try {
    // GPU 가속 설정
    if (app.isReady()) {
      // 실행 중일 때만 적용 가능한 설정들
      
      // 하드웨어 가속이 이미 적용된 후에는 변경할 수 없으므로
      // 여기서는 다음 재시작 시 적용됨을 로그로 남김
      if (app.getGPUFeatureStatus) {
        const gpuStatus = app.getGPUFeatureStatus();
        log.info('현재 GPU 기능 상태:', gpuStatus);
      }
    }
    
    // 설정 저장
    store.set('gpu', currentSettings);
    
    return true;
  } catch (error) {
    log.error('GPU 설정 적용 오류:', error);
    return false;
  }
}

/**
 * GPU 가속 활성화 여부 확인
 * @returns {boolean} GPU 가속 활성화 여부
 */
function isAccelerationEnabled() {
  return currentSettings.gpuAcceleration;
}

/**
 * GPU 가속 설정
 * @param {boolean} enabled - 활성화 여부
 * @returns {boolean} 성공 여부
 */
function setAcceleration(enabled) {
  try {
    currentSettings.gpuAcceleration = !!enabled;
    
    // 설정 저장 및 적용
    store.set('gpu.gpuAcceleration', enabled);
    
    log.info(`GPU 가속 ${enabled ? '활성화' : '비활성화'} 설정됨 (다음 재시작 시 적용)`);
    
    return true;
  } catch (error) {
    log.error('GPU 가속 설정 오류:', error);
    return false;
  }
}

/**
 * 배터리 최적화 모드 설정
 * @param {boolean} enabled - 배터리 최적화 활성화 여부
 * @returns {boolean} 성공 여부
 */
function optimizeForBattery(enabled) {
  try {
    // 배터리 최적화를 위한 GPU 설정 조정
    if (enabled) {
      // 배터리 모드 - 전력 소비 최소화 설정
      currentSettings.vsync = false;
      
      // 현재 가속이 활성화된 경우에만 특정 설정 비활성화
      if (currentSettings.gpuAcceleration) {
        // 배터리 모드이지만 GPU 가속이 켜져 있는 경우의 최적화 설정
        // 완전히 끄지는 않고 일부 기능만 제한
      }
    } else {
      // AC 전원 모드 - 성능 우선 설정
      currentSettings.vsync = DEFAULT_GPU_SETTINGS.vsync;
      
      // 원래 설정으로 복원
      if (currentSettings.gpuAcceleration) {
        // GPU 가속이 켜져 있는 경우 최대 성능 설정
      }
    }
    
    // 현재 배터리 모드 상태 저장
    currentSettings.onBattery = enabled;
    
    log.info(`배터리 최적화 모드 ${enabled ? '활성화' : '비활성화'}`);
    
    // 설정 적용
    applyCurrentOptimizations();
    
    return true;
  } catch (error) {
    log.error('배터리 최적화 모드 설정 오류:', error);
    return false;
  }
}

/**
 * 현재 최적화 설정 적용
 * @private
 */
function applyCurrentOptimizations() {
  try {
    // 현재 최적화 설정을 시스템에 적용하는 로직
    // (실제로는 Electron 런타임 중에 완전히 적용할 수 없는 설정들이 있어 재시작이 필요할 수 있음)
    
    // WebGL 설정 적용 예시 (렌더러 프로세스에 전달해야 함)
    if (app.isReady()) {
      // 모든 열린 윈도우에 설정 업데이트 알림
      const { BrowserWindow } = require('electron');
      const windows = BrowserWindow.getAllWindows();
      
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('gpu-optimization-changed', {
            vsync: currentSettings.vsync,
            webGL: currentSettings.webGLEnabled,
            onBattery: currentSettings.onBattery
          });
        }
      }
    }
    
    return true;
  } catch (error) {
    log.error('최적화 설정 적용 오류:', error);
    return false;
  }
}

/**
 * 하드웨어 가속 설정 (재시작 필요)
 * @param {boolean} enabled - 활성화 여부
 * @returns {boolean} 성공 여부
 */
function setHardwareAcceleration(enabled) {
  try {
    currentSettings.hardwareAcceleration = !!enabled;
    
    // 설정 저장
    store.set('gpu.hardwareAcceleration', enabled);
    
    log.info(`하드웨어 가속 ${enabled ? '활성화' : '비활성화'} 설정됨 (다음 재시작 시 적용)`);
    
    return true;
  } catch (error) {
    log.error('하드웨어 가속 설정 오류:', error);
    return false;
  }
}

/**
 * GPU 정보 가져오기
 * @returns {Object|null} GPU 정보
 */
function getGpuInfo() {
  try {
    if (!app.isReady()) {
      return null;
    }
    
    // GPU 정보 가져오기
    const gpuInfo = {
      features: app.getGPUFeatureStatus ? app.getGPUFeatureStatus() : null,
      settings: { ...currentSettings },
      acceleration: isAccelerationEnabled(),
      hardwareAcceleration: currentSettings.hardwareAcceleration,
      timestamp: Date.now()
    };
    
    return gpuInfo;
  } catch (error) {
    log.error('GPU 정보 가져오기 오류:', error);
    return null;
  }
}

// 앱 준비 완료 시 GPU 설정 초기화
app.whenReady().then(() => {
  initGpuSettings();
});

module.exports = {
  initGpuSettings,
  isAccelerationEnabled,
  setAcceleration,
  optimizeForBattery,
  setHardwareAcceleration,
  getGpuInfo
};
