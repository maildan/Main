/**
 * 최적화 수준별 구현
 */
import { clearInactiveCache, clearAllLowPriorityCache, clearAllCache, releaseAllCaches } from './cache-optimizer';
import { localGarbageCollectionHint } from './gc-helpers';
import { cleanupEventListeners, optimizeEventListeners, unloadDynamicModules } from './event-optimizer';
import { clearImageCaches, cleanupDOMReferences, optimizeDOM } from './dom-optimizer';
import { releaseUnusedResources, freeUnusedMemory, unloadNonVisibleResources } from './resource-optimizer';
import { emergencyMemoryRecovery } from './emergency-recovery';

/**
 * 가벼운 수준의 메모리 최적화 수행
 */
export async function lightOptimization(): Promise<void> {
  // 불필요한 캐시 정리
  clearInactiveCache();
  
  // 가비지 컬렉션을 간접적으로 유도
  localGarbageCollectionHint();
}

/**
 * 중간 수준의 메모리 최적화 수행
 */
export async function mediumOptimization(): Promise<void> {
  // 가벼운 최적화 포함
  await lightOptimization();
  
  // 추가 최적화 작업
  clearAllLowPriorityCache();
  
  // 비활성 이벤트 리스너 정리 등
  cleanupEventListeners();
  
  // 이미지 캐시 정리
  clearImageCaches();
}

/**
 * 높은 수준의 메모리 최적화 수행
 */
export async function highOptimization(): Promise<void> {
  // 중간 최적화 포함
  await mediumOptimization();
  
  // 추가 작업
  clearAllCache();
  releaseUnusedResources();
  
  // DOM 참조 정리
  cleanupDOMReferences();
}

/**
 * 공격적인 메모리 최적화 수행 (위험 단계 또는 긴급 상황)
 */
export async function aggressiveOptimization(): Promise<void> {
  // 모든 최적화 포함
  await highOptimization();
  
  // 극단적 조치
  releaseAllCaches();
  freeUnusedMemory();
  
  // DOM 최적화 (UI 일시 중지 가능)
  optimizeDOM();
  
  // 비표시 리소스 언로드
  unloadNonVisibleResources();
  
  // 이벤트 리스너 최적화
  optimizeEventListeners();
  
  // 동적 모듈 언로드
  unloadDynamicModules();
  
  // 긴급 메모리 복구
  await emergencyMemoryRecovery();
}

/**
 * 메모리 사용량 보고
 */
export function reportMemoryUsage(level: number): void {
  // 메모리 사용량 보고 작업 구현
  try {
    console.debug(`메모리 최적화 수행: 레벨 ${level}`);
    
    // 성능 API 사용 가능 시 메모리 사용량 보고
    if (window.performance && (window.performance as any).memory) {
      const memory = (window.performance as any).memory;
      console.debug(`현재 메모리 사용량: ${Math.round(memory.usedJSHeapSize / (1024 * 1024))}MB / ${Math.round(memory.jsHeapSizeLimit / (1024 * 1024))}MB`);
    }
    
    // Electron API 사용 가능 시 메인 프로세스에 로그 전송
    if (window.electronAPI && typeof window.electronAPI.getMemoryUsage === 'function') {
      // 메모리 사용량 정보만 콘솔에 로깅
      console.debug('메모리 최적화 정보 기록', {
        level,
        timestamp: Date.now(),
        renderer: true
      });
    }
  } catch (error) {
    console.warn('메모리 사용량 보고 중 오류:', error);
  }
}
