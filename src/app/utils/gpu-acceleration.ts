/**
 * GPU 가속화 관리
 * 
 * 모든 GPU 관련 작업은 Rust 네이티브 모듈로 처리합니다.
 */
import { setGpuAcceleration, getGpuInfo, performGpuComputation as nativePerformGpuComputation } from './nativeModuleClient';

// 상태 캐싱
let lastGpuStatusCheck = 0;
const GPU_STATUS_CHECK_INTERVAL = 60000; // 1분마다 상태 확인
let cachedGpuAccelerationStatus = false;

/**
 * GPU 가속화 활성화/비활성화
 * @param enable 활성화 여부
 * @returns Promise<boolean> 성공 여부
 */
export async function toggleGpuAcceleration(enable: boolean): Promise<boolean> {
  try {
    const response = await setGpuAcceleration(enable);
    
    if (response.success) {
      cachedGpuAccelerationStatus = response.enabled;
      lastGpuStatusCheck = Date.now();
      console.log(`GPU 가속화 ${enable ? '활성화' : '비활성화'} 성공`);
      return true;
    } else {
      console.warn('GPU 가속화 설정 변경 실패:', response.error);
      return false;
    }
  } catch (error) {
    console.error('GPU 가속화 설정 변경 중 오류:', error);
    return false;
  }
}

/**
 * GPU 연산 수행
 */
export async function executeGpuComputation<T = any>(
  data: any,
  computationType: string = 'default'
): Promise<T> {
  try {
    const nativeResult = await nativePerformGpuComputation(data, computationType);
    
    if (nativeResult && nativeResult.success && nativeResult.result) {
      return nativeResult.result as T;
    }
    
    throw new Error(nativeResult?.error || 'GPU 연산 실패');
  } catch (error) {
    console.error('GPU 연산 오류:', error);
    throw error;
  }
}

/**
 * GPU 가용성 확인
 */
export async function checkGpuAvailability(): Promise<boolean> {
  try {
    const gpuInfo = await getGpuInfo();
    cachedGpuAccelerationStatus = gpuInfo.available && gpuInfo.gpuInfo?.acceleration_enabled;
    lastGpuStatusCheck = Date.now();
    return cachedGpuAccelerationStatus;
  } catch (error) {
    console.error('GPU 가용성 확인 중 오류:', error);
    return false;
  }
}

/**
 * 현재 GPU 가속화 활성화 상태 확인
 */
export async function isGpuComputationActive(): Promise<boolean> {
  if (Date.now() - lastGpuStatusCheck > GPU_STATUS_CHECK_INTERVAL) {
    await checkGpuAvailability();
  }
  return cachedGpuAccelerationStatus;
}

/**
 * GPU 가속화가 활성화되어 있는지 확인
 */
export function isGpuAccelerationEnabled(): boolean {
  return cachedGpuAccelerationStatus;
}

/**
 * 시스템에서 GPU 지원 여부 확인
 */
export async function isGpuSupported(): Promise<boolean> {
  try {
    const gpuInfo = await getGpuInfo();
    return gpuInfo.available;
  } catch (error) {
    console.error('GPU 지원 확인 중 오류:', error);
    return false;
  }
}

/**
 * GPU 모듈 초기화
 */
export async function initializeGpuAcceleration(): Promise<void> {
  await checkGpuAvailability();
  console.log(`GPU 가속화 초기화 완료 (활성화: ${cachedGpuAccelerationStatus})`);
}

/**
 * GPU 정보 가져오기
 */
export async function getGpuAccelerationInfo(): Promise<any> {
  try {
    return await getGpuInfo();
  } catch (error) {
    console.error('GPU 정보 가져오기 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  }
}
