/**
 * 성능 측정 유틸리티
 * 
 * 이 모듈은 네이티브 모듈과 JavaScript 구현 간의 성능을 비교하기 위한
 * 도구를 제공합니다. 측정 결과는 로그와 대시보드에 표시될 수 있습니다.
 */

import { OptimizationLevel as AppOptimizationLevel } from '@/types';
import { OptimizationLevel as NativeOptimizationLevel } from '@/types/native-module';
import { toNativeOptimizationLevel } from './enum-converters';
import { requestNativeMemoryOptimization } from './native-memory-bridge';
import { internalOptimizeMemory } from './memory/optimizer';
import { getMemoryInfo } from './memory/memory-info';
import { getNativeModuleStatus } from './nativeModuleClient';

// 성능 측정 결과 인터페이스
export interface PerformanceResult {
  operationName: string;
  nativeImplementation: {
    executionTime: number;
    success: boolean;
    error?: string;
  };
  jsImplementation: {
    executionTime: number;
    success: boolean;
    error?: string;
  };
  speedupFactor: number;
  timestamp: number;
  memoryBefore: any;
  memoryAfter: any;
  memoryDifference: number;
}

// 성능 측정 이력
const performanceHistory: PerformanceResult[] = [];

/**
 * 메모리 최적화 성능 비교 실행
 * @param level 최적화 레벨
 * @param emergency 긴급 모드 여부
 * @returns Promise<PerformanceResult> 성능 측정 결과
 */
export async function benchmarkMemoryOptimization(
  level: AppOptimizationLevel = AppOptimizationLevel.MEDIUM,
  emergency: boolean = false
): Promise<PerformanceResult> {
  // 초기 메모리 상태 기록
  const memoryBefore = getMemoryInfo() || { heapUsedMB: 0 };
  
  // 네이티브 구현 테스트
  let nativeResult = {
    executionTime: 0,
    success: false,
    error: undefined as string | undefined
  };
  
  // 네이티브 모듈 사용 가능 여부 확인
  const { available } = await getNativeModuleStatus();
  
  if (available) {
    try {
      const nativeStartTime = performance.now();
      // 명시적 변환 함수 사용
      const nativeLevel = toNativeOptimizationLevel(level);
      await requestNativeMemoryOptimization(nativeLevel, emergency);
      const nativeEndTime = performance.now();
      
      nativeResult = {
        executionTime: nativeEndTime - nativeStartTime,
        success: true,
        error: undefined
      };
    } catch (error) {
      nativeResult.error = error instanceof Error ? error.message : '알 수 없는 오류';
    }
  } else {
    nativeResult.error = '네이티브 모듈을 사용할 수 없습니다';
  }
  
  // 자바스크립트 구현 테스트 전 중간 메모리 상태
  const memoryMiddle = getMemoryInfo();
  
  // 자바스크립트 구현 테스트
  let jsResult = {
    executionTime: 0,
    success: false,
    error: undefined as string | undefined
  };
  
  try {
    const jsStartTime = performance.now();
    await internalOptimizeMemory(emergency);
    const jsEndTime = performance.now();
    
    jsResult = {
      executionTime: jsEndTime - jsStartTime,
      success: true,
      error: undefined
    };
  } catch (error) {
    jsResult.error = error instanceof Error ? error.message : '알 수 없는 오류';
  }
  
  // 최종 메모리 상태 기록
  const memoryAfter = getMemoryInfo() || { heapUsedMB: 0 };
  
  // 성능 비교 결과 계산
  const speedupFactor = jsResult.success && nativeResult.success && nativeResult.executionTime > 0
    ? jsResult.executionTime / nativeResult.executionTime
    : 0;
  
  // 메모리 차이 계산 (MB 단위)
  const memoryDifference = (memoryBefore?.heapUsedMB ?? 0) - (memoryAfter?.heapUsedMB ?? 0);
  
  // 결과 객체 생성
  const result: PerformanceResult = {
    operationName: `Memory Optimization (Level ${level}, Emergency: ${emergency})`,
    nativeImplementation: nativeResult,
    jsImplementation: jsResult,
    speedupFactor,
    timestamp: Date.now(),
    memoryBefore,
    memoryAfter,
    memoryDifference
  };
  
  // 이력에 추가
  performanceHistory.push(result);
  if (performanceHistory.length > 50) {
    performanceHistory.shift(); // 최대 50개 항목 유지
  }
  
  // 결과 로깅
  logPerformanceResult(result);
  
  return result;
}

/**
 * 성능 측정 결과 로깅
 * @param result 성능 측정 결과
 */
function logPerformanceResult(result: PerformanceResult): void {
  console.group('🔍 성능 비교 결과');
  console.log(`작업: ${result.operationName}`);
  console.log(`시간: ${new Date(result.timestamp).toLocaleTimeString()}`);
  
  console.group('⚙️ 네이티브 구현');
  console.log(`실행 시간: ${result.nativeImplementation.executionTime.toFixed(2)}ms`);
  console.log(`성공 여부: ${result.nativeImplementation.success ? '✅' : '❌'}`);
  if (result.nativeImplementation.error) {
    console.error(`오류: ${result.nativeImplementation.error}`);
  }
  console.groupEnd();
  
  console.group('🔧 JavaScript 구현');
  console.log(`실행 시간: ${result.jsImplementation.executionTime.toFixed(2)}ms`);
  console.log(`성공 여부: ${result.jsImplementation.success ? '✅' : '❌'}`);
  if (result.jsImplementation.error) {
    console.error(`오류: ${result.jsImplementation.error}`);
  }
  console.groupEnd();
  
  if (result.speedupFactor > 0) {
    console.log(`⚡ 속도 향상: ${result.speedupFactor.toFixed(2)}x ${result.speedupFactor > 1 ? '(네이티브가 더 빠름)' : '(JS가 더 빠름)'}`);
  }
  
  console.log(`💾 메모리 차이: ${result.memoryDifference.toFixed(2)}MB ${result.memoryDifference > 0 ? '감소' : '증가'}`);
  console.groupEnd();
}

/**
 * 성능 측정 이력 가져오기
 * @returns 성능 측정 이력 배열
 */
export function getPerformanceHistory(): PerformanceResult[] {
  return [...performanceHistory];
}

/**
 * 메모리 최적화 작업에 대한 벤치마크 실행
 * 모든 최적화 레벨에 대해 성능 측정을 실행합니다.
 */
export async function runComprehensiveBenchmark(): Promise<PerformanceResult[]> {
  const results: PerformanceResult[] = [];
  
  // 모든 최적화 레벨에 대해 테스트
  for (let level = 0; level <= 4; level++) {
    results.push(await benchmarkMemoryOptimization(level as AppOptimizationLevel, false));
    // 테스트 간 간격을 두어 이전 테스트의 영향 최소화
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 긴급 모드 테스트
  results.push(await benchmarkMemoryOptimization(AppOptimizationLevel.EXTREME, true));
  
  // 종합 결과 로깅
  console.group('📊 종합 벤치마크 결과');
  console.log(`총 ${results.length}개 테스트 실행됨`);
  
  const avgSpeedup = results.reduce((sum, r) => sum + r.speedupFactor, 0) / results.length;
  console.log(`평균 속도 향상: ${avgSpeedup.toFixed(2)}x`);
  
  console.log(`최고 속도 향상: ${Math.max(...results.map(r => r.speedupFactor)).toFixed(2)}x`);
  console.log(`총 해제된 메모리: ${results.reduce((sum, r) => sum + r.memoryDifference, 0).toFixed(2)}MB`);
  console.groupEnd();
  
  return results;
}
