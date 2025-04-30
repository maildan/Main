/**
 * DOM 관련 최적화 모듈
 */
import { cleanupDOM } from '../dom-optimizer';
import { clearImageCache } from '../image-optimizer';

/**
 * DOM 최적화
 */
export function optimizeDOM(): void {
  // DOM 최적화 작업 구현
  try {
    // 숨겨진 DOM 요소 정리
    const hiddenElements = document.querySelectorAll('.hidden, [hidden], [style*="display: none"]');
    hiddenElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.innerHTML = '';
      }
    });
    
    // 뷰포트 밖 DOM 요소 최적화
    const elements = document.querySelectorAll('.optimize-offscreen');
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        const htmlEl = el as HTMLElement;
        htmlEl.dataset.originalDisplay = htmlEl.style.display || '';
        htmlEl.style.display = 'none';
      }
    });
  } catch (error) {
    console.warn('DOM 최적화 중 오류:', error);
  }
}

/**
 * 이미지 캐시 정리
 * 이미지 최적화 모듈과 연계하여 메모리 사용량 절감
 */
export function clearImageCaches(): void {
  try {
    // 이미지 최적화 모듈 활용
    clearImageCache();
    
    // 추가 이미지 관련 캐시 정리
    if (window._imageCache) {
      window._imageCache.clear();
    }
  } catch (error) {
    console.warn('이미지 캐시 정리 중 오류:', error);
  }
}

/**
 * DOM 참조 정리
 * DOM 참조로 인한 메모리 누수 방지
 */
export function cleanupDOMReferences(): void {
  try {
    // DOM 참조 정리 작업 구현
    cleanupDOM();
    
    // 추가 DOM 참조 정리 작업
    const obsoleteRefs = document.querySelectorAll('[data-memory-release="true"]');
    obsoleteRefs.forEach(el => {
      if (el instanceof HTMLElement) {
        el.innerHTML = '';
        if (el.parentNode && !el.dataset.keepParent) {
          el.parentNode.removeChild(el);
        }
      }
    });
  } catch (error) {
    console.warn('DOM 참조 정리 중 오류:', error);
  }
}
