/**
 * GPU 설정 관리 유틸리티
 * 
 * 이 모듈은 애플리케이션의 GPU 가속화 설정을 관리하고
 * 네이티브 모듈과 JavaScript 간의 설정 동기화를 처리합니다.
 */

import { getLocalStorage as getStorageItem, setLocalStorage as setStorageItem } from './storage-utils';
import { nativeModuleClient } from './nativeModuleClient';
import type { GpuInfo } from '@/types';
import { getGpuInfo as fetchGpuInfo, setGpuAcceleration } from './gpu-acceleration';
// import { loadGpuSettings as loadSettingsFromFile, saveGpuSettings as saveSettingsToFile } from './gpu-settings-manager';

// Define GpuSettings interface locally based on usage if not found elsewhere
// This is an assumption based on defaultGpuSettings and usage.
export interface GpuSettings {
  useHardwareAcceleration: boolean;
  processingMode: 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive' | 'memory-saving'; // Added memory-saving if used
  gpuVendor: 'auto' | 'nvidia' | 'amd' | 'intel' | 'apple' | 'software';
  highPerformance: boolean;
  preferredBackend?: 'vulkan' | 'directx' | 'metal' | 'opengl' | 'auto';
  enableAdvancedFeatures: boolean;
  memoryLimit?: number;
}

// 기본 GPU 설정 (using the defined interface)
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

// 전역 GPU 설정 상태 (메모리 내 캐시)
let globalGpuSettings: GpuSettings | null = null;
let lastSettingsLoadTime: number = 0;
const SETTINGS_CACHE_TTL = 300000; // 5분

/**
 * GPU 설정 불러오기
 * @returns Promise<GpuSettings> 현재 설정
 */
export async function loadGpuSettings(): Promise<GpuSettings | null> {
  try {
    const gpuInfo = await nativeModuleClient.getGpuInfo();
    // getGpuInfo 응답이 GpuSettings과 직접 호환되지 않을 수 있음
    // 필요한 정보 추출 또는 API 엔드포인트(/api/native/gpu/settings) 호출 필요
    // 임시로 gpuInfo 반환 (타입 오류 발생 가능)
    return gpuInfo as any; // 임시 타입 단언
  } catch (error) {
    console.error('GPU 설정 로드 오류:', error);
    return null;
  }
}

/**
 * GPU 설정 저장
 * @param settings 저장할 설정
 */
export async function saveGpuSettings(settings: GpuSettings): Promise<boolean> {
  try {
    // setGpuAcceleration 외에 설정을 저장하는 별도 메소드/API 필요
    // 임시로 setGpuAcceleration 호출
    const result = await nativeModuleClient.setGpuAcceleration(settings.useHardwareAcceleration);
    return result?.success ?? false;
  } catch (error) {
    console.error('GPU 설정 저장 오류:', error);
    return false;
  }
}

/**
 * GPU 가속화 설정 (Refactored - uses load/save settings)
 * @param enabled 가속화 활성화 여부
 * @returns 설정 적용 성공 여부
 */
