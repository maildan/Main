/**
 * GPU 가속 및 최적화 관련 유틸리티 모듈
 * 
 * - GPU 가속 설정 관리
 * - 배터리 최적화 모드 관리
 * - 하드웨어 가속 설정 처리
 */
require('dotenv').config();
const { app } = require('electron');
const log = require('electron-log');
const storeModule = require('./store');
const path = require('path');
const fs = require('fs');
const { appState } = require('./constants');
const { debugLog } = require('./utils');

// 사용자 데이터 경로 가져오기 (PATH.JOIN 빈 인자 문제 수정)
const USERDATA_PATH = (() => {
  try {
    return process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../../userData') // 개발 환경
      : app.getPath('userData'); // 프로덕션 환경
  } catch (error) {
    console.error('사용자 데이터 경로 가져오기 오류:', error);
    // 기본값 제공 - 빈 값이 들어가지 않도록 함
    return path.join(__dirname, '../../userData');
  }
})();

// GPU 설정 파일 경로 (undefined 방지)
const GPU_CONFIG_PATH = path.join(USERDATA_PATH || __dirname, 'gpu-settings.json');

// 기본 GPU 리소스 디렉토리
const DEFAULT_GPU_RESOURCE_DIR = path.join(__dirname, '../../resources/gpu');

// GPU 리소스 디렉토리 (환경변수 undefined 방지)
const GPU_RESOURCE_DIR = process.env.GPU_RESOURCE_DIR 
  ? path.join(__dirname, process.env.GPU_RESOURCE_DIR) 
  : DEFAULT_GPU_RESOURCE_DIR;

