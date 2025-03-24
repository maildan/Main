/**
 * GPU 가속화 통합 모듈
 * 
 * 네이티브 Rust 모듈과 JavaScript 구현을 통합해 GPU 가속 기능을 제공합니다.
 * 자동 폴백 메커니즘을 통해 안정적인 성능을 제공합니다.
 */

import { 
  getGpuInfo as fetchGpuInfo, 
  setGpuAcceleration, 
  performGpuComputation 
} from './nativeModuleClient';
import { GpuComputationResult, GpuInfo } from '@/types/native-module';

// GPU 상태 캐시
const gpuState = {
  available: false,
  enabled: false,
  info: null as GpuInfo | null,
  lastCheck: 0,
  accelerationHistory: [] as {
    timestamp: number;
    operation: string;
    success: boolean;
    duration: number;
  }[],
  fallbackMode: false
};

// 최대 이력 항목 수
const MAX_HISTORY_ITEMS = 50;

/**
 * GPU 정보 및 가용성 가져오기
 * 30초마다 캐시 갱신
 */
export async function getGpuInfo(forceRefresh = false): Promise<{
  available: boolean;
  enabled: boolean;
  info: GpuInfo | null;
}> {
  const now = Date.now();
  
  // 캐시가 유효하고 강제 새로고침을 요청하지 않은 경우
  if (!forceRefresh && now - gpuState.lastCheck < 30000 && gpuState.info) {
    return {
      available: gpuState.available,
      enabled: gpuState.enabled,
      info: gpuState.info
    };
  }
  
  try {
    const response = await fetchGpuInfo();
    
    if (response.success) {
      gpuState.available = response.available;
      gpuState.info = response.gpuInfo;
      gpuState.lastCheck = now;
      
      // GPU 사용 가능하고 info에 제공된 available 속성이 있으면 이를 사용
      if (response.gpuInfo) {
        gpuState.enabled = response.gpuInfo.available;
      }
      
      return {
        available: gpuState.available,
        enabled: gpuState.enabled,
        info: gpuState.info
      };
    }
    
    // API 응답이 실패한 경우 기존 캐시 반환
    return {
      available: gpuState.available,
      enabled: gpuState.enabled,
      info: gpuState.info
    };
  } catch (error) {
    console.error('GPU 정보 가져오기 오류:', error);
    
    // 오류 발생 시 기존 캐시 반환
    return {
      available: gpuState.available,
      enabled: gpuState.enabled,
      info: gpuState.info
    };
  }
}

/**
 * GPU 가속 활성화/비활성화
 */
export async function toggleGpuAcceleration(enable: boolean): Promise<boolean> {
  try {
    const response = await setGpuAcceleration(enable);
    
    if (response.success) {
      gpuState.enabled = response.enabled;
      return response.enabled;
    }
    
    return false;
  } catch (error) {
    console.error('GPU 가속 설정 오류:', error);
    return false;
  }
}

/**
 * GPU 연산 수행 (타입 안전)
 * @param data 연산에 사용할 데이터
 * @param computationType 연산 유형 (matrix, image, typing, pattern 등)
 * @param fallbackFn JavaScript 폴백 구현 함수
 */
