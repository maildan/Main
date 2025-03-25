/**
 * 성능 최적화 유틸리티
 * 
 * 메모리 관리 및 성능 최적화 기능을 제공합니다.
 */

import { OptimizationLevel } from '@/types';
import { 
  performGarbageCollection, 
  optimizeMemory 
} from './memory-management';
import { cleanupOldElements as cleanupDOM } from './memory/gc/dom-cleanup';
import { clearAllCache } from './memory/gc/cache-optimizer';

/**
 * 성능 최적화 수행
 * @param level 최적화 레벨
 * @param emergency 긴급 모드 여부
 */
export async function optimizePerformance(
  level: OptimizationLevel = OptimizationLevel.MEDIUM,
  emergency: boolean = false
): Promise<boolean> {
  try {
    console.log(`성능 최적화 시작 (레벨: ${level}, 긴급: ${emergency})`);
    
    // 메모리 최적화 실행
    await optimizeMemory(level, emergency);
    
    // 가비지 컬렉션 실행
    await performGarbageCollection(emergency);
    
    console.log('성능 최적화 완료');
    return true;
  } catch (error) {
    console.error('성능 최적화 중 오류:', error);
    return false;
  }
}

/**
 * 백그라운드 모드 성능 최적화
 */
export async function optimizeForBackground(): Promise<boolean> {
  try {
    // 백그라운드 최적화 작업
    const settings = {
      releaseUnusedResources: true,
      minimizeMemoryUsage: true,
      pauseNonEssentialOperations: true
    };
    
    // 메모리 최적화
    await optimizeMemory(OptimizationLevel.HIGH, false);
    
    return true;
  } catch (error) {
    console.error('백그라운드 최적화 중 오류:', error);
    return false;
  }
}
