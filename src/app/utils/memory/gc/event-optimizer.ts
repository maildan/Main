/**
 * 이벤트 리스너 최적화 유틸리티
 */
import { cleanupDOM } from '../dom-optimizer';

// 이벤트 리스너 캐시 유지
const eventListenerCache = new WeakMap<Element, Map<string, Set<EventListenerData>>>();

interface EventListenerData {
  listener: EventListener;
  options?: boolean | AddEventListenerOptions;
  lastUsed: number;
}

// 동적 모듈 타입 정의
interface DynamicModule {
  isActive: boolean;
  lastUsed?: number;
  unload: () => void;
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
  eventListenerCache.forEach((listenerMap, element) => {
    if (!document.contains(element)) {
      // DOM에서 제거된 요소의 캐시 정리
      eventListenerCache.delete(element);
      removed++;
      return;
    }
    
    listenerMap.forEach((listeners, eventType) => {
      const oldListeners = Array.from(listeners).filter(data => 
        (now - data.lastUsed) > olderThan
      );
      
      oldListeners.forEach(data => {
        element.removeEventListener(eventType, data.listener, data.options);
        listeners.delete(data);
        removed++;
      });
      
      if (listeners.size === 0) {
        listenerMap.delete(eventType);
      }
    });
    
    if (listenerMap.size === 0) {
      eventListenerCache.delete(element);
    }
  });
  
  return removed;
}

/**
 * 동적 모듈 정리
 * 사용하지 않는 동적으로 로드된 모듈을 정리합니다.
 */
export function unloadDynamicModules(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    // 동적 모듈 캐시 초기화
    if (!window._dynamicModules) {
      window._dynamicModules = new Map<string, DynamicModule>();
      return 0;
    }
    
    const beforeSize = window._dynamicModules.size;
    
    // 사용 안 함으로 표시된 모듈만 제거
    const modulesToRemove: string[] = [];
    window._dynamicModules.forEach((module: DynamicModule, key: string) => {
      if (!module.isActive || (module.lastUsed && Date.now() - module.lastUsed > 180000)) {
        try {
          module.unload();
        } catch (e) {
          console.warn(`모듈 언로드 중 오류 (${key}):`, e);
        }
        modulesToRemove.push(key);
      }
    });
    
    // 모듈 제거
    modulesToRemove.forEach(key => {
      window._dynamicModules?.delete(key);
    });
    
    return beforeSize - (window._dynamicModules?.size || 0);
  } catch (error) {
    console.warn('동적 모듈 정리 중 오류:', error);
    return 0;
  }
}

/**
 * 특정 이벤트에 대한 리스너 삭제
 * @param element 타겟 요소
 * @param eventTypes 이벤트 타입 배열
 */
export function removeEventListeners(
  element: Element,
  eventTypes: string[]
): void {
  // 구현 생략
}

// 나머지 코드...