export async function executeGpuComputation<T = any>(
  data: any, 
  computationType: string, 
  fallbackFn?: (data: any) => Promise<T>
): Promise<{
  success: boolean;
  result: T | null;
  accelerated: boolean;
  error?: string;
}> {
  // 최적화: GPU 사용 불가능한 경우 바로 폴백
  if (gpuState.fallbackMode || (!gpuState.available && !gpuState.enabled)) {
    if (fallbackFn) {
      try {
        const result = await fallbackFn(data);
        return {
          success: true,
          result,
          accelerated: false
        };
      } catch (error) {
        return {
          success: false,
          result: null,
          accelerated: false,
          error: error instanceof Error ? error.message : '폴백 구현 오류'
        };
      }
    } else {
      return {
        success: false,
        result: null,
        accelerated: false,
        error: 'GPU를 사용할 수 없고 폴백 구현이 제공되지 않았습니다'
      };
    }
  }
  
  // GPU 연산 시도
  try {
    const startTime = performance.now();
    const response = await performGpuComputation(data, computationType);
    const duration = performance.now() - startTime;
    
    if (response.success && response.result) {
      // 성공 이력 기록
      recordAccelerationHistory(computationType, true, duration);
      
      return {
        success: true,
        result: response.result,
        accelerated: true
      };
    } else {
      // GPU 연산 실패 시 폴백
      recordAccelerationHistory(computationType, false, duration);
      
      // 특정 횟수 이상 실패 시 자동 폴백 모드 활성화
      checkAndEnableFallbackMode();
      
      if (fallbackFn) {
        try {
          const result = await fallbackFn(data);
          return {
            success: true,
            result,
            accelerated: false
          };
        } catch (error) {
          return {
            success: false,
            result: null,
            accelerated: false,
            error: error instanceof Error ? error.message : '폴백 구현 오류'
          };
        }
      } else {
        return {
          success: false,
          result: null,
          accelerated: false,
          error: response.error || 'GPU 연산 실패'
        };
      }
    }
  } catch (error) {
    console.error('GPU 연산 오류:', error);
    
    // 실패 이력 기록
    recordAccelerationHistory(computationType, false, 0);
    
    // 특정 횟수 이상 실패 시 자동 폴백 모드 활성화
    checkAndEnableFallbackMode();
    
    // 폴백 함수가 제공된 경우 실행
    if (fallbackFn) {
      try {
        const result = await fallbackFn(data);
        return {
          success: true,
          result,
          accelerated: false
        };
      } catch (fallbackError) {
        return {
          success: false,
          result: null,
          accelerated: false,
          error: fallbackError instanceof Error ? fallbackError.message : '폴백 구현 오류'
        };
      }
    }
    
    return {
      success: false,
      result: null,
      accelerated: false,
      error: error instanceof Error ? error.message : 'GPU 연산 오류'
    };
  }
}

/**
 * GPU 가속 이력 기록
 */
function recordAccelerationHistory(
  operation: string,
  success: boolean,
  duration: number
): void {
  gpuState.accelerationHistory.unshift({
    timestamp: Date.now(),
    operation,
    success,
    duration
  });
  
  // 최대 개수 유지
  if (gpuState.accelerationHistory.length > MAX_HISTORY_ITEMS) {
    gpuState.accelerationHistory.pop();
  }
}

/**
 * 최근 실패가 많으면 자동 폴백 모드 활성화
 */
function checkAndEnableFallbackMode(): void {
  // 최근 5개 항목에서 실패 비율 확인
  const recentHistory = gpuState.accelerationHistory.slice(0, 5);
  if (recentHistory.length < 3) return;
  
  const failureCount = recentHistory.filter(item => !item.success).length;
  const failureRate = failureCount / recentHistory.length;
  
  // 실패율이 60% 이상이면 폴백 모드 활성화
  if (failureRate >= 0.6) {
    gpuState.fallbackMode = true;
    
    // 30분 후 폴백 모드 해제
    setTimeout(() => {
      gpuState.fallbackMode = false;
      console.log('GPU 가속 폴백 모드 해제, 다음 요청 시 GPU 가속 재시도');
    }, 30 * 60 * 1000);
  }
}

/**
 * GPU 가속 상태 가져오기
 */
export function getGpuAccelerationState(): typeof gpuState {
  return { ...gpuState };
}

/**
 * 수동으로 폴백 모드 설정
 */
export function setGpuFallbackMode(enabled: boolean): void {
  gpuState.fallbackMode = enabled;
}

/**
 * 초기화: 앱 시작 시 GPU 가용성 확인
 */
export async function initializeGpuAcceleration(): Promise<boolean> {
  try {
    const info = await getGpuInfo(true);
    return info.available;
  } catch (error) {
    console.error('GPU 가속 초기화 오류:', error);
    return false;
  }
}
