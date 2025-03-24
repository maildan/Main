/**
 * 리소스 관련 최적화 모듈
 */
import { unloadUnusedImages } from '../dom-optimizer';
import { cleanupDOM } from '../dom-optimizer';

/**
 * DOM 요소 최적화
 * DOM 계층 구조와 레이아웃 최적화
 */
export function optimizeDOM(): void {
  try {
    // 기존 DOM 정리 함수 호출
    cleanupDOM();
    
    // 숨겨진 요소의 내용 비우기 (메모리 절약)
    const hiddenElements = document.querySelectorAll('.hidden, [hidden], [style*="display: none"]');
    hiddenElements.forEach(el => {
      if (el instanceof HTMLElement && 
          !el.hasAttribute('data-keep-content') && 
          !el.closest('[data-keep-content="true"]')) {
        // 데이터 보존 속성이 없는 경우에만 내용 비우기
        el.innerHTML = '';
      }
    });
    
    // 화면 밖 콘텐츠 최적화
    const offscreenElements = document.querySelectorAll('[data-optimize-offscreen="true"]');
    offscreenElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) {
        if (el instanceof HTMLElement) {
          if (!el.hasAttribute('data-optimized')) {
            el.setAttribute('data-original-content', el.innerHTML);
            el.innerHTML = ''; // 내용 비우기
            el.setAttribute('data-optimized', 'true');
          }
        }
      } else if (el.hasAttribute('data-optimized')) {
        // 다시 화면에 보이게 된 경우 복원
        const originalContent = el.getAttribute('data-original-content');
        if (originalContent) {
          el.innerHTML = originalContent;
          el.removeAttribute('data-optimized');
          el.removeAttribute('data-original-content');
        }
      }
    });
  } catch (error) {
    console.warn('DOM 최적화 중 오류:', error);
  }
}

/**
 * 사용하지 않는 리소스 해제
 */
export function releaseUnusedResources(): void {
  // 사용하지 않는 리소스 해제 작업 구현
  try {
    // 이미지 리소스 해제
    unloadUnusedImages();
    
    // 대용량 데이터 객체 해제
    if (window._largeDataObjects) {
      window._largeDataObjects.forEach(obj => {
        if (typeof obj.release === 'function') {
          obj.release();
        }
      });
    }
  } catch (error) {
    console.warn('미사용 리소스 해제 중 오류:', error);
  }
}

/**
 * 사용하지 않는 메모리 해제
 */
export function freeUnusedMemory(): void {
  // 메모리 해제 작업 구현
  try {
    // 강제 GC 힌트 제공
    if (window.gc) {
      window.gc();
    } else {
      // 간접적으로 GC 유도
      const arr = [];
      for (let i = 0; i < 20; i++) {
        arr.push(new ArrayBuffer(1024 * 1024)); // 1MB씩 할당
      }
      arr.length = 0; // 참조 해제
    }
    
    // 메모리 집약적 객체 정리
    if (Array.isArray(window._memoryTables)) {
      window._memoryTables.forEach(table => {
        if (table && typeof table.clear === 'function') {
          table.clear();
        }
      });
    }
  } catch (error) {
    console.warn('미사용 메모리 해제 중 오류:', error);
  }
}

/**
 * 화면에 보이지 않는 리소스 언로드
 * 뷰포트 밖 리소스 최적화
 */
export function unloadNonVisibleResources(): void {
  try {
    // 화면에 보이지 않는 리소스 언로드 작업 구현
    unloadUnusedImages();
    
    // 뷰포트 밖 iframe 정지
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const rect = iframe.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > window.innerHeight + 100) {
        // 뷰포트에서 충분히 벗어난 경우
        iframe.setAttribute('data-src', iframe.src);
        iframe.src = 'about:blank';
        iframe.setAttribute('data-unloaded', 'true');
      } else if (iframe.getAttribute('data-unloaded') === 'true' && 
                 rect.bottom > -100 && rect.top < window.innerHeight + 100) {
        // 다시 뷰포트에 들어온 경우
        const originalSrc = iframe.getAttribute('data-src');
        if (originalSrc) {
          iframe.src = originalSrc;
          iframe.removeAttribute('data-unloaded');
        }
      }
    });
    
    // 미디어 요소 관리
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach(media => {
      if (media instanceof HTMLMediaElement) {
        const rect = media.getBoundingClientRect();
        if (rect.bottom < -100 || rect.top > window.innerHeight + 100) {
          // 뷰포트에서 벗어난 경우 일시 정지
          if (!media.paused) {
            media.pause();
            media.setAttribute('data-auto-paused', 'true');
          }
        } else if (media.getAttribute('data-auto-paused') === 'true') {
          // 다시 뷰포트에 들어온 경우
          media.play().catch(() => {
            // 자동 재생 실패 무시
          });
          media.removeAttribute('data-auto-paused');
        }
      }
    });
  } catch (error) {
    console.warn('비표시 리소스 언로드 중 오류:', error);
  }
}
