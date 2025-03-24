/**
 * 가비지 컬렉션 관련 기능 모듈
 */
import { GCResult, MemoryInfo, ExtendedGCResult } from '../types';
import { MEMORY_THRESHOLDS } from '../constants/memory-thresholds';
import { getMemoryUsage } from '../memory-info';
import { performOptimizationByLevel } from './optimization-controller';

/**
 * MemoryUsageInfo를 MemoryInfo로 변환
 * timestamp가 항상 존재하도록 보장
 */
export function ensureMemoryInfo(memoryData: any): MemoryInfo {
  // 기본값이 있는 객체 생성 (요구사항 1: timestamp 보장)
  return {
    timestamp: memoryData.timestamp || Date.now(),
    heapUsed: memoryData.heapUsed || 0,
    heapTotal: memoryData.heapTotal || 0,
    heapUsedMB: memoryData.heapUsedMB || 0,
    percentUsed: memoryData.percentUsed || 0,
    heapLimit: memoryData.heapLimit
  };
}

/**
 * 메모리 사용량 임계값에 따른 최적화 수준 결정
 * @param memoryInfo 현재 메모리 정보
 * @returns 최적화 수준 (0-3: 정상, 주의, 경고, 위험)
 */
export function determineOptimizationLevel(memoryInfo: MemoryInfo): number {
  const heapUsed = memoryInfo.heapUsed;
  
  // 임계값 기반 최적화 수준 결정
  if (heapUsed > MEMORY_THRESHOLDS.CRITICAL) return 3;  // 위험 단계 (최대 수준 최적화)
  if (heapUsed > MEMORY_THRESHOLDS.HIGH) return 2;      // 경고 단계 (고수준 최적화)
  if (heapUsed > MEMORY_THRESHOLDS.MEDIUM) return 1;    // 주의 단계 (중간 수준 최적화)
  if (heapUsed > MEMORY_THRESHOLDS.LOW) return 0.5;     // 관찰 단계 (경량 최적화)
  return 0;                                             // 정상 단계 (최적화 필요 없음)
}

/**
 * 가비지 컬렉션 제안
 * 브라우저에게 GC를 수행하도록 힌트 제공
 */
export function suggestGarbageCollection(): void {
  try {
    // 1. 메모리 단편화 완화를 위한 작은 객체 생성/해제
    const temp = [];
    for (let i = 0; i < 100; i++) {
      temp.push(new ArrayBuffer(1024));
    }
    temp.length = 0;
    
    // 2. window.gc가 지원되는 경우 (Chrome에서 --js-flags='--expose-gc' 옵션 필요)
    if (typeof window.gc === 'function') {
      window.gc();
    }
    
    console.log('가비지 컬렉션 제안됨');
  } catch (error) {
    console.warn('가비지 컬렉션 제안 중 오류:', error);
  }
}

/**
 * 가비지 컬렉션 강제 유도
 * 여러 기법을 사용하여 GC 유도
 */
export function induceGarbageCollection(): void {
  try {
    // 1. 대형 배열 생성 후 해제
    let arr = new Array(1000000).fill(Math.random());
    arr = null;
    
    // 2. 순환 참조 객체 생성 후 해제
    let obj1: any = {};
    let obj2: any = {};
    obj1.ref = obj2;
    obj2.ref = obj1;
    obj1 = null;
    obj2 = null;
    
    // 3. 빈 객체 반복 생성/해제
    for (let i = 0; i < 1000; i++) {
      const o = {};
      void(o);
    }
    
    // 4. window.gc 호출 (지원되는 경우)
    if (typeof window.gc === 'function') {
      window.gc();
    }
    
    console.log('가비지 컬렉션 유도됨');
  } catch (error) {
    console.warn('가비지 컬렉션 유도 중 오류:', error);
  }
}

/**
 * 가비지 컬렉션 요청
 * Electron IPC를 통한 GC 요청 또는 브라우저 내장 GC 힌트
 * @param emergency 긴급 GC 여부
 */
