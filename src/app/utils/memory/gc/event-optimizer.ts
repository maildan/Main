/**
 * 이벤트 및 이벤트 리스너 최적화 유틸리티
 */
import { cleanupDOM } from './dom-cleanup';
import { DOMCleanupResult } from '../types';

// 이벤트 리스너 추적을 위한 맵
interface EventListenerData {
  listener: EventListener;
  options?: boolean | AddEventListenerOptions;
  removed?: boolean;
}

// ElementWithEventMap 타입 정의 추가
type ElementWithEventMap = Element & {
  __eventMap?: Map<string, Set<EventListenerData>>;
};

// 이벤트 리스너 데이터 저장소
const elementListeners = new Map<ElementWithEventMap, Map<string, Set<EventListenerData>>>();

// WeakMap 대신 Map 사용 순회
export function detachAllEventListeners(): number {
  let count = 0;
  
  try {
    // Map을 사용하므로 직접 순회 가능
    elementListeners.forEach((listenerMap, element) => {
      if (listenerMap) {
        listenerMap.forEach((listeners, eventType) => {
          if (listeners) {
            listeners.forEach((data) => {
              if (element && !data.removed) {
                try {
                  element.removeEventListener(
                    eventType,
                    data.listener,
                    data.options
                  );
                  data.removed = true;
                  count++;
                } catch (e) {
                  console.warn(`이벤트 리스너 제거 실패: ${e}`);
                }
              }
            });
          }
        });
      }
    });
    
    // 맵 초기화
    elementListeners.clear();
    
  } catch (error) {
    console.error('이벤트 리스너 제거 중 오류:', error);
  }
  
  return count;
}

/**
 * 이벤트 리스너 최적화
 * 오래된 리스너를 정리하여 메모리 누수를 방지합니다.
 */
export function optimizeEventListeners(
  root: HTMLElement = document.body,
  olderThan: number = 300000 // 5분
): number {
  if (!root) return 0;
  
  let removed = 0;
  const now = Date.now();
  
  // 캐시된 이벤트 리스너 검사
  elementListeners.forEach((listenerMap, element) => {
    if (!document.contains(element)) {
      // DOM에서 제거된 요소의 캐시 정리
      elementListeners.delete(element);
      removed++;
      return;
    }
    
    listenerMap.forEach((listeners, eventType) => {
      const oldListeners = Array.from(listeners).filter(data => 
        (now - data.lastUsed) > olderThan
      );
      
      oldListeners.forEach(data => {
        // 오래된 리스너 제거
        element.removeEventListener(eventType, data.listener, data.options);
        listeners.delete(data);
        removed++;
      });
    });
  });
  
  return removed;
}

/**
 * 동적 모듈 정리
 * 사용하지 않는 동적으로 로드된 모듈을 정리합니다.
 */
export function unloadDynamicModules(): number {
  try {
    if (typeof window === 'undefined' || !window._dynamicModules) {
      return 0;
    }
    
    const now = Date.now();
    let unloadedCount = 0;
    const modulesToUnload: string[] = [];
    
    // 언로드할 모듈 식별
    window._dynamicModules.forEach((module, key) => {
      if (now - module.lastUsed > 600000) { // 10분 이상 사용하지 않은 모듈
        modulesToUnload.push(key);
      }
    });
    
    // 식별된 모듈 언로드
    modulesToUnload.forEach(key => {
      const module = window._dynamicModules?.get(key);
      if (module) {
        try {
          if (typeof module.unload === 'function') {
            module.unload();
          }
          window._dynamicModules?.delete(key);
          unloadedCount++;
        } catch (e) {
          console.warn(`모듈 ${key} 언로드 중 오류:`, e);
        }
      }
    });
    
    if (unloadedCount > 0) {
      console.log(`미사용 동적 모듈 ${unloadedCount}개 언로드됨`);
    }
    
    return unloadedCount;
  } catch (error) {
    console.warn('동적 모듈 정리 중 오류:', error);
    return 0;
  }
}

/**
 * 불필요한 이벤트 리스너 정리
 * 페이지 성능을 위해 불필요한 이벤트 리스너를 정리합니다.
 */
export function cleanupEventListeners(): number {
  try {
    let total = 0;
    
    // 문서의 모든 요소에서 특정 이벤트 리스너 정리
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      // 요소가 더 이상 DOM에 없는 경우 건너뜀
      if (!document.contains(el)) return;
      
      // data-* 속성으로 이벤트 정보 확인
      if (el.hasAttribute('data-events')) {
        try {
          const events = JSON.parse(el.getAttribute('data-events') || '[]');
          events.forEach((eventType: string) => {
            const oldHandler = (el as any)[`_${eventType}Handler`];
            if (oldHandler) {
              el.removeEventListener(eventType, oldHandler);
              delete (el as any)[`_${eventType}Handler`];
              total++;
            }
          });
          el.removeAttribute('data-events');
        } catch (e) {
          console.warn('데이터 이벤트 속성 파싱 중 오류:', e);
        }
      }
    });
    
    // 기본 이벤트 최적화 수행
    const optimizedCount = optimizeEventListeners();
    total += optimizedCount;
    
    return total;
  } catch (error) {
    console.warn('이벤트 리스너 정리 중 오류:', error);
    return 0;
  }
}

/**
 * 이벤트 리스너 안전 추가 함수
 * 이벤트 추적을 위해 리스너를 안전하게 추가합니다.
 */
export function safeAddEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  type: K,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions
): () => void {
  try {
    // 요소에 리스너 추가
    element.addEventListener(type, listener, options);
    
    // 리스너 추적을 위한 데이터 구조 구성
    if (!elementListeners.has(element as ElementWithEventMap)) {
      elementListeners.set(element as ElementWithEventMap, new Map());
    }
    
    const elementListenersMap = elementListeners.get(element as ElementWithEventMap);
    if (!elementListenersMap) return () => {};
    
    if (!elementListenersMap.has(type as string)) {
      elementListenersMap.set(type as string, new Set());
    }
    
    const typeListeners = elementListenersMap.get(type as string);
    if (!typeListeners) return () => {};
    
    const listenerData: EventListenerData = {
      listener,
      options,
      lastUsed: Date.now()
    };
    
    typeListeners.add(listenerData);
    
    // 정리 함수 반환
    return () => {
      element.removeEventListener(type, listener, options);
      if (typeListeners) {
        typeListeners.delete(listenerData);
      }
    };
  } catch (error) {
    console.warn('이벤트 리스너 추가 중 오류:', error);
    return () => {}; // 빈 정리 함수 반환
  }
}

/**
 * 사용하지 않는 모든 리소스 정리
 * 동적 모듈과 이벤트 리스너 모두 정리
 */
export function cleanupDynamicResources(): number {
  try {
    // 동적 모듈 정리
    const unloadedModules = unloadDynamicModules();
    
    // 이벤트 리스너 정리
    const cleanedListeners = cleanupEventListeners();
    
    const total = unloadedModules + cleanedListeners;
    if (total > 0) {
      console.log(`총 ${total}개의 동적 리소스 정리됨`);
    }
    
    return total;
  } catch (error) {
    console.warn('동적 리소스 정리 중 오류:', error);
    return 0;
  }
}

// Window 타입 확장
declare global {
  interface Window {
    _dynamicModules?: Map<string, DynamicModule>;
  }
}
