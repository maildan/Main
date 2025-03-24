/**
 * 긴급 메모리 복구 모듈
 */
import { clearAllCache, releaseAllCaches, clearStorageCaches } from './cache-optimizer';
import { clearImageCaches, cleanupDOMReferences } from './dom-optimizer';
import { freeUnusedMemory, unloadNonVisibleResources } from './resource-optimizer';

/**
 * 긴급 메모리 복구
 * 메모리 부족 상황에서 긴급 복구
 */
export async function emergencyMemoryRecovery(): Promise<void> {
  try {
    // 모든 최적화 기능 수행
    clearAllCache();
    releaseAllCaches();
    freeUnusedMemory();
    clearImageCaches();
    clearStorageCaches();
    cleanupDOMReferences();
    unloadNonVisibleResources();
    
    // 긴급 처리 (모든 미사용 DOM 요소 제거 등)
    const nonEssentialElements = document.querySelectorAll('[data-priority="low"]');
    nonEssentialElements.forEach(el => {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
    
    // 가비지 컬렉션 요청
    await new Promise<void>(resolve => {
      if (window.gc) {
        window.gc();
        setTimeout(() => {
          window.gc && window.gc();
          resolve();
        }, 100);
      } else {
        // 간접적 GC 유도
        const largeArrays = [];
        for (let i = 0; i < 10; i++) {
          largeArrays.push(new Uint8Array(1024 * 1024 * 10)); // 10MB씩 할당
        }
        largeArrays.length = 0;
        setTimeout(resolve, 200);
      }
    });
    
    // 메인 프로세스에 긴급 메모리 정리 요청 (기존 API 사용)
    if (window.electronAPI && typeof window.electronAPI.requestGC === 'function') {
      await window.electronAPI.requestGC();
      console.warn('메모리 리소스 해제 요청 전송됨');
    }
    
    console.warn('긴급 메모리 복구 완료');
  } catch (error) {
    console.error('긴급 메모리 복구 중 오류:', error);
  }
}