export async function requestGC(emergency: boolean = false): Promise<GCResult> {
  try {
    console.log(`${emergency ? '긴급' : '일반'} 가비지 컬렉션 요청`);
    
    // 마지막 GC 요청 후 충분한 시간이 지났는지 확인 (너무 자주 호출하면 성능 저하)
    const now = Date.now();
    if (!emergency && now - lastGCTime < MIN_GC_INTERVAL) {
      console.log(`GC 호출 간격이 너무 짧습니다 (${now - lastGCTime}ms). 건너뜁니다.`);
      return {
        success: false,
        timestamp: now,
        freedMemory: 0,
        freedMB: 0,
        error: 'GC 호출 간격이 너무 짧습니다'
      };
    }
    
    // 메모리 GC 전 상태 저장
    const memoryBefore = await getMemoryUsage();
    
    // 1. Electron API 통해 GC 요청 (지원되는 경우)
    if (window.electronAPI && window.electronAPI.requestGC) {
      await window.electronAPI.requestGC(emergency);
    }
    
    // 2. 자체 GC 유도 로직 실행
    if (emergency) {
      induceGarbageCollection();
    } else {
      suggestGarbageCollection();
    }
    
    // GC 실행 후 잠시 대기 (GC가 완료될 시간 제공)
    await new Promise(resolve => setTimeout(resolve, emergency ? 300 : 150));
    
    // 메모리 GC 후 상태 확인
    const memoryAfter = await getMemoryUsage();
    
    // 메모리 해제량 계산
    const freedMemory = memoryBefore && memoryAfter 
      ? memoryBefore.heapUsed - memoryAfter.heapUsed 
      : 0;
    
    const freedMB = freedMemory > 0
      ? Math.round(freedMemory / (1024 * 1024) * 100) / 100
      : 0;
    
    // 마지막 GC 시간 업데이트
    lastGCTime = now;
    
    return {
      success: true,
      timestamp: now,
      freedMemory: freedMemory > 0 ? freedMemory : 0,
      freedMB: freedMB > 0 ? freedMB : 0
    };
  } catch (error) {
    console.error('GC 요청 중 오류:', error);
    return {
      success: false,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      error: String(error)
    };
  }
}

/**
 * 메모리 상태에 따른 최적화 수준 결정
 * @param memory 현재 메모리 상태
 * @returns 최적화 수준 (0-4)
 */
export function determineOptimizationLevel(memory: any): number {
  try {
    // 메모리 정보가 없는 경우 기본값 반환
    if (!memory) return 2; // 기본적으로 중간 수준
    
    // 메모리 사용률에 따른 최적화 수준 결정
    const percentUsed = memory.percentUsed || memory.percent_used || 0;
    
    if (percentUsed > 90) return 4; // 극단적 수준
    if (percentUsed > 80) return 3; // 높은 수준
    if (percentUsed > 65) return 2; // 중간 수준
    if (percentUsed > 50) return 1; // 낮은 수준
    return 0; // 최적화 불필요
  } catch (error) {
    console.warn('최적화 수준 결정 중 오류:', error);
    return 2; // 오류 발생 시 중간 수준 반환
  }
}

/**
 * 메모리 정보 유효성 보장
 * 누락된 필드가 있는 경우 기본값으로 채움
 * @param memory 메모리 정보 객체
 * @returns 완전한 메모리 정보
 */
export function ensureMemoryInfo(memory: any): any {
  if (!memory) return {
    heapUsed: 0,
    heapTotal: 0,
    heapUsedMB: 0,
    percentUsed: 0,
    timestamp: Date.now()
  };
  
  return {
    heapUsed: memory.heapUsed || memory.heap_used || 0,
    heapTotal: memory.heapTotal || memory.heap_total || 0,
    heapUsedMB: memory.heapUsedMB || memory.heap_used_mb || 0,
    percentUsed: memory.percentUsed || memory.percent_used || 0,
    timestamp: memory.timestamp || Date.now()
  };
}
