/**
 * DOM 메모리 정리 유틸리티
 * 
 * 메모리 사용량 최적화를 위한 DOM 관련 정리 기능을 제공합니다.
 */

// 브라우저 환경인지 확인하는 함수
const isBrowser = typeof window !== 'undefined';

// 데이터 속성 접두어
const DATA_ATTR_PRESERVE = 'data-memory-preserve';
const DATA_ATTR_CLEANUP = 'data-memory-cleanup';

/**
 * 미사용 이미지 리소스 정리
 * 화면에 보이지 않는 이미지의 src를 제거하여 메모리 해제
 */
export function clearUnusedImages(): number {
  if (!isBrowser) return 0;
  
  try {
    let count = 0;
    
    // 화면에 보이지 않고 보존 표시가 없는 이미지 선택
    const images = document.querySelectorAll(
      `img:not([${DATA_ATTR_PRESERVE}]):not([aria-hidden="false"])`
    );
    
    images.forEach(img => {
      // 브라우저 뷰포트 안에 있는지 확인
      const rect = img.getBoundingClientRect();
      const isVisible = (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
      
      // 화면에 보이지 않는 경우 src 제거
      if (!isVisible && img instanceof HTMLImageElement && img.src) {
        // data-src에 원본 주소 저장
        img.setAttribute('data-src', img.src);
        img.removeAttribute('src');
        count++;
      }
    });
    
    return count;
  } catch (error) {
    console.error('이미지 정리 중 오류:', error);
    return 0;
  }
}

/**
 * 숨겨진 DOM 요소 정리
 * 화면에 보이지 않고 당장 필요하지 않은 DOM 요소를 제거
 */
export function cleanupHiddenElements(): number {
  if (!isBrowser) return 0;
  
  try {
    let count = 0;
    
    // 정리 대상이 되는 숨겨진 요소 선택
    const elements = document.querySelectorAll(
      `[${DATA_ATTR_CLEANUP}], .hidden:not([${DATA_ATTR_PRESERVE}]), [aria-hidden="true"]:not([${DATA_ATTR_PRESERVE}]), [style*="display: none"]:not([${DATA_ATTR_PRESERVE}])`
    );
    
    // 요소 정리 템플릿 생성
    const placeholder = document.createElement('template');
    
    elements.forEach((el) => {
      if (!el.closest(`[${DATA_ATTR_PRESERVE}]`)) {
        // 요소 정보 저장
        placeholder.content.appendChild(el);
        count++;
      }
    });
    
    return count;
  } catch (error) {
    console.error('DOM 요소 정리 중 오류:', error);
    return 0;
  }
}

/**
 * 이벤트 리스너 정리
 * 특정 요소의 이벤트 리스너 오버헤드 감소
 */
export function cleanupEventListeners(): number {
  if (!isBrowser) return 0;
  
  try {
    let count = 0;
    
    // 최적화 대상 이벤트 타입
    const heavyEventTypes = ['mousemove', 'mouseover', 'mouseout', 'resize', 'scroll'];
    
    // 메모리 최적화에 해당하는 이벤트 리스너만 새로 정의하여 제한
    const origAddEventListener = EventTarget.prototype.addEventListener;
    
    // 토큰 기반 이벤트 관리 (임시)
    const eventEnabled = new Map<string, boolean>();
    heavyEventTypes.forEach(type => {
      eventEnabled.set(type, false);
    });
    
    // 이벤트 리스너 재정의
    EventTarget.prototype.addEventListener = function(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions | boolean
    ) {
      // 해당 이벤트가 제한 대상인지 확인
      if (heavyEventTypes.includes(type) && eventEnabled.get(type) === false) {
        count++;
        return;
      }
      
      // 그 외의 경우 정상적으로 이벤트 등록
      return origAddEventListener.call(this, type, listener, options);
    };
    
    // 원래 함수 복원을 위한 정리 함수 반환
    setTimeout(() => {
      EventTarget.prototype.addEventListener = origAddEventListener;
    }, 0);
    
    return count;
  } catch (error) {
    console.error('이벤트 리스너 정리 중 오류:', error);
    return 0;
  }
}

/**
 * DOM 트리 최적화
 * 불필요한 속성 및 스타일 정리
 */
export function optimizeDomTree(): number {
  if (!isBrowser) return 0;
  
  try {
    let count = 0;
    
    // 불필요한 스타일 속성 제거
    const styledElements = document.querySelectorAll('[style]');
    styledElements.forEach(el => {
      if (el.getAttribute('style')?.includes('transition') || 
          el.getAttribute('style')?.includes('animation')) {
        el.removeAttribute('style');
        count++;
      }
    });
    
    // 불필요한 데이터 속성 정리
    const dataElements = document.querySelectorAll('[data-*]');
    dataElements.forEach(el => {
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith('data-') && !attr.name.startsWith('data-memory') && !attr.name.startsWith('data-app') && !attr.name.startsWith('data-test')) {
          el.removeAttribute(attr.name);
          count++;
        }
      }
    });
    
    return count;
  } catch (error) {
    console.error('DOM 트리 최적화 중 오류:', error);
    return 0;
  }
}

/**
 * 모든 DOM 최적화 기능 실행
 */
export function performFullDomCleanup(): Record<string, number> {
  return {
    images: clearUnusedImages(),
    hiddenElements: cleanupHiddenElements(),
    eventListeners: cleanupEventListeners(),
    domOptimizations: optimizeDomTree()
  };
}

/**
 * 이미지 복구
 * clearUnusedImages로 제거된 이미지 복구
 */
export function restoreImages(): number {
  if (!isBrowser) return 0;
  
  try {
    let count = 0;
    
    // data-src 속성이 있는 이미지 선택
    const images = document.querySelectorAll('img[data-src]:not([src])');
    
    images.forEach(img => {
      if (img instanceof HTMLImageElement) {
        const src = img.getAttribute('data-src');
        if (src) {
          img.src = src;
          count++;
        }
      }
    });
    
    return count;
  } catch (error) {
    console.error('이미지 복구 중 오류:', error);
    return 0;
  }
}

// 브라우저 환경일 때만 글로벌 API 노출
if (isBrowser && typeof window.__memoryOptimizer === 'undefined') {
  window.__memoryOptimizer = {};
}

if (isBrowser && window.__memoryOptimizer) {
  window.__memoryOptimizer.clearUnusedImages = clearUnusedImages;
  window.__memoryOptimizer.cleanupHiddenElements = cleanupHiddenElements;
  window.__memoryOptimizer.performFullDomCleanup = performFullDomCleanup;
  window.__memoryOptimizer.restoreImages = restoreImages;
}
