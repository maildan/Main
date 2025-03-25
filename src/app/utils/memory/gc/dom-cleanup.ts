/**
 * DOM 요소 정리 유틸리티
 */

// DOM 요소 캐시
const elementCache = new WeakMap<HTMLElement, {
  lastUsed: number;
  listeners: Map<string, Set<EventListener>>;
}>();

/**
 * DOM 요소를 캐시에 추가
 */
export function trackElement(element: HTMLElement): void {
  if (!elementCache.has(element)) {
    elementCache.set(element, {
      lastUsed: Date.now(),
      listeners: new Map()
    });
  }
}

/**
 * 요소 사용 시간 업데이트
 */
export function updateElementUsage(element: HTMLElement): void {
  const data = elementCache.get(element);
  if (data) {
    data.lastUsed = Date.now();
  } else {
    trackElement(element);
  }
}

/**
 * 이벤트 리스너 추적
 */
export function trackEventListener(
  element: HTMLElement,
  eventType: string,
  listener: EventListener
): void {
  let data = elementCache.get(element);
  if (!data) {
    data = {
      lastUsed: Date.now(),
      listeners: new Map()
    };
    elementCache.set(element, data);
  }
  
  if (!data.listeners.has(eventType)) {
    data.listeners.set(eventType, new Set());
  }
  
  data.listeners.get(eventType)?.add(listener);
}

/**
 * 오래된 DOM 요소 정리
 */
export function cleanupOldElements(olderThan: number = 300000): number {
  const now = Date.now();
  let removed = 0;
  
  // WeakMap은 forEach를 지원하지 않으므로 다른 방식으로 처리
  // WeakMap에서 키를 순회할 방법이 없기 때문에, 문서 내 모든 요소를 확인
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    const data = elementCache.get(htmlElement);
    
    if (data && (!document.contains(htmlElement) || (now - data.lastUsed > olderThan))) {
      // 요소가 문서에서 제거되었거나 오래되었으면 정리
      data.listeners.forEach((listeners: Set<EventListener>, eventType: string) => {
        listeners.forEach((listener: EventListener) => {
          htmlElement.removeEventListener(eventType, listener);
        });
      });
      
      // 명시적으로 WeakMap에서 제거 (GC 힌트)
      elementCache.delete(htmlElement);
      removed++;
    }
  });
  
  return removed;
}

/**
 * 깊은 DOM 정리
 * 문서 내의 모든 요소에 대해 정리 수행
 */
export function performDeepDOMCleanup(): number {
  let removedCount = 0;
  
  // 중복 ID 정리
  const idElements = document.querySelectorAll('[id]');
  const idMap = new Map<string, HTMLElement>();
  
  idElements.forEach(element => {
    const id = element.id;
    if (idMap.has(id)) {
      console.warn(`중복 ID 발견: ${id}`, element);
      element.removeAttribute('id');
      removedCount++;
    } else {
      idMap.set(id, element as HTMLElement);
    }
  });
  
  // 사용하지 않는 스타일 시트 정리
  const styleSheets = document.styleSheets;
  for (let i = 0; i < styleSheets.length; i++) {
    try {
      const sheet = styleSheets[i];
      if (sheet.disabled || !sheet.cssRules || sheet.cssRules.length === 0) {
        if (sheet.ownerNode) {
          sheet.ownerNode.parentNode?.removeChild(sheet.ownerNode);
          removedCount++;
        }
      }
    } catch (e) {
      // CORS 제한으로 인해 일부 스타일 시트는 접근할 수 없을 수 있음
    }
  }
  
  return removedCount;
}
