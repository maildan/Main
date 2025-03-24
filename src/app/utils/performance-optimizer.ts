/**
 * 성능 최적화 통합 유틸리티
 * 
 * 메모리 최적화와 GPU 가속화를 함께 관리하고 최적의 성능을 제공합니다.
 */

import { OptimizationLevel } from '@/types';
import { optimizeMemoryWithFallback, collectGarbageWithFallback } from './memory-management';
import { executeGpuComputation, toggleGpuAcceleration } from './gpu-acceleration';
import { loadMemorySettings } from '../settings/memory-settings';

// 성능 최적화 옵션 인터페이스
export interface PerformanceOptimizationOptions {
  memoryOptimizationLevel?: OptimizationLevel;
  enableGpuAcceleration?: boolean;
  aggressive?: boolean;
  cleanupDOM?: boolean;
  clearCache?: boolean;
}

/**
 * 통합 성능 최적화 실행
 * 메모리 최적화와 GPU 가속화를 함께 적용합니다.
 */
export async function optimizePerformance(options: PerformanceOptimizationOptions = {}): Promise<{
  success: boolean;
  memoryOptimized: boolean;
  gpuAccelerated: boolean;
  freedMemory?: number;
}> {
  const {
    memoryOptimizationLevel = OptimizationLevel.MEDIUM,
    enableGpuAcceleration = true,
    aggressive = false,
    cleanupDOM = true,
    clearCache = false
  } = options;
  
  // 결과 객체 초기화
  const result = {
    success: false,
    memoryOptimized: false,
    gpuAccelerated: false,
    freedMemory: undefined as number | undefined
  };
  
  try {
    // 1. 메모리 최적화 수행
    const memoryResult = await optimizeMemoryWithFallback(memoryOptimizationLevel, aggressive);
    result.memoryOptimized = memoryResult.success;
    result.freedMemory = memoryResult.freed_mb;
    
    // 2. DOM 정리 (옵션으로 활성화)
    if (cleanupDOM) {
      await cleanupDOMElements();
    }
    
    // 3. GPU 가속화 설정
    if (enableGpuAcceleration) {
      const gpuResult = await toggleGpuAcceleration(true);
      result.gpuAccelerated = gpuResult;
    }
    
    // 4. 캐시 정리 (옵션으로 활성화)
    if (clearCache) {
      await clearBrowserCaches();
    }
    
    result.success = true;
    return result;
  } catch (error) {
    console.error('성능 최적화 오류:', error);
    return result;
  }
}

/**
 * DOM 요소 정리
 * 사용하지 않는 DOM 요소를 제거하여 메모리를 확보합니다.
 */
async function cleanupDOMElements(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    // 숨겨진 불필요한 요소 제거
    const hiddenElements = document.querySelectorAll('.hidden, [hidden], [style*="display: none"]');
    hiddenElements.forEach(el => {
      if (el.parentElement && !el.classList.contains('preserve')) {
        el.parentElement.removeChild(el);
      }
    });
    
    // 오래된 이벤트 리스너 정리
    // 실제 구현에서는 애플리케이션 특성에 맞게 구현
  } catch (error) {
    console.warn('DOM 정리 오류:', error);
  }
}

/**
 * 브라우저 캐시 정리
 */
async function clearBrowserCaches(): Promise<void> {
  if (typeof window === 'undefined' || !window.caches) return;
  
  try {
    // 서비스 워커 캐시 정리
    if (window.caches) {
      const keys = await window.caches.keys();
      await Promise.all(
        keys.map(key => window.caches.delete(key))
      );
    }
    
    // IndexedDB 임시 데이터 정리
    // 실제 구현에서는 필요한 IndexedDB 객체 저장소만 정리
  } catch (error) {
    console.warn('캐시 정리 오류:', error);
  }
}

/**
 * 사용자 입력 중 최적화 요청
 * 입력 성능에 영향을 최소화하면서 메모리를 최적화합니다.
 */
export async function optimizeDuringUserInput(): Promise<boolean> {
  try {
    // 메모리 설정 로드
    const settings = loadMemorySettings();
    
    // 가벼운 최적화 수행 (백그라운드에서)
    setTimeout(async () => {
      await optimizeMemoryWithFallback(OptimizationLevel.LOW, false);
    }, 0);
    
    return true;
  } catch (error) {
    console.error('입력 중 최적화 오류:', error);
    return false;
  }
}

/**
 * 앱 성능 비상 최적화
 * 심각한 메모리 문제 상황에서 호출됩니다.
 */
export async function emergencyOptimization(): Promise<boolean> {
  try {
    console.warn('긴급 성능 최적화 실행 중...');
    
    // 1. 즉시 GC 요청
    await collectGarbageWithFallback(true);
    
    // 2. 중요하지 않은 컴포넌트 언로드
    // TODO: 앱 특성에 맞게 구현
    
    // 3. 최고 수준 메모리 최적화
    await optimizeMemoryWithFallback(OptimizationLevel.EXTREME, true);
    
    // 4. 페이지 새로고침 요청 (극단적인 경우)
    if (typeof window !== 'undefined') {
      const shouldReload = window.confirm(
        '메모리 부족 문제가 발생했습니다. 페이지를 새로고침하시겠습니까?'
      );
      
      if (shouldReload) {
        window.location.reload();
      }
    }
    
    return true;
  } catch (error) {
    console.error('긴급 최적화 오류:', error);
    return false;
  }
}
