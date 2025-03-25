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
 * @param level 최적화 레벨 (필수 매개변수로 변경)
 * @param emergency 긴급 모드 여부
 */
export async function optimizeMemory(
  level: OptimizationLevel,
  emergency: boolean = false
): Promise<any> {
  try {
    // 타입 오류 수정: level 타입을 as unknown as OptimizationLevel | undefined로 변환
    const result = await performNativeOptimization(level as any, emergency);
    
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

// 함수 시그니처 통일을 위한 어댑터 함수 추가
export async function optimizeMemoryByAggressiveness(aggressive: boolean): Promise<any> {
  // aggressive 매개변수를 적절한 최적화 레벨로 변환
  const level = aggressive ? OptimizationLevel.HIGH : OptimizationLevel.MEDIUM;
  return optimizeMemory(level, aggressive);
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
  // __memoryOptimizer 객체가 없으면 생성
  if (!window.__memoryOptimizer) {
    window.__memoryOptimizer = {};
  }
  
  // optimizeMemory 함수를 어댑터 함수로 할당
  window.__memoryOptimizer.optimizeMemory = optimizeMemoryByAggressiveness;
  
  window.__memoryOptimizer = {
    ...window.__memoryOptimizer,
    getMemoryInfo,
    suggestGarbageCollection
  };
}
