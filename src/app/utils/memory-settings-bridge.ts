/**
 * 메모리 설정 관련 네이티브 모듈 통신 브릿지
 */
import { initializeMemorySettings, updateMemorySettings, getMemorySettings } from './nativeModuleClient';

/**
 * 메모리 설정 초기화
 * @param settings 메모리 설정 객체
 * @returns Promise<boolean>
 */
export async function initializeNativeMemorySettings(settings: any): Promise<boolean> {
  try {
    const settingsJson = JSON.stringify(settings);
    const response = await initializeMemorySettings(settingsJson);
    
    if (response.success) {
      return true;
    }
    
    console.warn('네이티브 메모리 설정 초기화 실패:', response.error);
    return false;
  } catch (error) {
    console.error('네이티브 메모리 설정 초기화 중 오류:', error);
    return false;
  }
}

/**
 * 메모리 설정 업데이트
 * @param settings 메모리 설정 객체
 * @returns Promise<boolean>
 */
export async function updateNativeMemorySettings(settings: any): Promise<boolean> {
  try {
    const settingsJson = JSON.stringify(settings);
    const response = await updateMemorySettings(settingsJson);
    
    if (response.success) {
      return true;
    }
    
    console.warn('네이티브 메모리 설정 업데이트 실패:', response.error);
    return false;
  } catch (error) {
    console.error('네이티브 메모리 설정 업데이트 중 오류:', error);
    return false;
  }
}

/**
 * 현재 메모리 설정 가져오기
 * @returns Promise<any|null>
 */
export async function getNativeMemorySettings(): Promise<any | null> {
  try {
    const response = await getMemorySettings();
    
    if (response.success && response.settings) {
      return response.settings;
    }
    
    console.warn('네이티브 메모리 설정 가져오기 실패:', response.error);
    return null;
  } catch (error) {
    console.error('네이티브 메모리 설정 가져오기 중 오류:', error);
    return null;
  }
}

/**
 * 설정 객체를 네이티브 모듈 형식으로 변환
 * 
 * @param settings 앱 설정 객체
 * @returns 네이티브 형식 설정 객체
 */
export function convertToNativeSettings(settings: any): any {
  return {
    enable_automatic_optimization: settings.enableAutomaticOptimization,
    optimization_threshold: settings.optimizationThreshold,
    optimization_interval: settings.optimizationInterval,
    aggressive_gc: settings.aggressiveGC,
    enable_logging: settings.enableLogging,
    enable_performance_metrics: settings.enablePerformanceMetrics,
    use_hardware_acceleration: settings.useHardwareAcceleration,
    processing_mode: settings.processingMode,
    use_memory_pool: settings.useMemoryPool,
    pool_cleanup_interval: settings.poolCleanupInterval,
  };
}

/**
 * 네이티브 형식 설정을 앱 설정 객체로 변환
 * 
 * @param nativeSettings 네이티브 형식 설정
 * @returns 앱 설정 객체
 */
export function convertFromNativeSettings(nativeSettings: any): any {
  return {
    enableAutomaticOptimization: nativeSettings.enable_automatic_optimization,
    optimizationThreshold: nativeSettings.optimization_threshold,
    optimizationInterval: nativeSettings.optimization_interval,
    aggressiveGC: nativeSettings.aggressive_gc,
    enableLogging: nativeSettings.enable_logging,
    enablePerformanceMetrics: nativeSettings.enable_performance_metrics,
    useHardwareAcceleration: nativeSettings.use_hardware_acceleration,
    processingMode: nativeSettings.processing_mode,
    useMemoryPool: nativeSettings.use_memory_pool,
    poolCleanupInterval: nativeSettings.pool_cleanup_interval,
  };
}
