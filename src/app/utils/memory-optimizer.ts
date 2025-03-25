/**
 * 메모리 최적화 유틸리티
 * 
 * 모든 메모리 최적화 작업은 네이티브 모듈을 통해 처리됩니다.
 */

import { getMemoryInfo as getNativeMemoryInfo, optimizeMemory as performNativeOptimization } from './nativeModuleClient';
import { OptimizationLevel } from '@/types';
import { convertNativeMemoryInfo } from './enum-converters';

// 메모리 최적화 설정 인터페이스 유지(호환성)
export interface MemoryOptimizerOptions {
  threshold?: number;
  checkInterval?: number;
  showWarnings?: boolean;
  autoOptimize?: boolean;
  debug?: boolean;
}

/**
 * 메모리 정보 가져오기
 */
export async function getMemoryInfo() {
  try {
    const response = await getNativeMemoryInfo();
    
    if (!response.success || !response.memoryInfo) {
      console.warn('네이티브 메모리 정보 가져오기 실패:', response.error);
      return null;
    }
    
    // 필드 이름 호환성을 위해 변환
    return convertNativeMemoryInfo(response.memoryInfo);
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return null;
  }
}

/**
 * 메모리 최적화 수행
 * @param level 최적화 레벨 (0-4)
 * @param emergency 긴급 상황 여부
 */
export async function optimizeMemory(level = OptimizationLevel.MEDIUM, emergency = false) {
  try {
    const result = await performNativeOptimization(level, emergency);
    
    // 필드 이름 호환성 처리
    if (result.success && result.result) {
      result.result.freedMB = result.result.freed_mb;
      result.result.freedMemory = result.result.freed_memory;
    }
    
    return result;
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * 가비지 컬렉션 제안
 */
export function suggestGarbageCollection() {
  if (window.gc) {
    window.gc();
  }
}

// 전역 네임스페이스에 노출 (디버깅 및 콘솔 접근용)
if (typeof window !== 'undefined') {
  window.__memoryOptimizer = {
    ...window.__memoryOptimizer,
    getMemoryInfo,
    optimizeMemory,
    suggestGarbageCollection
  };
}
