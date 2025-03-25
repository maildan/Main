/**
 * 메모리 설정 브릿지
 */
import { initializeMemorySettings, updateMemorySettings, getMemorySettings } from './nativeModuleClient';

// 요청 상태 추적 및 중복 요청 방지
const requestStatus = {
  pendingRequests: new Map<string, Promise<any>>(),
  lastRequestTime: new Map<string, number>(),
  minRequestInterval: 500 // ms
};

/**
 * 중복 요청 방지 및 병합 래퍼
 */
async function debouncedRequest<T>(
  key: string, 
  requestFn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const lastTime = requestStatus.lastRequestTime.get(key) || 0;
  
  // 진행 중인 동일 요청이 있으면 재사용
  if (requestStatus.pendingRequests.has(key)) {
    return requestStatus.pendingRequests.get(key) as Promise<T>;
  }
  
  // 마지막 요청 후 최소 간격이 지나지 않았으면 대기
  if (now - lastTime < requestStatus.minRequestInterval) {
    await new Promise(resolve => 
      setTimeout(resolve, requestStatus.minRequestInterval - (now - lastTime))
    );
  }
  
  // 새 요청 생성 및 상태 업데이트
  const requestPromise = requestFn();
  requestStatus.pendingRequests.set(key, requestPromise);
  requestStatus.lastRequestTime.set(key, Date.now());
  
  try {
    return await requestPromise;
  } finally {
    // 완료 후 pendingRequests에서 제거
    requestStatus.pendingRequests.delete(key);
  }
}

/**
 * 네이티브 메모리 설정 초기화
 */
export async function initializeNativeMemorySettings(settings: any): Promise<boolean> {
  return debouncedRequest('initSettings', async () => {
    try {
      // 유효성 검사
      if (!settings || typeof settings !== 'object') {
        throw new Error('유효하지 않은 설정 객체');
      }
      
      // 필수 필드 확인
      const requiredFields = ['enableAutomaticOptimization', 'optimizationThreshold'];
      for (const field of requiredFields) {
        if (!(field in settings)) {
          throw new Error(`필수 설정 필드 누락: ${field}`);
        }
      }
      
      // 형식 변환
      const settingsForNative = convertToNativeSettings(settings);
      const settingsJson = JSON.stringify(settingsForNative);
      
      // 네이티브 모듈에 전달
      const response = await initializeMemorySettings(settingsJson);
      
      return response.success;
    } catch (error) {
      console.error('네이티브 메모리 설정 초기화 오류:', error);
      return false;
    }
  });
}

/**
 * 네이티브 메모리 설정 업데이트
 */
export async function updateNativeMemorySettings(settings: any): Promise<boolean> {
  return debouncedRequest('updateSettings', async () => {
    try {
      // 유효성 검사
      if (!settings || typeof settings !== 'object') {
        throw new Error('유효하지 않은 설정 객체');
      }
      
      // 형식 변환
      const settingsForNative = convertToNativeSettings(settings);
      const settingsJson = JSON.stringify(settingsForNative);
      
      // 네이티브 모듈에 전달
      const response = await updateMemorySettings(settingsJson);
      
      return response.success;
    } catch (error) {
      console.error('네이티브 메모리 설정 업데이트 오류:', error);
      return false;
    }
  });
}

/**
 * 네이티브 메모리 설정 가져오기
 * @returns 설정 객체
 */
export async function getNativeMemorySettings(): Promise<any> {
  try {
    const response = await getMemorySettings();
    
    if (response.success && response.settings) {
      return response.settings;
    }
    
    return null;
  } catch (error) {
    console.error('네이티브 메모리 설정 가져오기 오류:', error);
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
