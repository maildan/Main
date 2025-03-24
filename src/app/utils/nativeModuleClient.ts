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
import { OptimizationLevel } from '@/types';

/**
 * 메모리 정보 가져오기
 * @returns Promise<{success: boolean, memoryInfo: MemoryInfo | null, optimizationLevel: number, error?: string}>
 */
export async function getMemoryInfo() {
  try {
    const response = await fetch('/api/native/memory');
    
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
 * 메모리 최적화 수행
 * @param level 최적화 레벨 (0-4)
 * @param emergency 긴급 상황 여부
 * @returns Promise<{success: boolean, result: OptimizationResult | null, error?: string}>
 */
export async function optimizeMemory(level: OptimizationLevel = OptimizationLevel.MEDIUM, emergency: boolean = false) {
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
    const response = await fetch('/api/native/memory', {
      method: 'PUT'
    });
    
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
 * GPU 정보 가져오기
 * @returns Promise<{success: boolean, available: boolean, gpuInfo: GpuInfo | null, error?: string}>
 */
export async function getGpuInfo() {
  try {
    const response = await fetch('/api/native/gpu');
    
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
 * @returns Promise<{success: boolean, enabled: boolean, result: boolean, error?: string}>
 */
export async function setGpuAcceleration(enable: boolean) {
  try {
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
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
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
}

/**
 * 네이티브 모듈 상태 확인
 * @returns Promise<{available: boolean, fallbackMode: boolean, version: string | null, info: any | null, timestamp: number}>
 */
export async function getNativeModuleStatus() {
  try {
    const response = await fetch('/api/native/status');
    
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
