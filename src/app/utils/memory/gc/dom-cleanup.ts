/**
 * DOM 요소 정리 유틸리티
 * 
 * 브라우저 DOM 요소에 대한 메모리 최적화 기능을 제공합니다.
 */

// 브라우저 환경 확인
const isBrowser = typeof window !== 'undefined';

// DOM 요소 제거 타입 선언
interface RemovedElement {
  element: Element;
  parent: Element | null;
  nextSibling: Node | null;
}

// Window 인터페이스 확장
declare global {
  interface Window {
    __removedElements?: Array<RemovedElement>;
    __imageResizeCache?: Map<string, string>;
  }
}

/**
 * 비표시 이미지 정리
 * 화면 밖에 있는 이미지의 src를 제거하여 메모리를 절약
 */
export function clearUnusedImages(): number {
  if (!isBrowser) return 0;

  let count = 0;
  try {
    // 비표시 이미지 찾기
    const images = Array.from(document.querySelectorAll('img')) as HTMLImageElement[];
    const hiddenImages = images.filter(img => {
      const rect = img.getBoundingClientRect();
      return (
        rect.top > window.innerHeight * 3 || // 화면 아래쪽으로 3배 이상 벗어남
        rect.bottom < -window.innerHeight * 2 || // 화면 위쪽으로 2배 이상 벗어남
        rect.left > window.innerWidth * 2 || // 화면 오른쪽으로 2배 이상 벗어남
        rect.right < -window.innerWidth * 2 || // 화면 왼쪽으로 2배 이상 벗어남
        img.style.display === 'none' ||
        img.style.visibility === 'hidden'
      );
    });

    // src 백업 및 제거
    hiddenImages.forEach(img => {
      if (img.src && !img.dataset.originalSrc) {
        img.dataset.originalSrc = img.src;
        img.src = '';
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
 */
export function cleanupHiddenElements(): number {
  if (!isBrowser) return 0;

  let count = 0;
  try {
    // 숨겨진 큰 요소 찾기
    const elements = Array.from(document.querySelectorAll('div, section, article'));
    const hiddenElements = elements.filter(el => {
      const style = window.getComputedStyle(el);
      return (
        style.display === 'none' &&
        el.querySelectorAll('*').length > 50
      );
    });

    // 임시로 DOM에서 제거하고 나중에 복구할 수 있도록 참조 저장
    hiddenElements.forEach(el => {
      if (!window.__removedElements) window.__removedElements = [];
      window.__removedElements.push({
        element: el,
        parent: el.parentElement,
        nextSibling: el.nextSibling
      });

      el.parentElement?.removeChild(el);
      count++;
    });

    return count;
  } catch (error) {
    console.error('숨겨진 요소 정리 중 오류:', error);
    return 0;
  }
}

/**
 * 이벤트 리스너 정리
 * 특정 이벤트 리스너 오버헤드를 줄이기 위해 제한
 */
export function cleanupEventListeners(): number {
  if (!isBrowser) return 0;
  let count = 0;
  try {
    const heavyEventTypes = ['mousemove', 'mouseover', 'mouseout', 'resize', 'scroll'];
    const origAddEventListener = EventTarget.prototype.addEventListener;
    const eventEnabled = new Map<string, boolean>();
    heavyEventTypes.forEach(type => eventEnabled.set(type, false));
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: AddEventListenerOptions | boolean
    ) {
      if (heavyEventTypes.includes(type) && eventEnabled.get(type) === false) {
        count++;
        return;
      }
      return origAddEventListener.call(this, type, listener, options);
    };
    setTimeout(() => {
      EventTarget.prototype.addEventListener = origAddEventListener;
    }, 0);
  } catch (error) {
    console.error('이벤트 리스너 정리 중 오류:', error);
  }
  return count;
}

/**
 * DOM 트리 최적화
 * 불필요한 스타일 및 데이터 속성 제거
 */
export function optimizeDomTree(): number {
  if (!isBrowser) return 0;
  let count = 0;
  try {
    const styledElements = document.querySelectorAll('[style]');
    styledElements.forEach(el => {
      const styleAttr = el.getAttribute('style');
      if (styleAttr && (styleAttr.includes('transition') || styleAttr.includes('animation'))) {
        el.removeAttribute('style');
        count++;
      }
    });
    // [data-*] 속성 정리 (단, data-memory*, data-app*, data-test* 제외)
    const dataElements = document.querySelectorAll('[data-*]');
    dataElements.forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (
          attr.name.startsWith('data-') &&
          !attr.name.startsWith('data-memory') &&
          !attr.name.startsWith('data-app') &&
          !attr.name.startsWith('data-test')
        ) {
          el.removeAttribute(attr.name);
          count++;
        }
      });
    });
  } catch (error) {
    console.error('DOM 트리 최적화 중 오류:', error);
  }
  return count;
}

/**
 * 모든 DOM 최적화 기능 실행
 */
export function performFullDomCleanup(): Record<string, number> {
  if (!isBrowser) return { total: 0 };

  const results = {
    images: clearUnusedImages(),
    hiddenElements: cleanupHiddenElements(),
    eventListeners: cleanupEventListeners(),
    domTree: optimizeDomTree()
  };

  const total = Object.values(results).reduce((sum, val) => sum + val, 0);

  return {
    ...results,
    total
  };
}

/**
 * 이미지 복구
 * clearUnusedImages로 제거된 이미지 복구
 */
export function restoreImages(): number {
  if (!isBrowser) return 0;

  let count = 0;
  try {
    const images = Array.from(document.querySelectorAll('img[data-original-src]')) as HTMLImageElement[];

    images.forEach(img => {
      if (img.dataset.originalSrc) {
        img.src = img.dataset.originalSrc;
        delete img.dataset.originalSrc;
        count++;
      }
    });

    return count;
  } catch (error) {
    console.error('이미지 복구 중 오류:', error);
    return 0;
  }
}

/**
 * DOM 요소 정리
 * 불필요한 DOM 요소를 정리하고 메모리 사용량을 줄입니다.
 * 
 * @param aggressive 공격적인 정리 모드 사용 여부
 * @returns 정리된 항목 수 반환
 */
export function cleanupDom(aggressive: boolean = false): number {
  if (!isBrowser) return 0;

  let count = 0;

  try {
    // 기본 정리 작업 수행
    count += clearUnusedImages();
    count += cleanupHiddenElements();

    // aggressive가 true인 경우 추가 정리 수행
    if (aggressive) {
      count += cleanupEventListeners();
      count += optimizeDomTree();
    }
  } catch (error) {
    console.error('DOM 요소 정리 중 오류:', error);
  }

  return count;
}

// 사용하지 않는 함수 (앞에 _ 접두어 추가)
const _setGpuAcceleration = () => {
  // GPU 가속 설정 구현
};
