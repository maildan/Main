/**
 * Rust 네이티브 모듈과 통신하는 클라이언트 함수
 * JS/TS 코드에서 네이티브 모듈 기능에 접근할 수 있는 인터페이스 제공
 */
import type { 
  MemoryInfo, 
  OptimizationResult, 
  GCResult, 
  OptimizationLevel,
  GpuInfo,
  GpuComputationResult,
  TaskResult
} from '@/types/native-module';

/**
 * 메모리 정보 가져오기
 * @returns Promise<{success: boolean, memoryInfo: MemoryInfo | null, optimizationLevel: number, error?: string}>
 */
export async function getMemoryInfo() {
  try {
    // API 엔드포인트를 통해 네이티브 메모리 정보 가져오기
    const response = await fetch('/api/native/memory', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
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
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * 메모리 최적화 수행
 * @param level 최적화 레벨 (0-4)
 * @param emergency 긴급 상황 여부
 * @returns Promise<{success: boolean, result: OptimizationResult | null, error?: string}>
 */
export async function optimizeMemory(level: OptimizationLevel = OptimizationLevel.Medium, emergency: boolean = false) {
  try {
    // API 엔드포인트를 통해 네이티브 메모리 최적화 수행
    const response = await fetch('/api/native/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, emergency })
    });
    
    if (!response.ok) {
      throw new Error(`메모리 최적화 요청 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    return {
      success: false,
      result: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * 가비지 컬렉션 수행
 * @returns Promise<{success: boolean, result: GCResult | null, error?: string}>
 */
export async function forceGarbageCollection() {
  try {
    // API 엔드포인트를 통해 네이티브 GC 수행
    const response = await fetch('/api/native/memory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`GC 요청 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('GC 수행 오류:', error);
    return {
      success: false,
      result: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * GPU 정보 가져오기
 * @returns Promise<{success: boolean, available: boolean, gpuInfo: GpuInfo | null, error?: string}>
 */
export async function getGpuInfo() {
  try {
    // API 엔드포인트를 통해 네이티브 GPU 정보 가져오기
    const response = await fetch('/api/native/gpu', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
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
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * GPU 가속 활성화/비활성화
 * @param enable 활성화 여부
 * @returns Promise<{success: boolean, enabled: boolean, result: boolean, error?: string}>
 */
export async function setGpuAcceleration(enable: boolean) {
  try {
    // API 엔드포인트를 통해 네이티브 GPU 가속 설정
    const response = await fetch('/api/native/gpu', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable })
    });
    
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
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * GPU 계산 수행
 * @param data 계산에 사용할 데이터
 * @param computationType 계산 유형
 * @returns Promise<{success: boolean, result: GpuComputationResult | null, error?: string}>
 */
export async function performGpuComputation<T = any>(data: any, computationType: string) {
  try {
    // API 엔드포인트를 통해 네이티브 GPU 계산 수행
    const response = await fetch('/api/native/gpu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        data: JSON.stringify(data), 
        computationType 
      })
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
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * 네이티브 모듈 상태 확인
 * @returns Promise<{available: boolean, fallbackMode: boolean, version: string | null, info: any | null, timestamp: number}>
 */
export async function getNativeModuleStatus() {
  try {
    // API 엔드포인트를 통해 네이티브 모듈 상태 확인
    const response = await fetch('/api/native/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`네이티브 모듈 상태 요청 실패: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('네이티브 모듈 상태 확인 오류:', error);
    return {
      available: false,
      fallbackMode: true,
      version: null,
      info: null,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}
