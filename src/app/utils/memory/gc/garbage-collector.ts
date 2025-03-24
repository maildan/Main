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
 * 메모리 해제를 권장하는 함수
 * 실제 GC를 강제하지는 않지만, 힌트를 제공함
 */
export function suggestGarbageCollection(): void {
  try {
    // Kahan 합산으로 연산 효율성 높이기 (부동소수점 정확도 향상)
    let sum = 0;
    let c = 0; // 오차 보정 변수
    
    // 대형 배열 생성 및 삭제로 GC 유도 - 항상 하위 8MB만 활용
    if (!window.gc) {
      // 점진적 할당 및 해제로 GC 유도 (대량 할당보다 효율적)
      for (let i = 0; i < 4; i++) {
        // 타이밍에 따른 GC 최적화를 위해 단계별 할당 및 해제
        const arrays = [];
        
        // 첫 번째 단계: 여러 작은 배열 할당 (v8 엔진 뉴 스페이스 GC 유도)
        for (let j = 0; j < 10; j++) {
          arrays.push(new Uint8Array(50 * 1024)); // 50KB씩 할당
        }
        
        // 두 번째 단계: 중간 크기 할당 (2MB)
        arrays.push(new ArrayBuffer(2 * 1024 * 1024));
        
        // Kahan 합산 알고리즘 적용 (정확한 연산을 위해) - CPU 연산 사용
        for (let j = 0; j < 10000; j++) {
          const y = j - c;
          const t = sum + y;
          c = (t - sum) - y; // 손실된 하위 비트 캡처
          sum = t;
        }
        
        // 세 번째 단계: 모든 배열 참조 해제
        arrays.length = 0;
      }
    } else {
      // window.gc가 있는 경우 더 효율적인 GC 호출 패턴 적용
      window.gc();
      
      // 효과적인 최적화를 위해 잠시 대기 후 두 번째 GC 호출
      setTimeout(() => {
        try {
          if (window.gc) {
            window.gc();
          }
        } catch (e) {
          console.warn('두 번째 GC 호출 오류:', e);
        }
      }, 50);
    }
    
    // Electron IPC를 통한 메인 프로세스 GC 요청 (Electron 환경에서만)
    if (window.electronAPI && typeof window.electronAPI.requestGC === 'function') {
      window.electronAPI.requestGC();
      
      // 메인 프로세스에 GC 완료 알림
      setTimeout(() => {
        if (window.electronAPI && typeof window.electronAPI.rendererGCCompleted === 'function') {
          window.electronAPI.rendererGCCompleted({
            timestamp: Date.now(),
            success: true
          });
        }
      }, 100);
    }
  } catch (error) {
    console.warn('GC 제안 중 오류:', error);
  }
}

/**
 * 수동으로 가비지 컬렉션을 요청합니다.
 * @param {boolean} emergency - 긴급 모드 여부
 * @returns Promise<GCResult>
 */
export async function requestGC(emergency = false): Promise<GCResult> {
  try {
    // 작업 시작 시간 기록 (성능 측정용)
    const startTime = performance.now();
    
    // 메모리 정보 수집 (GC 전)
    const memoryBeforeData = await getMemoryUsage();
    // MemoryUsageInfo를 MemoryInfo로 변환하여 타입 호환성 보장
    const memoryBefore = ensureMemoryInfo(memoryBeforeData);
    
    // 최적화 수준 결정
    const optimizationLevel = determineOptimizationLevel(memoryBefore);
    
    // 최적화 수준에 따른 처리
    if (optimizationLevel > 0 || emergency) {
      // 주의 또는 경고 단계라면 추가 최적화 수행
      await performOptimizationByLevel(optimizationLevel, emergency);
    }
    
    // 브라우저 창 객체를 통한 메모리 힌트
    if (window.gc) {
      window.gc();
      // 긴급 상황이거나 높은 최적화 수준인 경우 두 번째 GC 유도
      if (emergency || optimizationLevel >= 2) {
        await new Promise(resolve => setTimeout(resolve, 100));
        window.gc();
      }
    } else {
      // GC가 직접 노출되지 않은 경우 간접 GC 유도
      await induceGarbageCollection(emergency);
    }
    
    // Electron API를 통한 GC 요청 - 메인 프로세스에서도 GC 수행
    if (window.electronAPI && typeof window.electronAPI.requestGC === 'function') {
      await window.electronAPI.requestGC();
    }
    
    // 메모리 정보 다시 수집 (GC 이후) - 충분한 시간을 두고 측정해야 정확함
    await new Promise(resolve => setTimeout(resolve, emergency ? 200 : 100));
    const memoryAfterData = await getMemoryUsage();
    // 마찬가지로 타입 변환
    const memoryAfter = ensureMemoryInfo(memoryAfterData);
    
    // 해제된 메모리 계산
    const freedMemory = memoryBefore.heapUsed - memoryAfter.heapUsed;
    const freedMB = Math.round(freedMemory / (1024 * 1024) * 100) / 100;
    
    // 작업 완료 시간 측정
    const duration = Math.round(performance.now() - startTime);
    
    // 다음 GC 호출 최적화를 위한 통계 기록 (선택적)
    updateGCStats(freedMB, duration, emergency);
    
    // 최종 GC 결과 반환
    const result: GCResult = {
      success: true,
      memoryBefore,
      memoryAfter,
      freedMemory,
      freedMB,
      timestamp: Date.now(),
      // 추가 정보는 별도로 처리
      error: undefined
    };
    
    // ExtendedGCResult로 캐스팅하여 추가 속성 설정
    (result as ExtendedGCResult).duration = duration;
    (result as ExtendedGCResult).optimizationLevel = optimizationLevel;
    
    return result;
  } catch (error) {
    console.error('GC 요청 오류:', error);
    return {
      success: false,
      timestamp: Date.now(),
      error: String(error)
    };
  }
}

/**
 * GC 통계 업데이트 (자가 학습용)
 */
function updateGCStats(freedMB: number, duration: number, emergency: boolean): void {
  try {
    // 자가 학습 로직 추가 가능
  } catch (error) {
    console.warn('GC 통계 업데이트 중 오류:', error);
  }
}

/**
 * 가비지 컬렉션 간접 유도 (gc가 노출되지 않은 경우)
 */
export async function induceGarbageCollection(emergency: boolean): Promise<void> {
  return new Promise(resolve => {
    // 메모리 압박을 통한 GC 유도 전략
    const arrays: any[] = [];
    const iterations = emergency ? 5 : 3;
    
    // 여러 단계의 할당 및 해제로 다양한 GC 유형 유도
    const induceGCStep = (step: number) => {
      if (step >= iterations) {
        arrays.length = 0;
        resolve();
        return;
      }
      
      // 메모리 할당
      for (let i = 0; i < 10; i++) {
        arrays.push(new Uint8Array(1024 * 1024)); // 1MB씩 할당
        
        // 추가적인 메모리 압박을 위한 객체 속성 추가
        const obj: Record<string, string> = {};
        for (let j = 0; j < 1000; j++) {
          obj[`prop_${j}`] = `value_${j}`;
        }
        arrays.push(obj);
      }
      
      // 대기 후 다음 단계 진행 (타이밍이 GC 유도에 중요)
      setTimeout(() => {
        arrays.length = 0; // 참조 해제
        
        // 다음 단계로 진행
        setTimeout(() => induceGCStep(step + 1), 50);
      }, 50);
    };
    
    // GC 유도 시작
    induceGCStep(0);
  });
}
