/**
 * GPU 언어어 유틸리티
 * 
 * 이 모듈은 네이티브 모듈을 사용하여 GPU 가속화를 관

 * 리합니다.
 */

import { getGpuInfo, performGpuComputation, setGpuAcceleration as remoteSetGpuAcceleration, GpuTaskType } from './nativeModuleClient';

/**
 * GPU 정보 인터페이스
 */
interface GpuInfo {
  available: boolean;
  accelerationEnabled: boolean;
  driverVersion?: string;
  deviceName?: string;
  deviceType?: string;
  vendor: string;
  name: string;
  timestamp?: number;
}

// GpuAccelerationResponse 인터페이스는 파일 내에서 사용되지 않지만
// 다른 컴포넌트에서 활용할 수 있도록 export 추가
export interface GpuAccelerationResponse {
  success: boolean;
  enabled?: boolean;
  available?: boolean;
  error?: string;
  details?: Partial<GpuInfo>;
}

// 캐시된 GPU 정보
let gpuInfoCache: GpuInfo | null = null;
let gpuInfoExpiration = 0;
const GPU_INFO_TTL = 5000; // 5초

/**
 * GPU 가속화 상태 확인
 * @returns 가속화 활성화 여부
 */
export async function isGpuAccelerationEnabled(): Promise<boolean> {
  try {
    // GPU 정보 가져오기 (캐시 사용)
    const gpuInfo = await getGpuInformation();
    return gpuInfo?.accelerationEnabled || false;
  } catch (error) {
    console.error('GPU 가속 상태 확인 오류:', error);
    return false;
  }
}

/**
 * GPU 정보 가져오기
 * @returns GPU 정보 객체
 */
export async function getGpuInformation(): Promise<GpuInfo | null> {
  // 캐시된 정보가 있고 유효하다면 그것을 사용
  const now = Date.now();
  if (gpuInfoCache && now < gpuInfoExpiration) {
    return gpuInfoCache;
  }

  try {
    // 새로운 정보 가져오기
    const gpuInfo = await getGpuInfo();
    
    if (!gpuInfo) {
      return null;
    }
    
    // 응답을 GpuInfo 형식으로 변환하고 캐시 업데이트
    const convertedInfo: GpuInfo = {
      available: gpuInfo.available,
      accelerationEnabled: gpuInfo.accelerationEnabled || false,
      driverVersion: gpuInfo.driverInfo,
      deviceName: gpuInfo.name,
      deviceType: gpuInfo.deviceType,
      vendor: gpuInfo.vendor,
      name: gpuInfo.name
    };
    
    gpuInfoCache = convertedInfo;
    gpuInfoExpiration = now + GPU_INFO_TTL;
    
    return convertedInfo;
  } catch (error) {
    console.error('GPU 정보 가져오기 오류:', error);
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
    const success = await remoteSetGpuAcceleration(enable);
    
    if (success) {
      // 캐시 무효화
      gpuInfoCache = null;
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
    const gpuInfo = await getGpuInformation();
    
    if (!gpuInfo || !gpuInfo.available) {
      return 0;
    }
    
    // GPU 타입에 따른 기본 점수 할당
    let score = 0;
    
    if (gpuInfo.deviceType === 'DiscreteGpu') {
      score = 70; // 독립 GPU는 높은 기본 점수
    } else if (gpuInfo.deviceType === 'IntegratedGpu') {
      score = 40; // 통합 GPU는 중간 기본 점수
    } else {
      score = 10; // 기타 GPU 타입은 낮은 기본 점수
    }
    
    // 벤더 정보에 따른 추가 점수
    if (gpuInfo.vendor && gpuInfo.deviceName) {
      const vendorLower = gpuInfo.vendor.toLowerCase();
      const nameLower = gpuInfo.deviceName.toLowerCase();
      
      if (vendorLower.includes('nvidia') && 
          (nameLower.includes('rtx') || nameLower.includes('gtx'))) {
        score += 20;
      } else if (vendorLower.includes('amd') && 
                (nameLower.includes('radeon') || nameLower.includes('vega'))) {
        score += 15;
      } else if (vendorLower.includes('intel') && nameLower.includes('iris')) {
        score += 10;
      }
    }
    
    // 점수를 0-100 범위로 제한
    return Math.min(100, Math.max(0, score));
  } catch (error) {
    console.error('GPU 성능 평가 오류:', error);
    return 0;
  }
}

/**
 * GPU 작업 분석 및 계산 수행
 * @param taskType 작업 유형
 * @param data 작업 데이터
 * @returns 계산 결과
 */
export async function executeGpuTask<T = unknown>(
  taskType: string,  // string으로 변경하여 타입 호환성 문제 해결
  data: unknown
): Promise<T | null> {
  try {
    // GPU 가용성 확인
    const gpuInfo = await getGpuInformation();
    if (!gpuInfo || !gpuInfo.available || !gpuInfo.accelerationEnabled) {
      console.warn('GPU 가속이 비활성화되었거나 사용할 수 없습니다.');
      return null;
    }
    
    // GPU 작업 실행 - 문자열로 변환하여 전달
    const result = await performGpuComputation(
      taskType as GpuTaskType,
      typeof data === 'object' ? data as Record<string, any> : { data }
    );
    
    return result as T | null;
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

// Window에 간단한 전역 API 설정
type _GpuAcceleratorAPI = {
  isGpuAccelerationEnabled: typeof isGpuAccelerationEnabled;
  getGpuInformation: typeof getGpuInformation;
  toggleGpuAcceleration: typeof toggleGpuAcceleration;
  enableGpuAcceleration: typeof enableGpuAcceleration;
  disableGpuAcceleration: typeof disableGpuAcceleration;
  evaluateGpuPerformance: typeof evaluateGpuPerformance;
  executeGpuTask: typeof executeGpuTask;
};

// Window 인터페이스 확장 방식 변경
if (typeof window !== 'undefined') {
  (window as any).__gpuAccelerator = {
    isGpuAccelerationEnabled,
    getGpuInformation,
    toggleGpuAcceleration,
    enableGpuAcceleration,
    disableGpuAcceleration,
    evaluateGpuPerformance,
    executeGpuTask
  };
}
