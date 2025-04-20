/**
 * 메모리 최적화 유틸리티
 */
import { OptimizationLevel } from '@/types';
import { cleanupDom } from './dom-cleanup';
import { cleanupCache } from './cache-optimizer';
import { optimizeEvents } from './event-optimizer';
import { optimizeResources } from './resource-optimizer';
import { emergencyRecovery } from './emergency-recovery';
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
    case OptimizationLevel.EXTREME:
      await cleanupCache();
      await cleanupDom(true);
      await optimizeEvents();
      await optimizeResources();
      // 더 많은 최적화...
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

  if (options.interval && options.interval > 0) {
    optimizationInterval = options.interval;
  }

  if (options.threshold && options.threshold > 0 && options.threshold <= 100) {
    memoryThreshold = options.threshold;
  }

  logger.info(`[Optimization Utils] Auto optimization ${autoOptimizationEnabled ? 'enabled' : 'disabled'}`);
  if (autoOptimizationEnabled) {
    logger.info(`[Optimization Utils] Interval: ${optimizationInterval}ms, Threshold: ${memoryThreshold}%`);
  }
}

/**
 * 현재 자동 최적화 설정을 가져옵니다.
 */
export function getAutoOptimizationSettings(): {
  enabled: boolean;
  interval: number;
  threshold: number;
} {
  return {
    enabled: autoOptimizationEnabled,
    interval: optimizationInterval,
    threshold: memoryThreshold
  };
}

/**
 * 숫자를 적절한 최적화 레벨로 안전하게 변환합니다.
 */
export function safeOptimizationLevel(level: number): OptimizationLevel {
  switch (level) {
    case 0:
      return OptimizationLevel.NONE;
    case 1:
      return OptimizationLevel.LOW;
    case 2:
      return OptimizationLevel.MEDIUM;
    case 3:
      return OptimizationLevel.HIGH;
    case 4:
      return OptimizationLevel.AGGRESSIVE;
    case 5:
      return OptimizationLevel.EXTREME;
    default:
      logger.warn(`[Optimization Utils] Invalid optimization level: ${level}, using default`);
      return OptimizationLevel.MEDIUM;
  }
}

// 메모리 최적화 수행 및 결과 저장 함수들...