// GPU 설정 파일 확인 및 생성
const ensureGpuConfigFile = () => {
  try {
    // 파일이 없으면 기본 설정으로 생성
    if (!fs.existsSync(GPU_CONFIG_PATH)) {
      const defaultSettings = {
        acceleration: true,
        batteryOptimization: true,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(GPU_CONFIG_PATH, JSON.stringify(defaultSettings, null, 2));
      log.info(`GPU 설정 파일이 생성되었습니다: ${GPU_CONFIG_PATH}`);
    }
    
    return true;
  } catch (error) {
    log.error('GPU 설정 파일 생성 오류:', error);
    return false;
  }
};

// 저장소 인스턴스 가져오기
function getStoreInstance() {
  try {
    if (!store) {
      const Store = require('electron-store');
      
      // 환경 변수 기반 설정이 있는지 확인
      const envGpuMode = process.env.GPU_MODE;
      let initialValue = {};
      
      // 환경 변수 기반 설정이 있으면 적용
      if (envGpuMode) {
        console.log(`환경 변수 GPU_MODE: ${envGpuMode}`);
        
        // 'software'와 'hardware' 모드에 따른 기본 설정
        if (envGpuMode === 'software') {
          initialValue = {
            gpuAcceleration: false,
            hardwareAcceleration: false,
            vsync: true,
            webGLEnabled: false,
            batteryOptimizationMode: 'auto'
          };
        } else if (envGpuMode === 'hardware') {
          initialValue = {
            gpuAcceleration: true,
            hardwareAcceleration: true,
            vsync: true,
            webGLEnabled: true,
            batteryOptimizationMode: 'performance'
          };
        }
        
        console.log('환경 변수 기반 GPU 설정:', JSON.stringify(initialValue, null, 2));
      }
      
      // 저장소 초기화
      store = new Store({
        name: 'gpu-settings',
        defaults: initialValue
      });
      
      console.log('GPU 설정 파일에서 로드됨:', store.path);
      
      // 환경 변수 설정이 있는 경우 저장소 설정과 병합하되, 환경 변수 우선
      if (Object.keys(initialValue).length > 0) {
        const storeSettings = store.store || {};
        const mergedSettings = { ...storeSettings, ...initialValue };
        console.log('최종 GPU 설정 (환경변수 우선):', JSON.stringify(mergedSettings, null, 2));
        store.store = mergedSettings;
      }
      
      console.log('electron-store를 commonjs 모듈로 성공적으로 로드했습니다.');
    }
    return store;
  } catch (error) {
    console.error('electron-store 로드 오류:', error);
    return null;
  }
}

// 설정 가져오기 함수
function getSetting(key, defaultValue) {
  const store = getStoreInstance();
  if (!store) return defaultValue;
  
  try {
    return store.get(key, defaultValue);
  } catch (error) {
    console.error(`설정 가져오기 오류 (${key}):`, error);
    return defaultValue;
  }
}

// 설정 저장 함수
function saveSetting(key, value) {
  const store = getStoreInstance();
  if (!store) return false;
  
  try {
    store.set(key, value);
    return true;
  } catch (error) {
    console.error(`설정 저장 오류 (${key}):`, error);
    return false;
  }
}

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
 * @returns {object} GPU 설정 객체
 */
function initializeGPUSettings() {
  try {
    console.log('GPU 설정 초기화 중...');
    
    // ENV 변수에서 GPU_MODE 가져오기
    const envGpuMode = process.env.GPU_MODE || 'software'; // 기본값을 'software'로 변경
    console.log(`환경 변수 GPU_MODE: ${envGpuMode}`);
    
    // 환경변수 기반 설정 결정
    const envBasedSettings = {
      gpuAcceleration: envGpuMode !== 'software',
      hardwareAcceleration: envGpuMode !== 'software',
      vsync: true,
      webGLEnabled: envGpuMode !== 'software',
      batteryOptimizationMode: 'auto'
    };
    
    console.log('환경 변수 기반 GPU 설정:', JSON.stringify(envBasedSettings, null, 2));
    
    // 설정 파일이 존재하는지 확인
    if (fs.existsSync(GPU_CONFIG_PATH)) {
      try {
        const fileContent = fs.readFileSync(GPU_CONFIG_PATH, 'utf8');
        const savedSettings = JSON.parse(fileContent);
        
        // 환경변수 설정이 우선, 나머지는 파일 설정 사용
        const mergedSettings = { 
          ...savedSettings,
          // 환경변수 설정이 우선함
          gpuAcceleration: envBasedSettings.gpuAcceleration,
          hardwareAcceleration: envBasedSettings.hardwareAcceleration,
          webGLEnabled: envBasedSettings.webGLEnabled
        };
        
        console.log('GPU 설정 파일에서 로드됨:', GPU_CONFIG_PATH);
        console.log('최종 GPU 설정 (환경변수 우선):', JSON.stringify(mergedSettings, null, 2));
        
        // 앱 상태에 설정 저장
        appState.gpuSettings = mergedSettings;
        
        return mergedSettings;
      } catch (readError) {
        console.error('GPU 설정 파일 로드 중 오류:', readError);
      }
    }
    
    // 파일이 없거나 오류가 발생한 경우 환경변수 기반 설정 사용
    console.log('GPU 설정 초기화됨 (환경변수 기반):', envBasedSettings);
    
    // 앱 상태에 설정 저장
    appState.gpuSettings = envBasedSettings;
    
    // 환경변수 기반 설정 파일 생성
    try {
      fs.writeFileSync(GPU_CONFIG_PATH, JSON.stringify(envBasedSettings, null, 2));
    } catch (writeError) {
      console.error('GPU 설정 파일 생성 중 오류:', writeError);
    }
    
    return envBasedSettings;
  } catch (error) {
    console.error('GPU 설정 초기화 오류:', error);
    
    // 오류 시 기본값 (환경변수 기반)
    const fallbackSettings = {
      gpuAcceleration: false, // 기본값 false로 변경
      hardwareAcceleration: false, // 기본값 false로 변경
      vsync: true,
      webGLEnabled: false, // 기본값 false로 변경
      batteryOptimizationMode: 'auto'
    };
    
    console.log('오류 발생으로 기본 설정 사용:', fallbackSettings);
    return fallbackSettings;
  }
}

/**
 * GPU 설정 저장
 * @param {object} settings 저장할 설정 객체
 * @returns {boolean} 성공 여부
 */
function saveGPUSettings(settings) {
  try {
    // 기존 설정과 병합
    const currentSettings = appState.gpuSettings || {};
    const newSettings = { ...currentSettings, ...settings };
    
    // 설정 파일 저장
    fs.writeFileSync(GPU_CONFIG_PATH, JSON.stringify(newSettings, null, 2));
    
    // 앱 상태 업데이트
    appState.gpuSettings = newSettings;
    
    return true;
  } catch (error) {
    console.error('GPU 설정 저장 중 오류:', error);
    return false;
  }
}

/**
 * GPU 가속 활성화
 * @returns {boolean} 성공 여부
 */
function enableGPUAcceleration() {
  try {
    // 앱이 이미 실행 중이면 GPU 설정 변경 불가
    if (app.isReady()) {
      console.log('앱이 이미 실행 중이므로 다음 시작 시 GPU 설정이 적용됩니다.');
      saveGPUSettings({ gpuAcceleration: true, hardwareAcceleration: true });
      return false;
    }
    
    // 하드웨어 가속 관련 플래그 설정
    if (app.commandLine.hasSwitch('disable-gpu')) {
      // 이 플래그를 제거할 방법은 없으므로 설정만 변경
      console.log('disable-gpu 플래그가 설정되어 있지만 다음 시작시 제거됩니다.');
      saveGPUSettings({ gpuAcceleration: true, hardwareAcceleration: true });
    } else {
      // 가속 활성화 플래그 추가
      app.commandLine.appendSwitch('enable-gpu-rasterization');
      app.commandLine.appendSwitch('enable-zero-copy');
      app.commandLine.appendSwitch('enable-hardware-acceleration');
      app.commandLine.appendSwitch('ignore-gpu-blacklist');
    }
    
    return true;
  } catch (error) {
    console.error('GPU 가속 활성화 중 오류:', error);
    return false;
  }
}

/**
 * GPU 가속 비활성화
 * @returns {boolean} 성공 여부
 */
function disableGPUAcceleration() {
  try {
    // 앱이 이미 실행 중이면 GPU 설정 변경 불가
    if (app.isReady()) {
      console.log('앱이 이미 실행 중이므로 다음 시작 시 GPU 설정이 적용됩니다.');
      saveGPUSettings({ gpuAcceleration: false, hardwareAcceleration: false });
      return false;
    }
    
    // 하드웨어 가속 비활성화
    app.disableHardwareAcceleration();
    
    // GPU 관련 플래그 설정
    if (!app.commandLine.hasSwitch('disable-gpu')) {
      app.commandLine.appendSwitch('disable-gpu');
    }
    
    return true;
  } catch (error) {
    console.error('GPU 가속 비활성화 중 오류:', error);
    return false;
  }
}

/**
 * 현재 GPU 기능 상태 확인
 * @returns {object} GPU 기능 상태 객체
 */
async function getGPUFeatureStatus() {
  try {
    if (!app.isReady()) {
      return { error: 'GPU 기능 상태는 앱이 준비된 후에만 확인할 수 있습니다.' };
    }
    
    // GPU 프로세스가 생성되어 있는지 확인
    const gpuInfo = app.getGPUFeatureStatus();
    
    // 실제로 하드웨어 가속이 사용 중인지 확인
    const isAccelerated = !gpuInfo['gpu_compositing'].includes('disabled') || 
                        !gpuInfo['2d_canvas'].includes('disabled');
    
    // 설정과 실제 상태가 일치하는지 확인
    const settings = appState.gpuSettings || { hardwareAcceleration: true };
    
    if (settings.hardwareAcceleration !== isAccelerated) {
      console.log(`GPU 설정과 실제 상태가 일치하지 않습니다. 설정: ${settings.hardwareAcceleration}, 실제: ${isAccelerated}`);
    }
    
    return {
      ...gpuInfo,
      isHardwareAccelerated: isAccelerated,
      settingsMatch: settings.hardwareAcceleration === isAccelerated
    };
  } catch (error) {
    console.error('GPU 기능 상태 확인 중 오류:', error);
    return { error: error.message };
  }
}

/**
 * 앱 시작시 GPU 설정 적용
 */
function applyGPUSettings() {
  try {
    // 환경 변수에서 GPU_MODE 가져오기
    const envGpuMode = process.env.GPU_MODE || 'auto';
    console.log(`GPU 설정 적용 중... (모드: ${envGpuMode})`);
    
    // GPU 설정 로드
    const settings = appState.gpuSettings || initializeGPUSettings();
    
    // 앱이 이미 시작된 경우 다음 시작 시 적용되도록 설정만 저장
    if (app.isReady()) {
      console.log('앱이 이미 실행 중이므로 다음 시작 시 GPU 설정이 적용됩니다.');
      return false;
    }
    
    // 환경변수 기반 하드웨어 가속 설정 적용
    if (envGpuMode === 'software') {
      // 소프트웨어 렌더링 모드
      app.disableHardwareAcceleration();
      app.commandLine.appendSwitch('disable-gpu');
      console.log('소프트웨어 렌더링 모드 적용됨 (하드웨어 가속 비활성화)');
    } else if (envGpuMode === 'hardware') {
      // 하드웨어 가속 강제 활성화
      if (!app.commandLine.hasSwitch('enable-hardware-acceleration')) {
        app.commandLine.appendSwitch('enable-hardware-acceleration');
      }
      if (!app.commandLine.hasSwitch('ignore-gpu-blacklist')) {
        app.commandLine.appendSwitch('ignore-gpu-blacklist');
      }
      if (!app.commandLine.hasSwitch('enable-gpu-rasterization')) {
        app.commandLine.appendSwitch('enable-gpu-rasterization');
      }
      if (!app.commandLine.hasSwitch('enable-zero-copy')) {
        app.commandLine.appendSwitch('enable-zero-copy');
      }
      console.log('하드웨어 가속 모드 강제 활성화됨');
    } else {
      // 자동 모드: 환경에 따라 설정
      if (settings.hardwareAcceleration) {
        console.log('자동 모드: 하드웨어 가속 사용');
        // 하드웨어 가속 활성화
        if (!app.commandLine.hasSwitch('enable-hardware-acceleration')) {
          app.commandLine.appendSwitch('enable-hardware-acceleration');
        }
      } else {
        console.log('자동 모드: 하드웨어 가속 비활성화');
        // 하드웨어 가속 비활성화
        app.disableHardwareAcceleration();
        if (!app.commandLine.hasSwitch('disable-gpu')) {
          app.commandLine.appendSwitch('disable-gpu');
        }
      }
    }
    
    // 공통 설정: GPU 프로세스 충돌 방지
    if (!app.commandLine.hasSwitch('disable-gpu-process-crash-limit')) {
      app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
    }
    
    // 로그 출력
    if (app.isReady() && typeof app.getGPUFeatureStatus === 'function') {
      const gpuStatus = app.getGPUFeatureStatus();
      debugLog('현재 GPU 기능 상태:', JSON.stringify(gpuStatus, null, 2));
    }
    
    console.log(`최종 GPU 모드: ${envGpuMode}, 하드웨어 가속: ${!app.commandLine.hasSwitch('disable-gpu')}`);
    return true;
  } catch (error) {
    console.error('GPU 설정 적용 오류:', error);
    return false;
  }
}

// GPU 설정 초기화
initializeGPUSettings();

module.exports = {
  initializeGPUSettings,
  saveGPUSettings,
  enableGPUAcceleration,
  disableGPUAcceleration,
  getGPUFeatureStatus,
  applyGPUSettings
};
