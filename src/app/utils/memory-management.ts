/**
 * 메모리 관리 유틸리티
 * 
 * 이 모듈은 네이티브 메모리 최적화 모듈과 애플리케이션 간의 인터페이스를 제공합니다.
 * 모든 메모리 최적화 작업은 Rust 네이티브 모듈을 통해 처리됩니다.
 */

import { OptimizationLevel } from '@/types';
import { MemoryInfo, OptimizationResult, GCResult } from '@/types';
import { requestNativeMemoryOptimization, requestNativeGarbageCollection, requestNativeMemoryInfo } from './native-memory-bridge';
import { toNativeOptimizationLevel } from './enum-converters';
import { MemoryEventType, logMemoryUsage } from './memory/logger';

// 폴백 상태 추적
const state = {
  inFallbackMode: false,
  lastFailure: 0,
  failureCount: 0
};

/**
 * 메모리 정보 가져오기
 */
export async function getMemoryInfo(): Promise<MemoryInfo | null> {
  try {
    return await requestNativeMemoryInfo();
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return null;
  }
}

/**
 * 가비지 컬렉션 수행
 * @param emergency 긴급 모드 여부
 */
export async function performGarbageCollection(emergency: boolean = false): Promise<GCResult | null> {
  try {
    return await requestNativeGarbageCollection();
  } catch (error) {
    console.error('가비지 컬렉션 오류:', error);
    return null;
  }
}

/**
 * 메모리 최적화 수행
 * @param level 최적화 레벨
 * @param emergency 긴급 모드 여부
 */
export async function optimizeMemory(
  level: OptimizationLevel = OptimizationLevel.MEDIUM,
  emergency: boolean = false
): Promise<OptimizationResult | null> {
  try {
    // 현재 메모리 상태 기록
    const memoryBefore = await requestNativeMemoryInfo();
    
    console.log(`메모리 최적화 시작 (레벨: ${level}, 긴급: ${emergency})`);
    
    // 네이티브 모듈 호출
    const result = await requestNativeMemoryOptimization(level, emergency);
    
    if (result) {
      // 속성 이름 호환성 처리 - freed_mb 사용 (인터페이스와 일치)
      const freedMB = result.freed_mb || 0;
      recordOptimization(level, result.success, 'native', freedMB);
    }
    
    return result;
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    return null;
  }
}

/**
 * 최적화 기록
 * @param level 최적화 레벨
 * @param success 성공 여부
 * @param implementation 구현 ('native' 또는 'js')
 * @param freedMemory 해제된 메모리 (MB)
 */
function recordOptimization(
  level: OptimizationLevel, 
  success: boolean,
  implementation: 'native' | 'js',
  freedMemory?: number
): void {
  console.log(
    `메모리 최적화 완료 (${implementation}): ` +
    `레벨 ${level}, ${success ? '성공' : '실패'}, ${freedMemory || 0}MB 해제`
  );
  
  // 최적화 내역 로그로 저장
  logMemoryUsage(
    MemoryEventType.OPTIMIZATION,
    `메모리 최적화 (${implementation}): 레벨 ${level}, ${freedMemory || 0}MB 해제`
  ).catch(e => console.error('로깅 오류:', e));
}
