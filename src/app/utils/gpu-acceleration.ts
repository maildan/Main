/**
 * GPU 언어어 유틸리티
 * 
 * 이 모듈은 네이티브 모듈을 사용하여 GPU 가속화를 관

 * 리합니다.
 */

import { nativeModuleClient } from './nativeModuleClient';
import { GpuInfo, GpuTaskType, GpuComputationResult } from '@/types';
import { isGpuSupported } from './gpu-detection';
import { logError, logInfo } from './log-utils';

/**
 * GPU 정보 인터페이스
 */
/*
interface GpuInfo {
  available: boolean;
  accelerationEnabled: boolean;
  driverVersion: string;
  deviceName: string;
  deviceType: string;
  vendor: string;
  timestamp: number;
}
*/

// GpuAccelerationResponse 인터페이스는 파일 내에서 사용되지 않지만
// 다른 컴포넌트에서 활용할 수 있도록 export 추가
export interface GpuAccelerationResponse {
  success: boolean;
  enabled?: boolean;
  available?: boolean;
  error?: string;
  details?: Partial<GpuInfo>;
}

// GPU 정보 캐시
let gpuInfoCache: GpuInfo | null = null;
let lastInfoFetchTime = 0;
const INFO_CACHE_TTL = 60000; // 1분

// GPU 가속 상태 - Updated by getGpuInfo based on isHardwareAccelerated
let _isGpuAccelerationEnabled = false;

const GPU_ACCELERATION_CHECK_INTERVAL = 60 * 1000; // 1분
let gpuAccelerationEnabled: boolean | null = null;
let lastGpuCheckTime: number | null = null;

/**
 * Checks if GPU acceleration is available based on provided GpuInfo.
 * @param gpuInfo - The GpuInfo object or null.
 * @returns True if GPU acceleration is available, false otherwise.
 */
export function isGpuAccelerationEnabled(gpuInfo: GpuInfo | null): boolean {
  // Ensure isHardwareAccelerated property from GpuInfo is used
  return !!gpuInfo && gpuInfo.isHardwareAccelerated;
}

/**
 * GPU 가속 상태를 감지하고 업데이트합니다.
 * @returns {Promise<boolean>} GPU 가속 활성화 여부
 */
export async function detectGpuAcceleration(): Promise<boolean> {
  // 브라우저 환경이 아닌 경우 기본적으로 비활성화
  if (typeof window === 'undefined') {
    logInfo('[GPU Acceleration] Not in browser environment, GPU acceleration disabled.');
    gpuAccelerationEnabled = false;
    return false;
  }

  const now = Date.now();
  if (lastGpuCheckTime && now - lastGpuCheckTime < GPU_ACCELERATION_CHECK_INTERVAL && gpuAccelerationEnabled !== null) {
    // logInfo(`[GPU Acceleration] Using cached status: ${gpuAccelerationEnabled}`); // 너무 빈번한 로그 제거
    return gpuAccelerationEnabled;
  }

  try {
    const gpuSupported = await isGpuSupported();
    if (!gpuSupported) {
      logInfo('[GPU Acceleration] GPU not supported (WebGL/WebGPU), GPU acceleration disabled.');
      gpuAccelerationEnabled = false;
      lastGpuCheckTime = now;
      return false;
    }

    const gpuInfo: GpuInfo | null = await getGpuInfo();
    if (!gpuInfo) {
      logInfo('[GPU Acceleration] Failed to get GPU info, GPU acceleration disabled.');
      gpuAccelerationEnabled = false;
      lastGpuCheckTime = now;
      return false;
    }

    const isAccelerated = gpuInfo.isHardwareAccelerated;

    gpuAccelerationEnabled = isAccelerated;

    logInfo(`[GPU Acceleration] Status detected: ${gpuAccelerationEnabled}, GPU: ${gpuInfo.renderer}`);
    lastGpuCheckTime = now;

    return gpuAccelerationEnabled;

  } catch (error) {
    logError('[GPU Acceleration] Error detecting GPU acceleration:', error);
    gpuAccelerationEnabled = false;
    lastGpuCheckTime = now;
    return false;
  }
}

/**
 * GPU 정보 가져오기 (캐시 사용)
 * @param forceRefresh 캐시 무시하고 새로고침 여부
 * @returns GPU 정보 또는 null
 */
export async function getGpuInfo(forceRefresh = false): Promise<GpuInfo | null> {
  const now = Date.now();
  if (!forceRefresh && gpuInfoCache && now - lastInfoFetchTime < INFO_CACHE_TTL) {
    return gpuInfoCache;
  }

  try {
    const response = await nativeModuleClient.getGpuInfo();
    if (response) {
      gpuInfoCache = response;
      lastInfoFetchTime = now;
      _isGpuAccelerationEnabled = response.isHardwareAccelerated ?? false;
      return response;
    } else {
      gpuInfoCache = null;
      lastInfoFetchTime = now;
      _isGpuAccelerationEnabled = false;
      return null;
    }
  } catch (error: any) {
    console.error('GPU 정보 가져오기 실패:', error);
    gpuInfoCache = null;
    lastInfoFetchTime = now;
    _isGpuAccelerationEnabled = false;
    return null;
  }
}

