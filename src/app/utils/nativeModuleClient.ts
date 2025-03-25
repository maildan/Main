/**
 * Rust 네이티브 모듈과 통신하는 클라이언트 함수
 * JS/TS 코드에서 네이티브 모듈 기능에 접근할 수 있는 인터페이스 제공
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

/**
 * 기본 API 요청 옵션
 */
const DEFAULT_REQUEST_OPTIONS = {
  retryCount: 2,  
  retryDelay: 300,  
  timeout: 5000
};

// 메모리 캐시 - 응답을 짧은 시간 동안 캐싱하여 중복 요청 방지
const responseCache = new Map<string, {data: any, timestamp: number}>();
const CACHE_TTL = 500; // 캐시 유효시간 (ms)

// RequestInit 확장을 위한 선언 추가
declare global {
  interface RequestInit {
    retryOptions?: {
      retryCount?: number;
      retryDelay?: number;
      timeout?: number;
      useCache?: boolean;
    };
    signal?: AbortSignal | null;  // null 추가하여 DOM 정의와 일치시킴
  }
}

/**
 * 향상된 API 요청 함수 - 재시도, 타임아웃, 캐싱 지원
 */
async function enhancedFetch(
  url: string,
  options: RequestInit = {},
  retryOptions: {
    retryCount?: number;
    retryDelay?: number;
    timeout?: number;
    useCache?: boolean;
  } = DEFAULT_REQUEST_OPTIONS
): Promise<Response> {
  const { 
    retryCount = DEFAULT_REQUEST_OPTIONS.retryCount, 
    retryDelay = DEFAULT_REQUEST_OPTIONS.retryDelay,
    timeout = DEFAULT_REQUEST_OPTIONS.timeout,
    useCache = false
  } = retryOptions;
  
  // 캐싱 처리 (GET 요청만 캐싱)
  const cacheKey = options.method === 'GET' || !options.method ? url : '';
  if (useCache && cacheKey && options.method !== 'POST' && options.method !== 'PUT') {
    const cachedResponse = responseCache.get(cacheKey);
    const now = Date.now();
    
    // 유효한 캐시가 있으면 사용
    if (cachedResponse && (now - cachedResponse.timestamp < CACHE_TTL)) {
      return new Response(JSON.stringify(cachedResponse.data), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }
  }
  
  // AbortController로 타임아웃 구현 (더 신뢰성 있는 방식)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  // 원래 옵션에 신호 추가
  const enhancedOptions = {
    ...options,
    signal: controller.signal
  };
  
  // 재시도 로직
  let lastError: Error | null = null;
  let attempt = 0;
  
  while (attempt <= retryCount) {
    try {
      // 첫 번째 시도가 아닌 경우 지연
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt)); // 점진적 백오프
        console.log(`[API] ${url} 재시도 중... (${attempt}/${retryCount})`);
      }
      
      // 요청 실행
      const response = await fetch(url, enhancedOptions);
      
      // 타임아웃 클리어
      clearTimeout(timeoutId);
      
      // 4xx, 5xx 에러 처리 (4xx는 재시도하지 않음)
      if (!response.ok) {
        if (response.status >= 500 && attempt < retryCount) {
          throw new Error(`서버 오류: ${response.status}`);
        }
        return response;
      }
      
      // 응답 캐싱 (GET 요청인 경우만)
      if (useCache && cacheKey && (options.method === 'GET' || !options.method)) {
        try {
          // 응답을 복제하여 캐싱 (Response는 일회성이므로)
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          responseCache.set(cacheKey, {
            data,
            timestamp: Date.now()
          });
        } catch (e) {
          // 캐싱 실패는 무시 (중요하지 않음)
          console.debug('응답 캐싱 실패:', e);
        }
      }
      
      return response;
    } catch (error) {
      // AbortError는 타임아웃을 의미
      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new Error(`요청 타임아웃 (${timeout}ms)`);
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
      
      // 마지막 시도가 아닌 경우 다시 시도
      if (attempt === retryCount) {
        clearTimeout(timeoutId);
        throw lastError;
      }
      
      attempt++;
    }
  }
  
  // 코드가 여기까지 도달하지 않아야 하지만, 타입 안전성을 위해 추가
  clearTimeout(timeoutId);
  throw lastError || new Error('알 수 없는 요청 오류');
}

/**
 * 메모리 최적화 수행
 * @param level 최적화 레벨 (0-4)
 * @param emergency 긴급 상황 여부
 * @returns Promise<{success: boolean, result: OptimizationResult | null, error?: string}>
 */
