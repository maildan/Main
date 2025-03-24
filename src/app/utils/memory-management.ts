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
import { normalizeMemoryInfo, createDefaultMemoryInfo } from './memory/format-utils';
import { MemoryEventType, logMemoryUsage } from './memory/logger';

// 폴백 상태 추적
const state = {
  inFallbackMode: false,
  lastFailure: 0,
  failureCount: 0
};

/**
 * 네이티브 모듈 가용성 확인
 * @param silent 조용한 모드 (콘솔 출력 없음)
 * @returns 가용성 여부
 */
export async function checkNativeAvailability(silent: boolean = false): Promise<boolean> {
  try {
    // 네이티브 모듈 API 상태 확인
    const response = await fetch('/api/native/status');
    
    if (!response.ok) {
      if (!silent) console.warn('네이티브 모듈 API 사용 불가능');
      return false;
    }
    
    const { available, fallbackMode } = await response.json();
    
    if (!available || fallbackMode) {
      if (!silent) console.warn('네이티브 모듈이 폴백 모드이거나 사용 불가능');
      return false;
    }
    
    return true;
  } catch (error) {
    if (!silent) console.error('네이티브 모듈 가용성 확인 중 오류:', error);
    return false;
  }
}

/**
 * 실패 기록
 * @param type 실패 유형
 * @param reason 실패 이유
 */
function recordFailure(type: string, reason: string): void {
  state.failureCount++;
  state.lastFailure = Date.now();
  
  console.warn(`네이티브 모듈 실패 기록 (${type}): ${reason}, 총 ${state.failureCount}회`);
  
  // 실패 내역 로그로 저장
  logMemoryUsage(
    MemoryEventType.ERROR,
    `네이티브 모듈 실패 (${type}): ${reason}`
  ).catch(e => console.error('로깅 오류:', e));
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

/**
 * 자동 폴백 기능이 있는 메모리 최적화 수행
 * @param level 최적화 레벨
 * @param emergency 긴급 모드 여부
 * @returns Promise<OptimizationResult> 최적화 결과
 */
export async function optimizeMemoryWithFallback(
  level: OptimizationLevel = OptimizationLevel.MEDIUM,
  emergency: boolean = false
): Promise<OptimizationResult> {
  // 최적화 시작 시간 기록
  const startTime = Date.now();
  let error: string | undefined;
  
  try {
    // 현재 메모리 상태 확인
    const memoryBeforeRaw = await requestNativeMemoryInfo() || createDefaultMemoryInfo();
    const memoryBefore = normalizeMemoryInfo(memoryBeforeRaw);
    
    console.log(`메모리 최적화 시작 (레벨: ${level}, 긴급: ${emergency}), 현재 사용량: ${memoryBefore.heap_used_mb.toFixed(2)}MB`);
    
    // 네이티브 모듈 호출
    const nativeLevel = toNativeOptimizationLevel(level);
    const result = await requestNativeMemoryOptimization(nativeLevel, emergency);
    
    if (!result) {
      throw new Error('네이티브 메모리 최적화 실패 (결과 없음)');
    }
    
    // 성공 기록
    recordOptimization(
      level, 
      true, 
      'native', 
      result.freed_mb
    );
    
    // 최적화 완료 로깅
    await logMemoryUsage(
      MemoryEventType.OPTIMIZATION,
      `메모리 최적화 완료 (네이티브): 레벨 ${level}, ${result.freed_mb || 0}MB 해제`
    );
    
    return result;
  } catch (finalError) {
    // 모든 시도 실패 시
    const errorMsg = finalError instanceof Error ? finalError.message : String(finalError);
    console.error('모든 메모리 최적화 시도 실패:', errorMsg);
    
    // 실패 로깅
    await logMemoryUsage(MemoryEventType.ERROR, `메모리 최적화 실패: ${errorMsg}`);
    
    // 기본 실패 결과 반환
    return {
      success: false,
      optimization_level: level,
      memory_before: undefined,
      memory_after: undefined,
      freed_memory: 0,
      freed_mb: 0,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
      error: errorMsg
    };
  }
}

/**
 * 자동 폴백 기능이 있는 가비지 컬렉션 수행
 * @param emergency 긴급 모드 여부
 * @returns Promise<GCResult> GC 결과
 */
export async function collectGarbageWithFallback(emergency: boolean = false): Promise<GCResult> {
  const startTime = Date.now();
  
  try {
    console.log(`가비지 컬렉션 요청 (긴급: ${emergency})`);
    
    // 네이티브 GC 요청
    const result = await requestNativeGarbageCollection();
    
    if (!result) {
      throw new Error('네이티브 가비지 컬렉션 실패 (결과 없음)');
    }
    
    // 성공 로깅
    await logMemoryUsage(
      MemoryEventType.GC,
      `가비지 컬렉션 완료 (네이티브): ${result.freed_mb || 0}MB 해제`
    );
    
    return result;
  } catch (error) {
    // GC 실패 시
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('가비지 컬렉션 실패:', errorMsg);
    
    // 브라우저 GC 힌트 제공 (폴백)
    if (window.gc) {
      window.gc();
    }
    
    // 실패 로깅
    await logMemoryUsage(MemoryEventType.ERROR, `가비지 컬렉션 실패: ${errorMsg}`);
    
    // 기본 실패 결과 반환
    return {
      success: false,
      freed_memory: 0,
      freed_mb: 0,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
      error: errorMsg
    };
  }
}
