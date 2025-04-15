/**
 * 네이티브 모듈 클라이언트 API
 * 
 * 프론트엔드에서 네이티브 모듈 기능을 사용하기 위한 래퍼 함수들을 제공합니다.
 */

import type { 
  MemoryInfo, 
  OptimizationResult, 
  GCResult, 
  GpuInfo,
  GpuComputationResult,
  TaskResult
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
    // 요청 데이터 준비
    const data = JSON.stringify({
      type: 'gc'
    });
    
    // 먼저 POST 메서드로 시도
    try {
      const response = await enhancedFetch('/api/native/memory', {
        method: 'POST',
        body: data,
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // POST가 실패하면 PUT 메서드 시도
      console.warn('POST 메서드 실패, PUT 메서드로 다시 시도합니다.');
    } catch (error) {
      console.warn('POST 메서드 실패, PUT 메서드로 다시 시도합니다.', error);
    }
    
    // PUT 메서드 시도
    const response = await enhancedFetch('/api/native/memory', {
      method: 'PUT',
      body: data,
    });
    
    if (!response.ok) {
      // 더 상세한 오류 로깅
      console.error(`가비지 컬렉션 요청 실패: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('가비지 컬렉션 실패:', error);
    
    // 가비지 컬렉션이 실패하더라도 폴백 구현으로 기본 가비지 컬렉션 시도
    try {
      if (typeof window !== 'undefined' && typeof window.gc === 'function') {
        window.gc();
        console.log('브라우저 GC 폴백 사용');
        return {
          success: true,
          message: '브라우저 GC 폴백으로 실행됨',
          timestamp: Date.now()
        };
      }
    } catch (fallbackError) {
      console.warn('브라우저 GC 폴백도 실패:', fallbackError);
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  }
}

/**
 * GPU 정보 가져오기
 */
export async function getGpuInfo() {
  try {
    // 브라우저 환경인지 확인
    if (!isBrowser) {
      return createFallbackGpuInfo('서버 환경에서 실행 중');
    }
    
    // 먼저 간단한 상태 확인
    if (!window.navigator) {
      return createFallbackGpuInfo('navigator 객체를 사용할 수 없음');
    }
    
    try {
      const response = await enhancedFetch('/api/native/gpu');
    
    if (!response.ok) {
        console.warn(`GPU 정보 요청 실패: ${response.status}. 폴백 GPU 정보 반환`);
        return createFallbackGpuInfo(`API 응답 오류: ${response.status}`);
      }
      
      const result = await response.json();
      
      // 결과 검증
      if (result && result.success) {
        return result;
      } else {
        console.warn('GPU 정보 요청은 성공했지만 유효한 데이터가 없습니다. 폴백 정보 반환', result);
        return createFallbackGpuInfo('유효하지 않은 응답 데이터');
      }
    } catch (fetchError) {
      console.error('GPU 정보 요청 중 오류:', fetchError);
      return createFallbackGpuInfo(fetchError instanceof Error ? fetchError.message : '네트워크 오류');
    }
  } catch (error) {
    console.error('GPU 정보 가져오기 처리 중 예상치 못한 오류:', error);
    return createFallbackGpuInfo('예상치 못한 오류');
  }
}

/**
 * 폴백 GPU 정보 생성
 */
function createFallbackGpuInfo(reason: string) {
  // 브라우저 WebGL 지원 확인 시도
  let webglAvailable = false;
  let vendorInfo = '알 수 없음';
  
  try {
    if (typeof window !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
      
      if (gl) {
        webglAvailable = true;
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        
        if (debugInfo) {
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '알 수 없음';
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '알 수 없음';
          vendorInfo = `${vendor} (${renderer})`;
        }
      }
    }
  } catch (e) {
    console.warn('WebGL 지원 확인 중 오류:', e);
  }
  
  return {
    success: true, // 폴백 정보이지만 클라이언트 코드를 중단시키지 않기 위해 success:true 반환
    available: webglAvailable,
    fallback: true, // 이것이 폴백 데이터임을 표시
    gpuInfo: {
      name: '브라우저 폴백',
      vendor: vendorInfo,
      available: webglAvailable,
      accelerationEnabled: false,
      deviceType: 'Software',
      driverVersion: '폴백 구현',
      fallbackReason: reason
    },
      timestamp: Date.now()
    };
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
export async function performGpuComputation<T = unknown>(data: unknown, computationType: string) {
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