export async function optimizeMemory(level: OptimizationLevel = OptimizationLevel.Medium, emergency: boolean = false) {
  try {
    // 요청 데이터 준비
    const requestBody = JSON.stringify({
      type: 'optimize',
      level: level as number,
      emergency
    });
    
    // 요청 보내기
    const response = await enhancedFetch('/api/native/memory', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: requestBody
    });
    
    // 응답 처리
    if (!response.ok) {
      throw new Error(`메모리 최적화 요청 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    return {
      success: false,
      result: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  }
}

/**
 * 가비지 컬렉션 수행
 * @returns Promise<{success: boolean, result: GCResult | null, error?: string}>
 */
export async function forceGarbageCollection() {
  try {
    // 요청 데이터 준비
    const requestBody = JSON.stringify({
      type: 'gc'
    });
    
    // 요청 보내기
    const response = await enhancedFetch('/api/native/memory', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: requestBody
    });
    
    // 응답 처리
    if (!response.ok) {
      throw new Error(`가비지 컬렉션 요청 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('가비지 컬렉션 오류:', error);
    return {
      success: false,
      result: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  }
}

/**
 * 메모리 정보 가져오기
 * @returns Promise<{success: boolean, memoryInfo: MemoryInfo | null, optimizationLevel: number, error?: string}>
 */
export async function getMemoryInfo() {
  try {
    // 요청 보내기
    const response = await enhancedFetch('/api/native/memory', {
      method: 'GET',
      retryOptions: { useCache: true }
    });
    
    // 응답 처리
    if (!response.ok) {
      throw new Error(`메모리 정보 요청 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return {
      success: false,
      memoryInfo: null,
      optimizationLevel: 0,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  }
}

/**
 * GPU 정보 가져오기
 * @returns Promise<{success: boolean, available: boolean, gpuInfo: GpuInfo | null, error?: string}>
 */
export const getGpuInfo = async (): Promise<any> => {
  try {
    // 요청 보내기
    const response = await enhancedFetch('/api/native/gpu', {
      method: 'GET',
      retryOptions: { useCache: true }
    });
    
    // 응답 처리
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
};

/**
 * GPU 가속 활성화/비활성화
 * @param enable 활성화 여부
 * @returns Promise<{success: boolean, enabled: boolean, result: boolean, error?: string}>
 */
export const setGpuAcceleration = async (enable: boolean): Promise<any> => {
  try {
    // 요청 데이터 준비
    const requestBody = JSON.stringify({
      enable
    });
    
    // 요청 보내기
    const response = await enhancedFetch('/api/native/gpu/acceleration', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
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
};

/**
 * GPU 계산 수행
 * @param data 계산에 사용할 데이터
 * @param computationType 계산 유형
 * @returns Promise<{success: boolean, result: GpuComputationResult | null, error?: string}>
 */
export const performGpuComputation = async <T = any>(data: any, computationType: string): Promise<any> => {
  try {
    const response = await fetch('/api/native/gpu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, computationType })
    });
    
    if (!response.ok) {
      throw new Error(`GPU 계산 요청 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('GPU 계산 오류:', error);
    return {
      success: false,
      result: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  }
};

/**
 * 네이티브 모듈 상태 확인
 * @returns Promise<{available: boolean, fallbackMode: boolean, version: string | null, info: any | null, timestamp: number}>
 */
export async function getNativeModuleStatus() {
  try {
    // 요청 보내기
    const response = await enhancedFetch('/api/native/status', {
      method: 'GET',
      retryOptions: { useCache: true }
    });
    
    // 응답 처리
    if (!response.ok) {
      throw new Error(`상태 확인 요청 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('네이티브 모듈 상태 확인 오류:', error);
    return {
      available: false,
      fallbackMode: true,
      version: null,
      info: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  }
}

/**
 * 작업 제출
 * @param taskType 작업 유형
 * @param data 작업 데이터
 * @returns Promise<{success: boolean, result: TaskResult | null, error?: string}>
 */
export async function submitTask<T = any>(taskType: string, data: any) {
  try {
    const response = await fetch('/api/native/worker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskType, data })
    });
    
    if (!response.ok) {
      throw new Error(`작업 제출 요청 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('작업 제출 오류:', error);
    return {
      success: false,
      result: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    };
  }
}

/**
 * 메모리 설정 초기화
 * @param settingsJson 설정 JSON 문자열
 * @returns Promise 성공 여부
 */
export async function initializeMemorySettings(settingsJson: string): Promise<{success: boolean, error?: string}> {
  try {
    const response = await fetch('/api/native/memory/settings/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: settingsJson
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('메모리 설정 초기화 중 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * 메모리 설정 업데이트
 * @param settingsJson 설정 JSON 문자열
 * @returns Promise 성공 여부
 */
export async function updateMemorySettings(settingsJson: string): Promise<{success: boolean, error?: string}> {
  try {
    const response = await fetch('/api/native/memory/settings/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: settingsJson
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('메모리 설정 업데이트 중 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * 메모리 설정 가져오기
 * @returns Promise 설정 데이터
 */
export async function getMemorySettings(): Promise<{success: boolean, settings?: any, error?: string}> {
  try {
    const response = await fetch('/api/native/memory/settings', {
      method: 'GET'
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('메모리 설정 가져오기 중 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * 메모리 최적화 요청
 * @param level 최적화 레벨
 * @param emergency 긴급 여부
 * @returns Promise<OptimizationResult>
 */
export const requestNativeMemoryOptimization = async (level: OptimizationLevel, emergency: boolean): Promise<OptimizationResult> => {
  try {
    const response = await fetch('/api/native/memory/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, emergency })
    });
    
    if (!response.ok) {
      throw new Error(`메모리 최적화 요청 실패: ${response.status}`);
    }
    
    return await response.json() as OptimizationResult;
  } catch (error) {
    console.error('메모리 최적화 요청 오류:', error);
    return { success: false } as OptimizationResult;
  }
};

/**
 * 가비지 컬렉션 요청
 * @returns Promise<GCResult>
 */
export const requestNativeGarbageCollection = async (): Promise<GCResult> => {
  try {
    const response = await fetch('/api/native/memory/gc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`가비지 컬렉션 요청 실패: ${response.status}`);
    }
    
    return await response.json() as GCResult;
  } catch (error) {
    console.error('가비지 컬렉션 요청 오류:', error);
    return { success: false } as GCResult;
  }
};

/**
 * 메모리 정보 요청
 * @returns Promise<MemoryInfo>
 */
export const requestNativeMemoryInfo = async (): Promise<MemoryInfo> => {
  try {
    const response = await fetch('/api/native/memory/info', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`메모리 정보 요청 실패: ${response.status}`);
    }
    
    return await response.json() as MemoryInfo;
  } catch (error) {
    console.error('메모리 정보 요청 오류:', error);
    return {} as MemoryInfo;
  }
};