/**
 * GPU 가속화 활성화/비활성화
 * @param enable 활성화 여부
 * @returns 성공 여부
 */
export async function toggleGpuAcceleration(enable: boolean): Promise<boolean> {
  try {
    const response = await nativeModuleClient.setGpuAcceleration(enable);

    if (response && response.success) {
      gpuInfoCache = null;
      _isGpuAccelerationEnabled = enable;
      return true;
    }

    return false;
  } catch (error) {
    console.error(`GPU 가속화 ${enable ? '활성화' : '비활성화'} 오류:`, error);
    return false;
  }
}

/**
 * GPU 가속화 활성화/비활성화
 * @param enable 활성화 여부
 * @returns 성공 여부
 */
export async function setGpuAcceleration(enable: boolean): Promise<boolean> {
  return await toggleGpuAcceleration(enable);
}

/**
 * 기기 GPU 성능 평가
 * @returns 성능 점수 (0-100)
 */
export async function evaluateGpuPerformance(): Promise<number> {
  try {
    const gpuInfo = await getGpuInfo();

    if (!gpuInfo) {
      return 0;
    }

    let score = 0;
    const vendorLower = gpuInfo.vendor?.toLowerCase() ?? '';
    const rendererLower = gpuInfo.renderer?.toLowerCase() ?? '';

    if (vendorLower.includes('nvidia')) score += 30;
    if (vendorLower.includes('amd')) score += 25;
    if (vendorLower.includes('apple')) score += 20;
    if (vendorLower.includes('intel') && rendererLower.includes('iris')) score += 15;
    else if (vendorLower.includes('intel')) score += 5;

    if (gpuInfo.isHardwareAccelerated) score += 20;

    return Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error('GPU 성능 평가 오류:', error);
    return 0;
  }
}

/**
 * GPU 작업 분석 및 계산 수행
 * @param taskType 작업 유형 (Enum value)
 * @param data 작업 데이터
 * @returns 계산 결과 (from GpuComputationResult.data)
 */
export async function executeGpuTask<T = unknown>(
  taskType: GpuTaskType,
  data: unknown
): Promise<T | null> {
  try {
    const gpuInfo = await getGpuInfo();
    if (!gpuInfo || !gpuInfo.isHardwareAccelerated) {
      console.warn('GPU 가속이 비활성화되었거나 사용할 수 없습니다.');
      return null;
    }

    const response = await nativeModuleClient.performGpuComputation(data, taskType);

    if (!response.success) {
      console.error('GPU 작업 실패:', response.error);
      return null;
    }

    return response.data as T;
  } catch (error) {
    console.error('GPU 작업 실행 오류:', error);
    return null;
  }
}

/**
 * GPU 가속화 활성화
 * @returns 성공 여부
 */
export async function enableGpuAcceleration(): Promise<boolean> {
  return toggleGpuAcceleration(true);
}

/**
 * GPU 가속화 비활성화
 * @returns 성공 여부
 */
export async function disableGpuAcceleration(): Promise<boolean> {
  return toggleGpuAcceleration(false);
}

/**
 * GPU 가속 상태 확인
 */
export async function checkGpuAcceleration(): Promise<{ available: boolean; enabled: boolean }> {
  try {
    const gpuInfo = await nativeModuleClient.getGpuInfo();
    return {
      available: gpuInfo?.isHardwareAccelerated ?? false,
      enabled: gpuInfo?.isHardwareAccelerated ?? false,
    };
  } catch (error) {
    console.error('GPU 가속 상태 확인 오류:', error);
    return { available: false, enabled: false };
  }
}

/**
 * GPU를 사용한 계산 수행
 */
export async function performGpuTask(taskType: GpuTaskType, data: any): Promise<GpuComputationResult | null> {
  try {
    const result = await nativeModuleClient.performGpuComputation(data, taskType);
    return result;
  } catch (error) {
    console.error('GPU 작업 수행 오류:', error);
    return null;
  }
}

/**
 * 현재 GPU 가속 상태 확인
 * @returns 활성화 여부
 */
export function isGpuAccelerationCurrentlyEnabled(): boolean {
  return _isGpuAccelerationEnabled;
}

/**
 * GPU를 사용하여 데이터 처리
 * @param data 처리할 데이터
 * @param taskType 작업 유형
 * @returns 처리 결과
 */
export async function processWithGPU<T = any>(data: any, taskType: GpuTaskType): Promise<T | null> {
  if (!_isGpuAccelerationEnabled) {
    console.warn('GPU 가속이 비활성화되어 CPU로 처리합니다.');
    return null;
  }
  try {
    const response = await nativeModuleClient.performGpuComputation(data, taskType);
    if (response && response.success) {
      return response as any;
    } else {
      console.error('GPU 처리 실패:', response?.error);
      return null;
    }
  } catch (error) {
    console.error('GPU 처리 오류:', error);
    return null;
  }
}

