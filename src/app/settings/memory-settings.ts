/**
 * 메모리 설정 관리 모듈
 */

import { ProcessingMode } from '@/types';
import { MemorySettings } from '@/types/memory-settings';

// 기본 메모리 설정 상수
const DEFAULT_MEMORY_SETTINGS: MemorySettings = {
  preferNativeImplementation: true,
  enableAutomaticFallback: true,
  enableAutomaticOptimization: true,
  optimizationThreshold: 200, // MB
  optimizationInterval: 120000, // 2분
  aggressiveGC: false,
  enableLogging: false,
  enablePerformanceMetrics: true,
  useMemoryPool: true,
  fallbackRetryDelay: 300000, // 5분
  poolCleanupInterval: 180000, // 3분
  processingMode: 'auto' as ProcessingMode,
  componentSpecificSettings: {}
};

// 로컬 스토리지 키 상수
const STORAGE_KEY = 'typing_stats_memory_settings';

/**
 * 메모리 설정 로드 함수
 * 로컬 스토리지에서 메모리 설정을 가져오고, 없으면 기본값 반환
 * 
 * @returns 로드된 메모리 설정
 */
export function loadMemorySettings(): MemorySettings {
  if (typeof window === 'undefined') {
    return DEFAULT_MEMORY_SETTINGS;
  }

  try {
    const savedSettings = localStorage.getItem(STORAGE_KEY);

    if (!savedSettings) {
      return DEFAULT_MEMORY_SETTINGS;
    }

    const parsedSettings = JSON.parse(savedSettings);

    // 기본값과 병합하여 누락된 필드가 있으면 기본값으로 채움
    return {
      ...DEFAULT_MEMORY_SETTINGS,
      ...parsedSettings
    };
  } catch (error) {
    console.error('메모리 설정 로드 오류:', error);
    return DEFAULT_MEMORY_SETTINGS;
  }
}

/**
 * 메모리 설정 저장 함수
 * 
 * @param settings 저장할 메모리 설정
 */
export function saveMemorySettings(settings: MemorySettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('메모리 설정 저장 오류:', error);
  }
}

/**
 * 메모리 설정 초기화 함수
 * 설정을 기본값으로 되돌림
 */
export function resetMemorySettings(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MEMORY_SETTINGS));
  } catch (error) {
    console.error('메모리 설정 초기화 오류:', error);
  }
}

/**
 * 처리 모드 가져오기 (auto, normal, cpu-intensive, gpu-intensive)
 */
export function getProcessingMode(): ProcessingMode {
  const settings = loadMemorySettings();
  return settings.processingMode;
}

/**
 * 적극적 GC 활성화 여부 확인
 */
export function isAggressiveGCEnabled(): boolean {
  const settings = loadMemorySettings();
  return settings.aggressiveGC;
}

/**
 * 자동 최적화 활성화 여부 확인
 */
export function isAutomaticOptimizationEnabled(): boolean {
  const settings = loadMemorySettings();
  return settings.enableAutomaticOptimization;
}

/**
 * 최적화 임계값 가져오기 (메가바이트)
 */
export function getOptimizationThreshold(): number {
  const settings = loadMemorySettings();
  return settings.optimizationThreshold;
}

/**
 * 하드웨어 가속화 활성화 여부 확인
 */
export function isHardwareAccelerationEnabled(): boolean {
  const settings = loadMemorySettings();
  const processingMode = settings.processingMode;

  // CPU 집약적 모드에서는 하드웨어 가속을 사용하지 않음
  if (processingMode === 'cpu-intensive') {
    return false;
  }

  // GPU 집약적 모드 또는 auto 모드에서는 하드웨어 가속 사용
  return true;
}
