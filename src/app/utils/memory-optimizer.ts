/**
 * 메모리 최적화 조정자 (Orchestrator)
 * 
 * 이 모듈은 메모리 최적화의 상위 레벨 인터페이스를 제공하고,
 * 실제 최적화 작업은 memory/optimization-utils.ts와 gc/ 하위 모듈에 위임합니다.
 */

import { OptimizationLevel, OptimizationResult } from '../../types';
import * as memoryInfo from './memory/memory-info';
import * as optimizationUtils from './memory/optimization-utils';
import { performGarbageCollection } from './memory/gc/garbage-collector';
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
    logger.info(`[Memory Optimizer] Starting memory optimization at level: ${level}, emergency: ${emergency}`);
    
    // 현재 메모리 사용량 확인
    const beforeMemory = await memoryInfo.getMemoryUsage();
    
    // 최적화 실행
    const result = await optimizationUtils.runOptimization(level, emergency);
    
    // 가비지 컬렉션 실행
    await performGarbageCollection(emergency);
    
    // 최적화 후 메모리 사용량 확인
    const afterMemory = await memoryInfo.getMemoryUsage();
    
    // 해제된 메모리 계산
    const memoryFreed = beforeMemory.heapUsed - afterMemory.heapUsed;
    
    logger.info(`[Memory Optimizer] Memory optimization completed. Freed: ${memoryFreed} bytes`);
    
    return {
      level,
      memoryFreed,
      timestamp: Date.now(),
      success: true
    };
  } catch (error) {
    logger.error('[Memory Optimizer] Error during memory optimization:', error);
    return {
      level,
      memoryFreed: 0,
      timestamp: Date.now(),
      success: false,
      error: error instanceof Error ? error.message : String(error)
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
    await optimizationUtils.checkAndOptimize(memoryUsage);
  } catch (error) {
    logger.error('[Memory Optimizer] Error during memory check and optimize:', error);
  }
}

// 추가 메모리 최적화 관련 기능들...
