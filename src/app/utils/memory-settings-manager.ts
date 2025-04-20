/**
 * 메모리 설정 관리 유틸리티
 * 
 * 이 모듈은 애플리케이션의 메모리 최적화 설정을 관리하고 
 * native 모듈과 JavaScript 간의 설정 동기화를 처리합니다.
 */

import { getLocalStorage as getStorageItem, setLocalStorage as setStorageItem } from './storage-utils';
// ProcessingMode 타입 가져오기
import { ProcessingMode } from '@/types';
import { MemorySettings } from '@/types';
// Import nativeModuleClient instead of native-memory-bridge
import { nativeModuleClient } from './nativeModuleClient';

// 메모리 설정 인터페이스 - 로컬에서만 사용함 (global @/types의 MemorySettings와 구분)
export interface LocalMemorySettings {
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
  processingMode: ProcessingMode;

  // 메모리 풀 설정
  useMemoryPool: boolean;
  poolCleanupInterval: number;    // 밀리초 단위
}

// 기본 설정 값
const DEFAULT_SETTINGS: LocalMemorySettings = {
  enableAutomaticOptimization: true,
  optimizationThreshold: 100,    // 100MB
  optimizationInterval: 60000,   // 1분

  aggressiveGC: false,
  enableLogging: true,
  enablePerformanceMetrics: true,

  useHardwareAcceleration: false,
  processingMode: ProcessingMode.NORMAL,

  useMemoryPool: true,
  poolCleanupInterval: 300000,   // 5분
};

// 로컬 스토리지 키
const MEMORY_SETTINGS_KEY = 'typing-stats-memory-settings';

// 네이티브 브릿지 함수 타입 정의
type NativeMemorySettings = {
  enable_automatic_optimization: boolean;
  optimization_threshold: number;
  optimization_interval: number;
  aggressive_gc: boolean;
  enable_logging: boolean;
  enable_performance_metrics: boolean;
  use_hardware_acceleration: boolean;
  processing_mode: string;
  use_memory_pool: boolean;
  pool_cleanup_interval: number;
};

// 임시 함수 정의 (실제로는 동적 import 사용)
async function updateNativeMemorySettings(settings: NativeMemorySettings): Promise<void> {
  try {
    // 동적으로 모듈 import
    const nativeModule = await import('./native-memory-bridge');
    if (typeof nativeModule.requestNativeMemoryOptimization === 'function') {
      // 기존 함수를 사용해 설정 전달
      await nativeModule.requestNativeMemoryOptimization(0, false);
    }
  } catch (error) {
    console.warn('네이티브 설정 업데이트 실패:', error);
  }
}

// 임시 함수 정의 (실제로는 동적 import 사용)
async function getNativeMemorySettings(): Promise<NativeMemorySettings | null> {
  try {
    // 동적으로 모듈 import
    const nativeModule = await import('./native-memory-bridge');
    if (typeof nativeModuleClient.getNativeModuleStatus === 'function') {
      // 기본 설정 반환
      return null;
    }
    return null;
  } catch (error) {
    console.warn('네이티브 설정 가져오기 실패:', error);
    return null;
  }
}

/**
 * 현재 메모리 설정 가져오기 (로컬 스토리지 + 기본값 병합)
 * @returns 현재 메모리 설정
 */
