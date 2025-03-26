/**
 * GPU 설정 관리 유틸리티
 * 
 * 이 모듈은 애플리케이션의 GPU 가속화 설정을 관리하고
 * 네이티브 모듈과 JavaScript 간의 설정 동기화를 처리합니다.
 */

import { getLocalStorage as getStorageItem, setLocalStorage as setStorageItem } from './storage-utils';
import { setGpuAcceleration, getGpuInfo } from './nativeModuleClient';

// GPU 설정 인터페이스
export interface GpuSettings {
  useHardwareAcceleration: boolean;
  processingMode: 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive';
  gpuVendor: 'auto' | 'nvidia' | 'amd' | 'intel' | 'apple' | 'software';
  highPerformance: boolean;
  preferredBackend?: 'vulkan' | 'directx' | 'metal' | 'opengl' | 'auto';
  enableAdvancedFeatures: boolean;
  memoryLimit?: number;
}

// 기본 GPU 설정
const defaultGpuSettings: GpuSettings = {
  useHardwareAcceleration: true,
  processingMode: 'auto',
  gpuVendor: 'auto',
  highPerformance: false,
  preferredBackend: 'auto',
  enableAdvancedFeatures: false,
  memoryLimit: undefined,
};

// 스토리지 키
const STORAGE_KEY = 'gpu-settings';

/**
 * GPU 설정 불러오기
 * @returns Promise<GpuSettings> 현재 설정
 */
export async function loadGpuSettings(): Promise<GpuSettings> {
  try {
    const settings = await getStorageItem<GpuSettings>(STORAGE_KEY);
    if (!settings) {
      return defaultGpuSettings;
    }
    
    return {
      ...defaultGpuSettings,
      ...settings
    };
  } catch (error) {
    console.error('GPU 설정 로드 오류:', error);
    return defaultGpuSettings;
  }
}

/**
 * GPU 설정 저장
 * @param settings 저장할 설정
 */
export async function saveGpuSettings(settings: GpuSettings): Promise<boolean> {
  try {
    await setStorageItem(STORAGE_KEY, settings);
    return true;
  } catch (error) {
    console.error('GPU 설정 저장 오류:', error);
    return false;
  }
}

/**
 * GPU 가속화 설정
 * @param enabled 가속화 활성화 여부
 * @returns 설정 적용 성공 여부
 */
export async function setGpuAccelerationState(enabled: boolean): Promise<boolean> {
  try {
    const success = await setGpuAcceleration(enabled);
    
    if (success) {
      // 설정 업데이트
      const settings = await loadGpuSettings();
      settings.useHardwareAcceleration = enabled;
      await saveGpuSettings(settings);
    }
    
    return success;
  } catch (error) {
    console.error('GPU 가속화 설정 오류:', error);
    return false;
  }
}

// 전역 설정 저장소 타입에 맞게 선언
// 타입 선언은 types-declarations.d.ts에 정의된 것과 일치시킴
declare global {
  interface Window {
    __gpuAccelerator?: any;
  }
}

/**
 * 현재 GPU 정보 가져오기
 * @returns GPU 정보 객체
 */
export async function getGpuInformation(): Promise<any | null> {
  try {
    const response = await getGpuInfo();
    
    if (response.success && response.gpuInfo) {
      return response.gpuInfo;
    }
    
    return null;
  } catch (error) {
    console.error('GPU 정보 가져오기 오류:', error);
    return null;
  }
}

/**
 * GPU 설정 초기화
 */
export async function initializeGpuSettings(): Promise<void> {
  try {
    const settings = await loadGpuSettings();
    
    // 하드웨어 가속화 설정 적용
    await setGpuAccelerationState(settings.useHardwareAcceleration);
    
    // 전역 설정 객체 업데이트
    updateGlobalGpuSettings(settings);
    
    console.log('GPU 설정 초기화 완료:', settings);
  } catch (error) {
    console.error('GPU 설정 초기화 중 오류 발생:', error);
  }
}

/**
 * 전역 GPU 설정 객체 업데이트
 */
function updateGlobalGpuSettings(settings: GpuSettings): void {
  // 윈도우 객체가 정의된 경우에만 실행
  if (typeof window !== 'undefined') {
    if (!window.__gpuAccelerator) {
      window.__gpuAccelerator = {};
    }
    
    window.__gpuAccelerator.settings = settings;
  }
}

/**
 * 기본 설정으로 재설정
 * @returns 재설정 성공 여부
 */
export async function resetGpuSettings(): Promise<boolean> {
  try {
    return await saveGpuSettings(defaultGpuSettings);
  } catch (error) {
    console.error('GPU 설정 재설정 중 오류 발생:', error);
    return false;
  }
}

/**
 * 시스템에 적합한 GPU 설정 추천
 * @returns 추천 설정
 */
export async function getRecommendedGpuSettings(): Promise<Partial<GpuSettings>> {
  try {
    // GPU 정보 가져오기
    const gpuInfo = await getGpuInformation();
    
    if (!gpuInfo) {
      // GPU 정보를 가져올 수 없는 경우 기본 설정 반환
      return {
        useHardwareAcceleration: false,
        processingMode: 'cpu-intensive',
        highPerformance: false
      };
    }
    
    // GPU 유형에 따른 설정 추천
    const deviceType = gpuInfo.device_type || '';
    const isIntegrated = deviceType.includes('Integrated');
    const isDiscrete = deviceType.includes('Discrete');
    
    if (isDiscrete) {
      // 디스크리트 GPU - 고성능 설정
      return {
        useHardwareAcceleration: true,
        processingMode: 'gpu-intensive',
        highPerformance: true,
        memoryLimit: 512  // 512MB
      };
    } else if (isIntegrated) {
      // 통합 GPU - 균형 잡힌 설정
      return {
        useHardwareAcceleration: true,
        processingMode: 'auto',
        highPerformance: false,
        memoryLimit: 256  // 256MB
      };
    } else {
      // 기타 또는 알 수 없음 - 안전한 설정
      return {
        useHardwareAcceleration: true,
        processingMode: 'normal',
        highPerformance: false,
        memoryLimit: 128  // 128MB
      };
    }
  } catch (error) {
    console.error('GPU 설정 추천 중 오류 발생:', error);
    return {
      useHardwareAcceleration: false,
      processingMode: 'cpu-intensive'
    };
  }
}