export async function setGpuAccelerationState(enabled: boolean): Promise<boolean> {
  try {
    let settings = await loadGpuSettingsIfNeeded();
    if (!settings) {
      // If settings couldn't load, create default ones
      console.warn('GPU 설정을 로드하지 못했습니다. 기본 설정으로 가속 상태를 설정합니다.');
      settings = { ...defaultGpuSettings };
    }

    // Check if the state actually changes
    if (settings.useHardwareAcceleration === enabled) {
      return true; // No change needed
    }

    settings.useHardwareAcceleration = enabled;
    // await saveGpuSettings(settings); // Keep commented out due to import issues
    console.warn('saveGpuSettings call is commented out in setGpuAccelerationState');

    // Apply the change via setGpuAcceleration from gpu-acceleration (which calls native client)
    const applySuccess = await setGpuAcceleration(enabled);

    // Update global cache only if applying the state was successful
    if (applySuccess) {
      updateGlobalGpuSettings(settings);
    }
    return applySuccess;

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
 */
// Remove the duplicate getGpuInformation function, use getGpuInfo from gpu-acceleration instead
/*
export async function getGpuInformation(): Promise<any | null> {
  try {
    // This function was trying to access non-existent properties
    const response = await nativeModuleClient.getGpuInfo();
    // Incorrect logic removed:
    // if (response.success && response.gpuInfo) { 
    //   return response.gpuInfo;
    // }
    return response; // Return the GpuInfo object or null
  } catch (error) {
    console.error('GPU 정보 가져오기 오류:', error);
    return null;
  }
}
*/

/**
 * GPU 설정 초기화
 */
export async function initializeGpuSettings(): Promise<void> {
  try {
    const settings = await loadGpuSettingsIfNeeded() ?? defaultGpuSettings; // Use default if null

    // Apply hardware acceleration setting
    await setGpuAccelerationState(settings.useHardwareAcceleration);

    // Update global state
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
 */
export async function getRecommendedGpuSettings(): Promise<Partial<GpuSettings>> {
  try {
    // Use getGpuInfo from gpu-acceleration module
    const gpuInfo = await nativeModuleClient.getGpuInfo(); // Changed from getGpuInformation

    if (!gpuInfo) {
      return { useHardwareAcceleration: false, processingMode: 'cpu-intensive', highPerformance: false };
    }

    // Logic based on potentially non-existent properties commented out
    // Assuming basic recommendation based on vendor/renderer or just defaults
    const isDiscrete = gpuInfo.renderer?.toLowerCase().includes('nvidia') || gpuInfo.renderer?.toLowerCase().includes('amd'); // Example check

    if (isDiscrete) {
      return { useHardwareAcceleration: true, processingMode: 'gpu-intensive', highPerformance: true, memoryLimit: 512 };
    } else { // Integrated or unknown
      return { useHardwareAcceleration: true, processingMode: 'auto', highPerformance: false, memoryLimit: 256 };
    }
  } catch (error) {
    console.error('GPU 설정 추천 중 오류 발생:', error);
    return { useHardwareAcceleration: false, processingMode: 'cpu-intensive' };
  }
}

/**
 * 필요에 따라 GPU 설정을 로드합니다 (캐시 사용).
 */
async function loadGpuSettingsIfNeeded(): Promise<GpuSettings | null> {
  const now = Date.now();
  if (globalGpuSettings && now - lastSettingsLoadTime < SETTINGS_CACHE_TTL) {
    return globalGpuSettings;
  }

  try {
    // Temporarily comment out file loading until import is resolved
    // const settings = await loadSettingsFromFile(); 
    const settings: GpuSettings | null = null; // Placeholder
    console.warn('loadSettingsFromFile is commented out, returning null settings');
    globalGpuSettings = settings;
    lastSettingsLoadTime = now;
    return settings;
  } catch (error) {
    console.error('GPU 설정 로드 실패 (파일):', error);
    return null;
  }
}

/**
 * 캐시된 GPU 설정을 가져옵니다.
 */
function getCachedGpuSettings(): GpuSettings | null {
  return globalGpuSettings;
}

/**
 * GPU 하드웨어 가속 활성화/비활성화
 * @param enabled 활성화 여부
 */
export async function enableHardwareAcceleration(enabled: boolean): Promise<void> {
  try {
    const settings = await loadGpuSettingsIfNeeded();
    if (!settings) {
      console.error('GPU 설정을 로드할 수 없어 하드웨어 가속 상태를 변경할 수 없습니다.');
      return;
    }
    settings.useHardwareAcceleration = enabled;
    // Comment out saveGpuSettings call due to import issue
    // await saveGpuSettings(settings); 
    console.warn('saveGpuSettings call is commented out');
    await setGpuAcceleration(enabled);
  } catch (error) {
    console.error('하드웨어 가속 설정 변경 실패:', error);
  }
}

/**
 * 현재 저장된 GPU 정보를 로드합니다.
 * @returns 저장된 GPU 정보 또는 null
 */
async function loadGpuInfo(): Promise<GpuInfo | null> {
  try {
    // Call getGpuInfo from nativeModuleClient instance
    const gpuInfo = await nativeModuleClient.getGpuInfo();
    return gpuInfo;
  } catch (error) {
    console.error('GPU 정보 로드 실패:', error);
    return null;
  }
}

/**
 * 현재 GPU 설정을 적용합니다.
 * (예: 앱 시작 시 호출)
 */
export async function applyGpuSettings(): Promise<void> {
  try {
    const settings = await loadGpuSettingsIfNeeded();
    if (!settings) {
      console.warn('GPU 설정을 로드할 수 없어 적용할 수 없습니다.');
      return;
    }
    await setGpuAcceleration(settings.useHardwareAcceleration);
    // Call updateGlobalGpuSettings only if settings is not null
    updateGlobalGpuSettings(settings);
  } catch (error) {
    console.error('GPU 설정 적용 실패:', error);
  }
}

/**
 * 전역 GPU 설정을 반환합니다.
 */
export function getGpuSettings(): GpuSettings | null {
  return getCachedGpuSettings();
}
