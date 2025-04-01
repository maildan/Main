/**
 * 메모리 최적화 유틸리티
 * 
 * 이 모듈은 메모리 최적화의 실제 구현을 담당합니다.
 * 상위 레벨 인터페이스는 memory-optimizer.ts에서 제공합니다.
 */

// OptimizationLevel을 값으로 사용할 수 있도록 enum으로 변경
export enum OptimizationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  AGGRESSIVE = 4
}

// safeOptimizationLevel 변수 추가 및 내보내기
export const safeOptimizationLevel = OptimizationLevel.LOW;

import { MemoryInfo } from '../../../types';
import { cleanupDom } from './gc/dom-cleanup';
import { cleanupCache } from './gc/cache-optimizer';
import { optimizeEvents } from './gc/event-optimizer';
import { optimizeResources } from './gc/resource-optimizer';
import { emergencyRecovery } from './gc/emergency-recovery';
import { logger } from './logger';

// 함수들을 재내보내기
export { cleanupDom, optimizeResources, emergencyRecovery, cleanupCache };

// 자동 최적화 설정
let autoOptimizationEnabled = false;
let optimizationInterval = 60000; // 기본값: 1분
let memoryThreshold = 80; // 기본값: 80%

/**
 * 메모리 최적화를 실행합니다.
 * 
 * @param level - 최적화 레벨
 * @param emergency - 긴급 상황 여부
 */
export async function runOptimization(
  level: OptimizationLevel,
  emergency: boolean
): Promise<void> {
  logger.info(`[Optimization Utils] Running optimization at level: ${level}, emergency: ${emergency}`);
  
  // 요청된 레벨에 따라 최적화 작업 수행
  switch (level) {
    case OptimizationLevel.LOW:
      await cleanupCache();
      break;
      
    case OptimizationLevel.MEDIUM:
      await cleanupCache();
      await cleanupDom(false);
      break;
      
    case OptimizationLevel.HIGH:
      await cleanupCache();
      await cleanupDom(true);
      await optimizeEvents();
      await optimizeResources();
      break;
      
    case OptimizationLevel.AGGRESSIVE:
      await cleanupCache();
      await cleanupDom(true);
      await optimizeEvents();
      await optimizeResources();
      break;
      
    default:
      logger.warn(`[Optimization Utils] Unknown optimization level: ${level}`);
  }
  
  // 긴급 상황이면 추가 최적화 수행
  if (emergency) {
    logger.info('[Optimization Utils] Performing emergency optimizations');
    await emergencyRecovery();
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
  autoOptimizationEnabled = options.enabled;
  
  if (options.interval !== undefined && options.interval > 0) {
    optimizationInterval = options.interval;
  }
  
  if (options.threshold !== undefined && options.threshold > 0) {
    memoryThreshold = Math.min(Math.max(options.threshold, 50), 90);
  }
  
  logger.info(`[Optimization Utils] Auto optimization configured: enabled=${autoOptimizationEnabled}, interval=${optimizationInterval}ms, threshold=${memoryThreshold}%`);
}

/**
 * 메모리 사용량을 확인하고 필요 시 최적화를 수행합니다.
 * 
 * @param memoryUsage - 현재 메모리 사용량
 */
export async function checkAndOptimize(memoryUsage: MemoryInfo): Promise<void> {
  if (!autoOptimizationEnabled) return;
  
  // null 체크 추가
  if (memoryUsage && memoryUsage.heapUsed !== undefined && memoryUsage.heapTotal !== undefined) {
    const usagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    logger.debug(`[Optimization Utils] Memory usage check: ${usagePercent.toFixed(2)}% (threshold: ${memoryThreshold}%)`);
    
    if (usagePercent >= memoryThreshold) {
      logger.warn(`[Optimization Utils] Memory usage (${usagePercent.toFixed(2)}%) exceeds threshold (${memoryThreshold}%)`);
      
      // 사용량에 따른 최적화 레벨 결정
      let level = OptimizationLevel.MEDIUM;
      let emergency = false;
      
      if (usagePercent >= 90) {
        level = OptimizationLevel.AGGRESSIVE;
        emergency = true;
      } else if (usagePercent >= 85) {
        level = OptimizationLevel.HIGH;
      }
      
      await runOptimization(level, emergency);
    }
  }
}

/**
 * TypeScript와 Rust enum 간의 변환을 보장하기 위한 함수
 * 
 * @param level - TypeScript OptimizationLevel
 * @returns Rust enum 값
 */
export function toNativeOptimizationLevel(level: OptimizationLevel): number {
  // Rust enum 값과 일치하도록 설정
  switch(level) {
    case OptimizationLevel.NONE:
      return 0;
    case OptimizationLevel.LOW:
      return 1;
    case OptimizationLevel.MEDIUM:
      return 2;
    case OptimizationLevel.HIGH:
      return 3;
    case OptimizationLevel.AGGRESSIVE:
      return 4;
    default:
      return 2; // 기본값: MEDIUM
  }
}

// 추가 최적화 유틸리티 함수들...
