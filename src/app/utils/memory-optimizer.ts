/**
 * 렌더러 프로세스 메모리 최적화 유틸리티
 * 모든 메모리 최적화 작업은 네이티브 모듈을 통해 처리됩니다.
 */

import { getMemoryInfo as getNativeMemoryInfo, optimizeMemory as performNativeOptimization } from './nativeModuleClient';
import { MemoryUsageInfo } from '../../types/app-types';

// 메모리 최적화 설정 인터페이스
export interface MemoryOptimizerOptions {
  /** 메모리 사용량 임계치 (MB) */
  threshold?: number;
  /** 모니터링 간격 (ms) */
  checkInterval?: number;
  /** 경고 표시 여부 */
  showWarnings?: boolean;
  /** 자동 최적화 활성화 여부 */
  autoOptimize?: boolean;
  /** 디버그 로그 활성화 여부 */
  debug?: boolean;
}

/**
 * 현재 메모리 사용량 정보 얻기
 * @returns {MemoryUsageInfo | null} 메모리 사용량 정보
 */
export async function getMemoryInfo(): Promise<MemoryUsageInfo | null> {
  try {
    // 네이티브 모듈에서 메모리 정보 요청
    const response = await getNativeMemoryInfo();
    
    if (!response.success || !response.memoryInfo) {
      console.warn('네이티브 메모리 정보 가져오기 실패:', response.error);
      return null;
    }
    
    // 네이티브 모듈에서 받은 데이터 형식 변환
    return {
      heapUsed: response.memoryInfo.heap_used,
      heapTotal: response.memoryInfo.heap_total,
      heapLimit: response.memoryInfo.heap_limit || 0,
      heapUsedMB: response.memoryInfo.heap_used_mb,
      percentUsed: response.memoryInfo.percent_used,
      rss: response.memoryInfo.rss || 0,
      rssMB: response.memoryInfo.rss_mb || 0,
      timestamp: response.memoryInfo.timestamp || Date.now()
    };
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return null;
  }
}

/**
 * 메모리 사용량 상태를 백분율로 계산
 * @returns {number} 사용 비율 (0-100%)
 */
export async function getMemoryUsagePercentage(): Promise<number> {
  const info = await getMemoryInfo();
  return info ? info.percentUsed : 0;
}

/**
 * 메모리 최적화 수행 함수
 * 네이티브 모듈을 통해 메모리 최적화 수행
 * @param {boolean} deepCleanup 심층 정리 여부
 * @returns {Promise<boolean>} 성공 여부
 */
export async function optimizeMemory(deepCleanup = false): Promise<boolean> {
  try {
    // 네이티브 모듈 호출
    const result = await performNativeOptimization(deepCleanup ? 3 : 2, deepCleanup);
    
    if (!result.success) {
      console.warn('네이티브 메모리 최적화 실패:', result.error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    return false;
  }
}

/**
 * 가비지 컬렉션 힌트 제공
 */
export function suggestGarbageCollection(): void {
  if (window.gc) {
    window.gc();
  }
}

// 전역 네임스페이스에 노출 (디버깅 및 콘솔 접근용)
if (typeof window !== 'undefined') {
  window.__memoryOptimizer = {
    getMemoryInfo,
    optimizeMemory,
    suggestGarbageCollection,
    getMemoryUsagePercentage
  };
}

// 전역 인터페이스 확장
declare global {
  interface Window {
    gc?: () => void;
    __memoryOptimizer?: {
      [key: string]: any;
    };
  }
}