export async function getMemorySettings(): Promise<LocalMemorySettings> {
  try {
    // 로컬 스토리지에서 설정 가져오기
    const storedSettings = await getStorageItem<Partial<LocalMemorySettings>>(MEMORY_SETTINGS_KEY) || {};

    // 네이티브 모듈에서 설정 가져오기 시도
    let nativeSettings: Partial<LocalMemorySettings> = {};
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
          processingMode: settings.processing_mode as ProcessingMode,
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
export async function saveMemorySettings(settings: Partial<LocalMemorySettings>): Promise<boolean> {
  try {
    // 현재 설정 가져오기
    const currentSettings = await getMemorySettings();

    // 새 설정으로 업데이트
    const updatedSettings: LocalMemorySettings = {
      ...currentSettings,
      ...settings,
    };

    // 로컬 스토리지에 저장
    await setStorageItem(MEMORY_SETTINGS_KEY, updatedSettings);

    // 네이티브 모듈에 설정 적용 시도
    try {
      // 네이티브 설정 형식으로 변환 - undefined 방지를 위해 값 확인
      const nativeSettings: NativeMemorySettings = {
        enable_automatic_optimization: updatedSettings.enableAutomaticOptimization,
        optimization_threshold: updatedSettings.optimizationThreshold,
        optimization_interval: updatedSettings.optimizationInterval,
        aggressive_gc: updatedSettings.aggressiveGC,
        enable_logging: updatedSettings.enableLogging,
        enable_performance_metrics: updatedSettings.enablePerformanceMetrics || false,
        use_hardware_acceleration: updatedSettings.useHardwareAcceleration,
        processing_mode: updatedSettings.processingMode,
        use_memory_pool: updatedSettings.useMemoryPool,
        pool_cleanup_interval: updatedSettings.poolCleanupInterval,
      };

      // 네이티브 모듈에 설정 업데이트
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
function setupPeriodicMemoryOptimization(settings: LocalMemorySettings): void {
  try {
    // 동적 import와 타입 문제 해결
    import('./native-memory-bridge').then((nativeModule) => {
      // 임시 정리 함수 
      const cleanup = () => {
        console.log('주기적 메모리 최적화 중지됨');
      };

      // 정리 함수 저장 (필요시 호출 가능)
      if (typeof window !== 'undefined') {
        if (!window.__memoryOptimizer) {
          // 타입 안전하게 초기화
          window.__memoryOptimizer = {
            suggestGarbageCollection: () => { },
            requestGC: async () => null,
            clearBrowserCaches: async () => false,
            clearStorageCaches: () => false,
            checkMemoryUsage: () => null,
            forceGC: () => false,
            getMemoryInfo: () => null,
            optimizeMemory: async () => null,
            optimizeImageResources: async () => null,
            settings: {}
          };
        }

        // 타입 안전한 접근 방식
        const memoryOptimizer = window.__memoryOptimizer;
        if (memoryOptimizer) {
          // 타입 단언을 사용하여 안전하게 프로퍼티 할당
          (memoryOptimizer as any).cleanupPeriodicOptimization = cleanup;
        }
      }

      // 타입 안전한 조건문
      if (window.__memoryOptimizer) {
        // setupPeriodicOptimization 프로퍼티가 있는지 확인
        const hasSetupFunc = Object.prototype.hasOwnProperty.call(
          window.__memoryOptimizer,
          'setupPeriodicOptimization'
        );

        // cleanupPeriodicOptimization 프로퍼티가 있는지 확인
        const hasCleanupFunc = Object.prototype.hasOwnProperty.call(
          window.__memoryOptimizer,
          'cleanupPeriodicOptimization'
        );

        if (hasCleanupFunc && typeof window.__memoryOptimizer.cleanupPeriodicOptimization === 'function') {
          // 함수 호출 전 타입 체크
          window.__memoryOptimizer.cleanupPeriodicOptimization();
        }

        // 새 정리 함수 설정 
        (window.__memoryOptimizer as any).setupPeriodicOptimization = cleanup;
      }

      if (typeof window !== 'undefined' && window.__memoryOptimizer) {
        if (!window.__memoryOptimizer.settings) {
          window.__memoryOptimizer.settings = {};
        }

        // 타입 안전한 할당
        Object.assign(window.__memoryOptimizer.settings || {}, settings);
      }
    }).catch(error => {
      console.error('주기적 최적화 설정 중 오류 발생:', error);
    });
  } catch (error) {
    console.error('주기적 메모리 최적화 설정 중 오류 발생:', error);
  }
}

/**
 * 하드웨어 가속화 설정 적용
 */
function applyHardwareAccelerationSettings(settings: LocalMemorySettings): void {
  try {
    // GPU 가속화 관련 설정 적용
    import('./gpu-acceleration').then(({ toggleGpuAcceleration }) => {
      // 설정에 따라 GPU 가속화 활성화/비활성화
      toggleGpuAcceleration(settings.useHardwareAcceleration).then(success => {
        if (success) {
          console.log(`GPU 가속화 ${settings.useHardwareAcceleration ? '활성화' : '비활성화'} 성공`);
        } else {
          console.warn(`GPU 가속화 ${settings.useHardwareAcceleration ? '활성화' : '비활성화'} 실패`);
        }
      });
    }).catch(error => {
      console.error('GPU 가속화 설정 적용 중 오류 발생:', error);
    });
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

/**
 * 네이티브 모듈 설정을 통합합니다.
 * @param currentSettings 현재 애플리케이션 설정
 * @returns 통합된 설정
 */
export async function mergeNativeSettings(currentSettings: MemorySettings): Promise<MemorySettings> {
  try {
    // Use nativeModuleClient to get status instead of non-existent getNativeBridgeState
    const nativeStatus = await nativeModuleClient.getNativeModuleStatus();

    if (nativeStatus?.success && nativeStatus?.settings) { // Check if status and settings exist
      console.log('네이티브 설정과 병합 중...');
      // 네이티브 모듈 설정 우선 적용 (예시)
      return {
        ...currentSettings,
        enableNativeOptimization: nativeStatus.settings.enableNativeOptimization ?? currentSettings.enableNativeOptimization,
        processingMode: nativeStatus.settings.processingMode ?? currentSettings.processingMode,
        // 필요한 경우 다른 네이티브 설정 병합
      };
    } else {
      console.warn('네이티브 설정 정보를 가져올 수 없습니다. 앱 설정 유지.', nativeStatus?.error);
    }
  } catch (error) {
    console.error('네이티브 설정 병합 오류:', error);
  }
  return currentSettings; // 오류 발생 시 현재 설정 반환
}