/**
 * 여러 작업을 GPU로 병렬 처리
 * @param tasks 처리할 작업 배열
 * @returns 처리 결과 배열
 */
export async function processMultipleTasksWithGPU<T = any>(tasks: { data: any; taskType: GpuTaskType }[]): Promise<(T | null)[]> {
  if (!_isGpuAccelerationEnabled) {
    console.warn('GPU 가속 비활성화됨. 모든 작업을 CPU로 처리 시도 (폴백 미구현).');
    return tasks.map(() => null);
  }
  const results = await Promise.allSettled(
    tasks.map(async (task) => {
      try {
        const response = await nativeModuleClient.performGpuComputation(task.data, task.taskType);
        if (response && response.success) {
          return response as any;
        } else {
          console.error(`GPU 작업 ${task.taskType} 실패:`, response?.error);
          return null;
        }
      } catch (error) {
        console.error(`GPU 작업 ${task.taskType} 오류:`, error);
        return null;
      }
    })
  );
  return results.map(result => (result.status === 'fulfilled' ? result.value : null));
}

/**
 * Runs a specific task using GPU acceleration if available.
 * @param taskType - The type of GPU task to run.
 * @param data - The data to process.
 * @returns A promise resolving to the GpuComputationResult.
 */
export async function runGpuTask<T = unknown>(
  taskType: GpuTaskType,
  data: any
): Promise<GpuComputationResult | null> {
  if (!nativeModuleClient) {
    console.warn('Native module client not available.');
    return null;
  }

  try {
    const result: GpuComputationResult = await nativeModuleClient.performGpuComputation(data, taskType);

    console.log(`GPU Task ${GpuTaskType[taskType]} completed in ${result.executionTime}ms. Success: ${result.success}`);

    if (!result.success) {
      console.error(`GPU Task ${GpuTaskType[taskType]} failed:`, result.error);
    }

    return result;
  } catch (error) {
    console.error(`Error running GPU task ${GpuTaskType[taskType]}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime: 0,
      taskType: taskType,
      data: undefined
    };
  }
}

/**
 * 간단한 테스트 계산을 수행하여 GPU 성능을 측정합니다.
 * @returns {Promise<number>} 계산에 걸린 시간 (ms)
 */
export async function benchmarkGpuPerformance(): Promise<number> {
  if (typeof window === 'undefined' || !nativeModuleClient.isNativeModuleAvailable() || !(await detectGpuAcceleration())) {
    logInfo('[GPU Benchmark] GPU acceleration not available or disabled.');
    return Infinity;
  }

  try {
    logInfo('[GPU Benchmark] Starting GPU performance benchmark...');
    const startTime = performance.now();

    const benchmarkData = { size: 1024 };
    const result = await nativeModuleClient.performGpuComputation(
      benchmarkData,
      GpuTaskType.CUSTOM
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    if (result.success) {
      logInfo(`[GPU Benchmark] Benchmark completed successfully in ${duration.toFixed(2)}ms.`);
    } else {
      logError('[GPU Benchmark] Benchmark failed:', result.error);
      return Infinity;
    }

    return duration;
  } catch (error) {
    logError('[GPU Benchmark] Error during GPU benchmark:', error);
    return Infinity;
  }
}

/**
 * GPU 가속을 사용하여 데이터를 처리합니다. (예시 함수)
 * @param data 처리할 데이터
 * @param taskType 작업 유형
 * @returns {Promise<any>} 처리 결과
 */
export async function processDataWithGpu<TData, TResult>(data: TData, taskType: GpuTaskType): Promise<TResult | null> {
  if (typeof window === 'undefined' || !nativeModuleClient.isNativeModuleAvailable()) {
    logInfo('[GPU Processing] Native module not available.');
    return null;
  }
  if (!(await detectGpuAcceleration())) {
    logInfo('[GPU Processing] GPU acceleration is disabled or not available.');
    return null;
  }

  try {
    logInfo(`[GPU Processing] Processing data with GPU for task: ${GpuTaskType[taskType]}`);
    const result = await nativeModuleClient.performGpuComputation(
      data,
      taskType
    );

    if (result.success) {
      logInfo(`[GPU Processing] Task ${GpuTaskType[taskType]} completed successfully in ${result.executionTime.toFixed(2)}ms.`);
      return result.data as TResult;
    } else {
      logError(`[GPU Processing] Task ${GpuTaskType[taskType]} failed:`, result.error);
      return null;
    }
  } catch (error) {
    logError(`[GPU Processing] Error during GPU processing for task ${GpuTaskType[taskType]}:`, error);
    return null;
  }
}

detectGpuAcceleration();

if (typeof window !== 'undefined') {
  window.__gpuAccelerator = {
    isGpuAccelerationEnabled,
    getGpuInfo,
    toggleGpuAcceleration,
    enableGpuAcceleration,
    disableGpuAcceleration,
    evaluateGpuPerformance,
    executeGpuTask
  };
}

