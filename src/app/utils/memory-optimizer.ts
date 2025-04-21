/**
 * 메모리 최적화 조정자 (Orchestrator)
 *
 * 이 모듈은 메모리 최적화의 상위 레벨 인터페이스를 제공하고,
 * 실제 최적화 작업은 memory/ 하위 모듈에 위임합니다.
 */

import { OptimizationLevel, OptimizationResult } from '@/types';
import * as memoryInfo from './memory/memory-info';
import * as optimizationUtils from './memory/optimization-utils';
import { suggestGC as performGarbageCollection } from './memory/gc/garbage-collector';
import { logger } from './memory/logger';

/**
 * 메모리 최적화를 실행합니다.
 *
 * @param level - 최적화 레벨 (기본값: 'medium')
 * @param emergency - 긴급 상황 여부
 * @returns 최적화 결과
 */
export async function optimizeMemory(
  level: OptimizationLevel = OptimizationLevel.MEDIUM,
  emergency: boolean = false
): Promise<OptimizationResult> {
  try {
    logger.info(
      `[Memory Optimizer] Starting memory optimization at level: ${level}, emergency: ${emergency}`
    );

    // 현재 메모리 사용량 확인
    const beforeMemory = await memoryInfo.getMemoryUsage();

    // 최적화 실행
    const _result = await optimizationUtils.runOptimization(level, emergency);

    // 가비지 컬렉션 실행
    await performGarbageCollection(emergency);

    // 최적화 후 메모리 사용량 확인
    const afterMemory = await memoryInfo.getMemoryUsage();

    // 해제된 메모리 계산 (null 체크 추가)
    const memoryFreed =
      beforeMemory &&
      afterMemory &&
      beforeMemory.heapUsed !== undefined &&
      afterMemory.heapUsed !== undefined
        ? beforeMemory.heapUsed - afterMemory.heapUsed
        : 0;

    logger.info(`[Memory Optimizer] Memory optimization completed. Freed: ${memoryFreed} bytes`);

    // OptimizationResult 인터페이스에 맞게 결과 반환
    return {
      optimizationLevel: level,
      timestamp: Date.now(),
      freedMemory: memoryFreed,
      freedMB: memoryFreed / (1024 * 1024),
      success: true,
      // 하위 호환성을 위한 snake_case 버전
      optimization_level: level,
      freed_memory: memoryFreed,
      freed_mb: memoryFreed / (1024 * 1024),
    };
  } catch (error) {
    logger.error(
      '[Memory Optimizer] Error during memory optimization:',
      error instanceof Error
        ? ({ message: error.message, stack: error.stack } as Record<string, unknown>)
        : {}
    );

    // OptimizationResult 인터페이스에 맞게 에러 결과 반환
    return {
      optimizationLevel: level,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      // 하위 호환성을 위한 snake_case 버전
      optimization_level: level,
      freed_memory: 0,
      freed_mb: 0,
    };
  }
}

/**
 * 자동 메모리 최적화 설정을 구성합니다.
 *
 * @param options - 자동 최적화 설정
 */
export function configureAutoOptimization(options: {
  enabled: boolean;
  interval?: number;
  threshold?: number;
}): void {
  optimizationUtils.configureAutoOptimization(options);
}

/**
 * 현재 메모리 상태를 확인하고 필요 시 최적화를 수행합니다.
 */
export async function checkAndOptimizeMemory(): Promise<void> {
  try {
    const memoryUsage = await memoryInfo.getMemoryUsage();
    await optimizationUtils.runOptimization(OptimizationLevel.MEDIUM, false);
  } catch (error) {
    logger.error(
      '[Memory Optimizer] Error during memory check and optimize:',
      error instanceof Error ? { message: error.message, stack: error.stack } : {}
    );
  }
}

/**
 * 메모리 사용량 분석 및 보고
 */
export async function analyzeMemoryUsage(): Promise<{
  used: number;
  total: number;
  percent: number;
  needsOptimization: boolean;
}> {
  try {
    const memory = await memoryInfo.getMemoryUsage();

    if (!memory) {
      return {
        used: 0,
        total: 0,
        percent: 0,
        needsOptimization: false,
      };
    }

    const percent =
      memory.percentUsed ||
      (memory.heapTotal && memory.heapUsed ? (memory.heapUsed / memory.heapTotal) * 100 : 0);

    return {
      used: memory.heapUsedMB || 0,
      total: memory.heapTotal ? memory.heapTotal / (1024 * 1024) : 0,
      percent,
      needsOptimization: percent > 75,
    };
  } catch (error) {
    logger.error(
      '[Memory Optimizer] Error analyzing memory usage:',
      error instanceof Error ? ({ message: error.message } as Record<string, unknown>) : {}
    );

    return {
      used: 0,
      total: 0,
      percent: 0,
      needsOptimization: false,
    };
  }
}
