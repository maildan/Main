/**
 * 가비지 컬렉션 유틸리티
 * 
 * 메모리 GC 및 최적화 기능을 제공합니다.
 */

import { OptimizationLevel, GCResult } from '../types';
import { MemoryInfo } from '@/types';
import { MEMORY_THRESHOLDS } from '../constants/memory-thresholds';
import { getMemoryUsage } from '../memory-info';
import { logInfo, logError } from '../../log-utils';

// 마지막 GC 시간 추적
let lastGCTime = 0;
const MIN_GC_INTERVAL = MEMORY_THRESHOLDS.MIN_GC_INTERVAL; // 30초

/**
 * 메모리 정보 확인 또는 생성
 */
export async function ensureMemoryInfo(): Promise<MemoryInfo> {
  try {
    const info = await getMemoryUsage();
    if (info) {
      return info;
    }
  } catch (error) {
    console.error('메모리 정보 가져오기 실패:', error);
  }

  // 오류 발생 시 기본값 반환
  return {
    heap_used: 0,
    heapUsed: 0,
    heap_total: 0,
    heapTotal: 0,
    heap_used_mb: 0,
    heapUsedMB: 0,
    rss: 0,
    rss_mb: 0,
    rssMB: 0,
    percent_used: 0,
    percentUsed: 0,
    heap_limit: 0,
    timestamp: Date.now()
  };
}

/**
 * 최적화 레벨 결정
 */
export function determineOptimizationLevel(info: MemoryInfo): OptimizationLevel {
  const usedMB = info.heap_used_mb;

  if (usedMB < MEMORY_THRESHOLDS.LOW) {
    return OptimizationLevel.None;
  } else if (usedMB < MEMORY_THRESHOLDS.MEDIUM) {
    return OptimizationLevel.Low;
  } else if (usedMB < MEMORY_THRESHOLDS.HIGH) {
    return OptimizationLevel.Medium;
  } else if (usedMB < MEMORY_THRESHOLDS.CRITICAL) {
    return OptimizationLevel.High;
  } else {
    return OptimizationLevel.Extreme;
  }
}

/**
 * 기본 GC 수행
 */
export async function performGC(emergency: boolean = false): Promise<GCResult> {
  console.log(`[GC] ${emergency ? '긴급' : '기본'} 가비지 컬렉션 요청`);

  // 네이티브 GC 함수 호출 시도
  if (window.gc) {
    try {
      console.log('[GC] 네이티브 GC 함수 호출 시도');
      window.gc();
      console.log('[GC] 네이티브 GC 성공');

      return {
        success: true,
        freedMemory: 0, // 실제 해제된 메모리는 알 수 없음
        freedMB: 0,
        duration: 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[GC] 네이티브 GC 함수 호출 실패:', error);
    }
  }

  // GC를 유도하기 위한 대안 방법
  try {
    const memoryBefore = await ensureMemoryInfo();

    // 마지막 GC 이후 최소 간격 확인
    const now = Date.now();
    if (now - lastGCTime < MIN_GC_INTERVAL && !emergency) {
      console.warn(`[GC] 최소 간격(${MIN_GC_INTERVAL}ms) 내에 GC 요청, 생략됨`);
      return {
        success: false,
        freedMemory: 0,
        freedMB: 0,
        duration: 0,
        timestamp: now,
        error: '최소 GC 간격 내에 요청됨'
      };
    }

    console.log('[GC] 대체 GC 전략 시도');
    const startTime = performance.now();

    // 대규모 임시 메모리 할당 후 해제 (GC 유도)
    const size = emergency ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB or 10MB
    const tempArrays = [];

    // 여러 개의 큰 배열 생성
    const arrayCount = emergency ? 5 : 2;
    for (let i = 0; i < arrayCount; i++) {
      tempArrays.push(new Array(size).fill(0));
    }

    // 배열 해제
    tempArrays.length = 0;

    // 추가 GC 유도
    if (emergency) {
      // 추가 임시 객체 생성 및 해제
      for (let i = 0; i < 10; i++) {
        const tempObj = {};
        for (let j = 0; j < 1000; j++) {
          (tempObj as any)[`key_${j}`] = new Array(1000).fill(j);
        }
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 메모리 상태 다시 확인
    const memoryAfter = await ensureMemoryInfo();

    // 해제된 메모리 계산
    const freedMemory = Math.max(0, memoryBefore.heap_used - memoryAfter.heap_used);
    const freedMB = freedMemory / (1024 * 1024);

    // GC 시간 업데이트
    lastGCTime = now;

    console.log(`[GC] 메모리 해제됨: ${freedMB.toFixed(2)}MB, 소요시간: ${duration.toFixed(2)}ms`);

    return {
      success: true,
      freedMemory: freedMemory,
      freedMB: freedMB,
      duration,
      timestamp: now
    };
  } catch (error) {
    console.error('[GC] 대체 GC 전략 실패:', error);
    return {
      success: false,
      freedMemory: 0,
      freedMB: 0,
      duration: 0,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * GC 수행 횟수 및 마지막 GC 시간 조회 함수
 */
export function getGCStats() {
  return {
    lastGCTime,
    totalGCCalls: 0 // 실제 구현에서는 카운터 추가
  };
}

/**
 * 마지막 GC 시간 조회
 */
export function getLastGCTime(): number {
  return lastGCTime;
}

/**
 * 총 GC 수행 횟수 조회
 */
export function getTotalGCCount(): number {
  return 0; // 실제 구현에서는 카운터 추가
}

/**
 * 가비지 컬렉션 제안
 * @param emergency 긴급 모드 여부
 */
export async function suggestGC(emergency: boolean = false): Promise<GCResult> {
  const startTime = performance.now();
  const startMemory = getMemoryInfo();

  try {
    logInfo(`[GC] 가비지 컬렉션 제안${emergency ? ' (긴급)' : ''}`);

    // Chrome 디버깅 모드에서 gc() 함수 사용
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }

    // 대체 방법: 메모리 압력 생성
    else {
      // 메모리 압력 생성 (JS 엔진에 GC 힌트 제공)
      if (emergency) {
        createMemoryPressure();
      }
    }

    const endTime = performance.now();
    const endMemory = getMemoryInfo();

    const freedMemory = Math.max(0, startMemory.jsHeapSize - endMemory.jsHeapSize);
    const freedMB = freedMemory / (1024 * 1024);

    return {
      success: true,
      freedMemory,
      freedMB,
      duration: endTime - startTime,
      timestamp: Date.now()
    };
  } catch (error) {
    logError('[GC] 가비지 컬렉션 오류', error);

    return {
      success: false,
      freedMemory: 0,
      freedMB: 0,
      duration: performance.now() - startTime,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 메모리 정보 가져오기
 */
function getMemoryInfo(): { jsHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number; } {
  if (typeof window !== 'undefined' && (window.performance as any).memory) {
    const memory = (window.performance as any).memory;
    return {
      jsHeapSize: memory.usedJSHeapSize || 0,
      totalJSHeapSize: memory.totalJSHeapSize || 0,
      jsHeapSizeLimit: memory.jsHeapSizeLimit || 0
    };
  }

  return {
    jsHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0
  };
}

/**
 * 메모리 압력 생성 (GC 유도)
 */
function createMemoryPressure(): void {
  // 임시로 큰 배열 생성 후 삭제
  let arr = null;
  try {
    arr = new Array(1000000).fill(0).map(() => new Object());
  } catch (e) {
    // 오류 무시 (메모리 부족으로 인한 예외 가능성)
  }

  // 변수 참조 해제
  arr = null;
}
