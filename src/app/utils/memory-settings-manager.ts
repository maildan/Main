/**
 * 메모리 설정 관리 유틸리티
 * 
 * 이 모듈은 애플리케이션의 메모리 최적화 설정을 관리하고 
 * native 모듈과 JavaScript 간의 설정 동기화를 처리합니다.
 */

import { updateNativeMemorySettings, getNativeMemorySettings } from './native-memory-bridge';
import { getLocalStorage as getStorageItem, setLocalStorage as setStorageItem } from './storage-utils';

// 메모리 설정 인터페이스
export interface MemorySettings {
  // 기본 설정
  enableAutomaticOptimization: boolean;
  optimizationThreshold: number;  // MB 단위
  optimizationInterval: number;   // 밀리초 단위

  // 고급 설정
  aggressiveGC: boolean;
  enableLogging: boolean;
  enablePerformanceMetrics: boolean;

  // GPU 관련 설정
  useHardwareAcceleration: boolean;
  processingMode: 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive';

  // 메모리 풀 설정
  useMemoryPool: boolean;
  poolCleanupInterval: number;    // 밀리초 단위
}

// 기본 설정 값
const DEFAULT_SETTINGS: MemorySettings = {
  enableAutomaticOptimization: true,
  optimizationThreshold: 100,    // 100MB
  optimizationInterval: 60000,   // 1분

  aggressiveGC: false,
  enableLogging: true,
  enablePerformanceMetrics: true,

  useHardwareAcceleration: false,
  processingMode: 'auto',

  useMemoryPool: true,
  poolCleanupInterval: 300000,   // 5분
};

// 로컬 스토리지 키
const MEMORY_SETTINGS_KEY = 'typing-stats-memory-settings';

/**
 * 현재 메모리 설정 가져오기 (로컬 스토리지 + 기본값 병합)
 * @returns 현재 메모리 설정
 */
