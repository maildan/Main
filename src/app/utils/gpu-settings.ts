/**
 * GPU 설정 관리 유틸리티
 * 
 * 이 모듈은 애플리케이션의 GPU 가속화 설정을 관리하고
 * 네이티브 모듈과 JavaScript 간의 설정 동기화를 처리합니다.
 */

import { getLocalStorage, setLocalStorage } from './storage-utils';
import { getGpuInfo, enableGpuAcceleration, disableGpuAcceleration } from './nativeModuleClient';

// GPU 설정 인터페이스
export interface GpuSettings {
  // 기본 설정
  useHardwareAcceleration: boolean;
  processingMode: 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive';
  
  // 성능 설정
  preferHighPerformance: boolean;
  enableVsync: boolean;
  
  // 어드밴스드 설정
  maxGpuMemoryUsage: number;  // MB 단위
  useShaderCache: boolean;
  enableWebGL2: boolean;
}

// 기본 설정 값
const DEFAULT_SETTINGS: GpuSettings = {
  useHardwareAcceleration: true,
  processingMode: 'auto',
  
  preferHighPerformance: false,
  enableVsync: true,
  
  maxGpuMemoryUsage: 256,  // 기본 256MB
  useShaderCache: true,
  enableWebGL2: true
};

// 로컬 스토리지 키
const GPU_SETTINGS_KEY = 'typing-stats-gpu-settings';

/**
 * 현재 GPU 설정 가져오기 (로컬 스토리지 + 기본값 병합)
 * @returns 현재 GPU 설정
 */
export async function getGpuSettings(): Promise<GpuSettings> {
  try {
    // 로컬 스토리지에서 설정 가져오기
    const storedSettings = await getLocalStorage<Partial<GpuSettings>>(GPU_SETTINGS_KEY) || {};
    
    // 네이티브 모듈에서 GPU 정보 가져오기
    let nativeInfo: any = null;
    try {
      const response = await getGpuInfo();
      if (response.success && response.gpuInfo) {
        nativeInfo = response.gpuInfo;
      }
    } catch (error) {
      console.warn('네이티브 GPU 정보를 가져오는 중 오류 발생:', error);
    }
    
    // 네이티브 정보가 있는 경우 설정에 반영
    let useHardwareAcceleration = DEFAULT_SETTINGS.useHardwareAcceleration;
    if (nativeInfo) {
      useHardwareAcceleration = nativeInfo.acceleration_enabled || nativeInfo.settings_enabled || DEFAULT_SETTINGS.useHardwareAcceleration;
    }
    
    // 기본값과 저장된 설정 병합
    return {
      ...DEFAULT_SETTINGS,
      useHardwareAcceleration,
      ...storedSettings,
    };
  } catch (error) {
    console.error('GPU 설정을 가져오는 중 오류 발생:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * GPU 설정 저장 및 적용
 * @param settings 저장할 설정
 * @returns 저장 성공 여부
 */
export async function saveGpuSettings(settings: Partial<GpuSettings>): Promise<boolean> {
  try {
    // 현재 설정 가져오기
    const currentSettings = await getGpuSettings();
    
    // 새 설정으로 업데이트
    const updatedSettings: GpuSettings = {
      ...currentSettings,
      ...settings,
    };
    
    // 로컬 스토리지에 저장
    await setLocalStorage(GPU_SETTINGS_KEY, updatedSettings);
    
    // GPU 가속화 설정 적용
    if ('useHardwareAcceleration' in settings) {
      await applyHardwareAccelerationSetting(updatedSettings.useHardwareAcceleration);
    }
    
    // 전역 GPU 설정 객체 업데이트
    updateGlobalGpuSettings(updatedSettings);
    
    return true;
  } catch (error) {
    console.error('GPU 설정 저장 중 오류 발생:', error);
    return false;
  }
}

/**
 * GPU 하드웨어 가속화 설정 적용
 * @param enabled 활성화 여부
 * @returns 적용 성공 여부
 */
export async function applyHardwareAccelerationSetting(enabled: boolean): Promise<boolean> {
  try {
    const result = enabled 
      ? await enableGpuAcceleration() 
      : await disableGpuAcceleration();
    
    if (result.success) {
      console.log(`GPU 하드웨어 가속화 ${enabled ? '활성화' : '비활성화'} 성공`);
      return true;
    } else {
      console.warn(`GPU 하드웨어 가속화 ${enabled ? '활성화' : '비활성화'} 실패:`, result.error);
      return false;
    }
  } catch (error) {
    console.error(`GPU 하드웨어 가속화 ${enabled ? '활성화' : '비활성화'} 중 오류:`, error);
    return false;
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
    const settings = await getGpuSettings();
    
    // 하드웨어 가속화 설정 적용
    await applyHardwareAccelerationSetting(settings.useHardwareAcceleration);
    
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
    return await saveGpuSettings(DEFAULT_SETTINGS);
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
        preferHighPerformance: false
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
        preferHighPerformance: true,
        maxGpuMemoryUsage: 512  // 512MB
      };
    } else if (isIntegrated) {
      // 통합 GPU - 균형 잡힌 설정
      return {
        useHardwareAcceleration: true,
        processingMode: 'auto',
        preferHighPerformance: false,
        maxGpuMemoryUsage: 256  // 256MB
      };
    } else {
      // 기타 또는 알 수 없음 - 안전한 설정
      return {
        useHardwareAcceleration: true,
        processingMode: 'normal',
        preferHighPerformance: false,
        maxGpuMemoryUsage: 128  // 128MB
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

// 브라우저 환경에서 스토리지 유틸리티 함수
async function getLocalStorage<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`로컬 스토리지에서 ${key} 가져오기 오류:`, error);
    return null;
  }
}

async function setLocalStorage(key: string, value: any): Promise<boolean> {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`로컬 스토리지에 ${key} 저장 오류:`, error);
    return false;
  }
}

// 윈도우 타입 선언 확장
declare global {
  interface Window {
    __gpuAccelerator?: {
      settings?: GpuSettings;
      [key: string]: any;
    };
  }
}
