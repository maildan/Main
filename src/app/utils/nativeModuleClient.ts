/**
 * 네이티브 모듈 클라이언트 API
 * 
 * 프론트엔드에서 네이티브 모듈 기능을 사용하기 위한 래퍼 함수들을 제공합니다.
 */

import type {
  MemoryInfo,
  OptimizationResult,
  GCResult,
  // GpuInfo,
  // GpuComputationResult,
  // TaskResult 
} from '@/types';
import { OptimizationLevel } from '@/types/native-module';

// 상태 캐시
let moduleStatusCache: any = null;
let lastStatusCheck = 0;
const STATUS_CACHE_TTL = 10000; // 10초

// 브라우저 환경인지 확인 - 상수로 변경
const isBrowser = typeof window !== 'undefined';

/**
 * fetch 요청을 래핑하는 함수
 */
async function enhancedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return response;
  } catch (error) {
    console.error(`Fetch 요청 실패 (${url}):`, error);
    throw error;
  }
}

/**
 * 메모리 정보 가져오기
 */
export async function getMemoryInfo() {
  if (!isBrowser) {
    return { success: false, error: 'Server environment', timestamp: Date.now() };
  }

  try {
    const response = await enhancedFetch('/api/native/memory');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('메모리 정보 가져오기 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/**
 * 메모리 최적화 수행
 */
export async function optimizeMemory(level = 2, emergency = false) {
  try {
    const response = await enhancedFetch('/api/native/memory', {
      method: 'PUT',
      body: JSON.stringify({
        type: 'optimize',
        level: level.toString(),
        emergency
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('메모리 최적화 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/**
 * 가비지 컬렉션 강제 수행
 */
export async function forceGarbageCollection() {
  try {
    const response = await enhancedFetch('/api/native/memory', {
      method: 'PUT',
      body: JSON.stringify({
        type: 'gc'
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('가비지 컬렉션 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/**
 * GPU 정보 가져오기
 */
export async function getGpuInfo() {
  try {
    const response = await enhancedFetch('/api/native/gpu');

    if (!response.ok) {
      throw new Error(`GPU 정보 요청 실패: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('GPU 정보 가져오기 오류:', error);
    return {
      success: false,
      available: false,
      gpuInfo: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  }
}

/**
 * GPU 가속 활성화/비활성화
 * @param enable 활성화 여부
 */
export async function setGpuAcceleration(enable: boolean) {
  try {
    // 요청 데이터 준비
    const requestBody = JSON.stringify({
      enable
    });

    // 요청 보내기
    const response = await enhancedFetch('/api/native/gpu/acceleration', {
      method: 'PUT',
      body: requestBody
    });

    // 응답 처리
    if (!response.ok) {
      throw new Error(`GPU 가속 설정 요청 실패: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('GPU 가속 설정 오류:', error);
    return {
      success: false,
      enabled: false,
      result: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  }
}

/**
 * GPU 계산 수행
 * @param data 계산에 사용할 데이터
 * @param computationType 계산 유형
 */
export async function performGpuComputation<_T = unknown>(data: unknown, computationType: string) {
  try {
    // 요청 데이터 준비
    const requestBody = JSON.stringify({
      data,
      computationType
    });

    // 요청 보내기
    const response = await enhancedFetch('/api/native/gpu', {
      method: 'POST',
      body: requestBody
    });

    // 응답 처리
    if (!response.ok) {
      throw new Error(`GPU 계산 요청 실패: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('GPU 계산 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  }
}

/**
 * 네이티브 모듈 상태 확인
 */
export async function getNativeModuleStatus() {
  if (!isBrowser) {
    return { success: false, error: 'Server environment', timestamp: Date.now() };
  }

  // 캐시된 상태가 있고 TTL 내라면 캐시된 값 반환
  const now = Date.now();
  if (moduleStatusCache && now - lastStatusCheck < STATUS_CACHE_TTL) {
    return moduleStatusCache;
  }

  try {
    const response = await enhancedFetch('/api/native/status');

    if (!response.ok) {
      throw new Error(`네이티브 모듈 상태 요청 실패: ${response.status}`);
    }

    const result = await response.json();

    // 캐시 업데이트
    moduleStatusCache = result;
    lastStatusCheck = now;

    return result;
  } catch (error) {
    console.error('네이티브 모듈 상태 확인 실패:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}
