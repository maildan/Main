/**
 * 최적화 수준별 구현
 * Rust 네이티브 모듈을 호출하는 래퍼 함수들
 */
import { requestNativeMemoryOptimization } from '@/app/utils/native-memory-bridge';
import { OptimizationLevel } from '@/types/native-module';

/**
 * 가벼운 수준의 메모리 최적화 수행
 * Rust 네이티브 모듈을 통해 처리
 */
export async function lightOptimization(): Promise<void> {
  try {
    await requestNativeMemoryOptimization(OptimizationLevel.Low, false);
  } catch (error) {
    console.error('가벼운 메모리 최적화 중 오류:', error);
  }
}

/**
 * 중간 수준의 메모리 최적화 수행
 * Rust 네이티브 모듈을 통해 처리
 */
export async function mediumOptimization(): Promise<void> {
  try {
    await requestNativeMemoryOptimization(OptimizationLevel.Medium, false);
  } catch (error) {
    console.error('중간 수준 메모리 최적화 중 오류:', error);
  }
}

/**
 * 높은 수준의 메모리 최적화 수행
 * Rust 네이티브 모듈을 통해 처리
 */
export async function highOptimization(): Promise<void> {
  try {
    await requestNativeMemoryOptimization(OptimizationLevel.High, false);
  } catch (error) {
    console.error('높은 수준 메모리 최적화 중 오류:', error);
  }
}

/**
 * 적극적인 메모리 최적화 수행
 * Rust 네이티브 모듈을 통해 처리
 */
export async function aggressiveOptimization(): Promise<void> {
  try {
    await requestNativeMemoryOptimization(OptimizationLevel.Critical, true);
  } catch (error) {
    console.error('적극적인 메모리 최적화 중 오류:', error);
  }
}

/**
 * 메모리 사용량 보고
 */
export function reportMemoryUsage(level: number): void {
  try {
    console.debug(`메모리 최적화 수행: 레벨 ${level}`);
    
    if (typeof window !== 'undefined' && window.performance && (window.performance as any).memory) {
      const mem = (window.performance as any).memory;
      console.debug(`현재 메모리 상태: 사용 ${Math.round(mem.usedJSHeapSize / (1024 * 1024))}MB, 총 ${Math.round(mem.totalJSHeapSize / (1024 * 1024))}MB`);
    }
  } catch (e) {
    // 콘솔 로깅 오류 무시
  }
}