export async function getMemorySettings(): Promise<MemorySettings> {
  try {
    // 로컬 스토리지에서 설정 가져오기
    const storedSettings = (await getStorageItem(MEMORY_SETTINGS_KEY) as Partial<MemorySettings>) || {};

    // 네이티브 모듈에서 설정 가져오기 시도
    let nativeSettings: Partial<MemorySettings> = {};
    try {
      const settings = await getNativeMemorySettings();
      if (settings) {
        // 네이티브 설정 키 이름 변환
        nativeSettings = {
          enableAutomaticOptimization: settings.enable_automatic_optimization,
          optimizationThreshold: settings.optimization_threshold,
          optimizationInterval: settings.optimization_interval,
          aggressiveGC: settings.aggressive_gc,
          enableLogging: settings.enable_logging,
          enablePerformanceMetrics: settings.enable_performance_metrics,
          useHardwareAcceleration: settings.use_hardware_acceleration,
          processingMode: settings.processing_mode as any,
          useMemoryPool: settings.use_memory_pool,
          poolCleanupInterval: settings.pool_cleanup_interval,
        };
      }
    } catch (error) {
      console.warn('네이티브 설정을 가져오는 중 오류 발생:', error);
    }

    // 기본값, 네이티브 설정, 로컬 스토리지 설정 병합 (우선순위 순)
    return {
      ...DEFAULT_SETTINGS,
      ...nativeSettings,
      ...storedSettings,
    };
  } catch (error) {
    console.error('메모리 설정을 가져오는 중 오류 발생:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 메모리 설정 저장 및 적용
 * @param settings 저장할 설정
 * @returns 저장 성공 여부
 */
export async function saveMemorySettings(settings: Partial<MemorySettings>): Promise<boolean> {
  try {
    // 현재 설정 가져오기
    const currentSettings = await getMemorySettings();

    // 새 설정으로 업데이트
    const updatedSettings: MemorySettings = {
      ...currentSettings,
      ...settings,
    };

    // 로컬 스토리지에 저장
    await setStorageItem(MEMORY_SETTINGS_KEY, JSON.stringify(updatedSettings));

    // 네이티브 모듈에 설정 적용 시도
    try {
      // 네이티브 설정 형식으로 변환
      const nativeSettings = {
        enable_automatic_optimization: updatedSettings.enableAutomaticOptimization,
        optimization_threshold: updatedSettings.optimizationThreshold,
        optimization_interval: updatedSettings.optimizationInterval,
        aggressive_gc: updatedSettings.aggressiveGC,
        enable_logging: updatedSettings.enableLogging,
        enable_performance_metrics: updatedSettings.enablePerformanceMetrics,
        use_hardware_acceleration: updatedSettings.useHardwareAcceleration,
        processing_mode: updatedSettings.processingMode,
        use_memory_pool: updatedSettings.useMemoryPool,
        pool_cleanup_interval: updatedSettings.poolCleanupInterval,
      };

      // 네이티브 모듈에 설정 업데이트 - 변환된 객체 전달
      await updateNativeMemorySettings(nativeSettings);
    } catch (error) {
      console.warn('네이티브 설정 적용 중 오류 발생 (로컬 설정은 저장됨):', error);
    }

    // 전역 메모리 최적화 유틸리티 업데이트 (존재하는 경우)
    if (typeof window !== 'undefined' && window.__memoryOptimizer) {
      if (!window.__memoryOptimizer.settings) {
        window.__memoryOptimizer.settings = updatedSettings;
      } else {
        Object.assign(window.__memoryOptimizer.settings, updatedSettings);
      }
    }

    return true;
  } catch (error) {
    console.error('메모리 설정 저장 중 오류 발생:', error);
    return false;
  }
}

/**
 * 설정에 따라 메모리 최적화 기능 초기화
 */
export async function initializeMemorySettings(): Promise<void> {
  try {
    // 설정 가져오기
    const settings = await getMemorySettings();

    // 주기적 메모리 최적화 설정 (활성화된 경우)
    if (settings.enableAutomaticOptimization) {
      setupPeriodicMemoryOptimization(settings);
    }

    // 하드웨어 가속화 설정 적용
    applyHardwareAccelerationSettings(settings);

    console.log('메모리 설정 초기화 완료:', settings);
  } catch (error) {
    console.error('메모리 설정 초기화 중 오류 발생:', error);
  }
}

/**
 * 주기적 메모리 최적화 설정
 */
function setupPeriodicMemoryOptimization(settings: MemorySettings): (() => void) {
  console.log(`주기적 메모리 최적화 설정 (간격: ${settings.optimizationInterval}ms, 임계치: ${settings.optimizationThreshold}MB)`);

  // 인터벌 설정
  const intervalId = window.setInterval(() => {
    console.log('주기적 메모리 최적화 실행');
    // 실제 최적화 로직은 여기에 구현
  }, settings.optimizationInterval);

  // 정리 함수 반환
  return () => {
    window.clearInterval(intervalId);
    console.log('주기적 메모리 최적화 중지');
  };
}

/**
 * 하드웨어 가속화 설정 적용
 */
function applyHardwareAccelerationSettings(settings: MemorySettings): void {
  try {
    console.log(`하드웨어 가속화 ${settings.useHardwareAcceleration ? '활성화' : '비활성화'}`);

    // 실제 구현은 나중에 추가
  } catch (error) {
    console.error('하드웨어 가속화 설정 적용 중 오류 발생:', error);
  }
}

/**
 * 설정을 기본값으로 재설정
 * @returns 재설정 성공 여부
 */
export async function resetMemorySettings(): Promise<boolean> {
  try {
    return await saveMemorySettings(DEFAULT_SETTINGS);
  } catch (error) {
    console.error('메모리 설정 재설정 중 오류 발생:', error);
    return false;
  }
}

// 윈도우 타입 인터페이스 수정
declare global {
  interface Window {
    __memoryOptimizer?: {
      [key: string]: any;
      suggestGarbageCollection?: () => void;
      requestGC?: (emergency?: boolean) => Promise<any>;
      clearBrowserCaches?: () => Promise<boolean>;
      clearStorageCaches?: () => boolean;
      checkMemoryUsage?: () => any;
      forceGC?: () => boolean;
      optimizeMemory?: (aggressive?: boolean) => void;
      cleanAllCaches?: () => boolean;
      cleanupPeriodicOptimization?: () => void;
      settings?: Record<string, any>;
    };
  }
}
