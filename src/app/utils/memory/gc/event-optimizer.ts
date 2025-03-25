/**
 * 이벤트 최적화 유틸리티
 * 
 * 이벤트 리스너 관리 및 최적화 기능을 제공합니다.
 */

import { cleanupOldElements, trackEventListener } from './dom-cleanup';
import { EventListenerData, DynamicModule } from '../types;

// 요소별 이벤트 리스너 맵
const elementListeners = new Map<HTMLElement, Map<string, Set<EventListenerData>>>();

// 이벤트 타입별 전역 핸들러 맵
const globalHandlers = new Map<string, EventListener>();

// 모듈별 이벤트 리스너 맵
const moduleListeners = new Map<string, Set<{ element: HTMLElement, type: string, listener: EventListener }>>();

// 동적 모듈 캐시
let dynamicModuleCache: Map<string, DynamicModule> | undefined;

/**
 * 이벤트 리스너 등록
 * @param element 대상 요소
 * @param eventType 이벤트 유형
 * @param listener 이벤트 리스너
 * @param options 이벤트 옵션
 */
export function registerEventListener(
  element: HTMLElement,
  eventType: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions
): void {
  if (!element) return;
  
  // 요소에 대한 리스너 맵 가져오기 또는 생성
  if (!elementListeners.has(element)) {
    elementListeners.set(element, new Map());
  }
  
  const listenerMap = elementListeners.get(element)!;
  
  // 이벤트 타입에 대한 리스너 집합 가져오기 또는 생성
  if (!listenerMap.has(eventType)) {
    listenerMap.set(eventType, new Set());
  }
  
  const listeners = listenerMap.get(eventType)!;
  
  // 리스너 데이터 생성 및 등록
  const data: EventListenerData = {
    listener,
    options,
    lastUsed: Date.now()
  };
  
  listeners.add(data);
  
  // DOM 클린업 유틸리티에도 이벤트 리스너 추적
  trackEventListener(element, eventType, listener);
}

/**
 * 모듈과 연결된 이벤트 리스너 등록
 * @param moduleId 모듈 ID
 * @param element 대상 요소
 * @param eventType 이벤트 유형
 * @param listener 이벤트 리스너
 * @param options 이벤트 옵션
 */
export function registerModuleEventListener(
  moduleId: string,
  element: HTMLElement,
  eventType: string,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions
): void {
  // 일반 이벤트 리스너 등록
  registerEventListener(element, eventType, listener, options);
  
  // 모듈별 리스너 추적을 위한 등록
  if (!moduleListeners.has(moduleId)) {
    moduleListeners.set(moduleId, new Set());
  }
  
  moduleListeners.get(moduleId)!.add({
    element,
    type: eventType,
    listener
  });
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
    if (typeof window === 'undefined') {
      return 0;
    }
    
    // 글로벌 객체에서 동적 모듈 캐시 얻기
    if (!dynamicModuleCache && window._dynamicModules) {
      dynamicModuleCache = window._dynamicModules;
    }
    
    if (!dynamicModuleCache) {
      return 0;
    }
    
    const now = Date.now();
    let unloadedCount = 0;
    const modulesToUnload: string[] = [];
    
    // 언로드할 모듈 식별
    dynamicModuleCache.forEach((module, key) => {
      if (now - module.lastUsed > 600000) { // 10분 이상 사용하지 않은 모듈
        modulesToUnload.push(key);
      }
    });
    
    // 식별된 모듈 언로드
    modulesToUnload.forEach(key => {
      const module = dynamicModuleCache?.get(key);
      if (module) {
        try {
          if (typeof module.unload === 'function') {
            module.unload();
          }
          
          // 모듈과 연결된 이벤트 리스너 제거
          cleanupModuleEventListeners(key);
          
          // 모듈 캐시에서 제거
          dynamicModuleCache?.delete(key);
          unloadedCount++;
        } catch (err) {
          console.error(`모듈 언로드 오류 (${key}):`, err);
        }
      }
    });
    
    return unloadedCount;
  } catch (error) {
    console.error('동적 모듈 정리 오류:', error);
    return 0;
  }
}

/**
 * 불필요한 이벤트 리스너 정리
 * 페이지 성능을 위해 불필요한 이벤트 리스너를 정리합니다.
 */
export function cleanupEventListeners(): number {
  // DOM 클린업 유틸리티 활용
  return cleanupOldElements();
}

/**
 * 모듈과 연결된 이벤트 리스너 정리
 * @param moduleId 모듈 ID
 */
function cleanupModuleEventListeners(moduleId: string): number {
  if (!moduleListeners.has(moduleId)) {
    return 0;
  }
  
  const listeners = moduleListeners.get(moduleId)!;
  let removed = 0;
  
  listeners.forEach(({ element, type, listener }) => {
    try {
      element.removeEventListener(type, listener);
      removed++;
    } catch (err) {
      // 이미 제거된 요소에 대한 오류 무시
    }
  });
  
  // 모듈 리스너 맵에서 제거
  moduleListeners.delete(moduleId);
  
  return removed;
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
  if (!element) return () => {};
  
  // 모든 이벤트 리스너를 EventListener 형식으로 변환하여 처리
  const eventListener = listener as unknown as EventListener;
  
  // 이벤트 리스너 등록
  element.addEventListener(type, eventListener, options);
  
  // 이벤트 리스너 추적
  registerEventListener(element, type as string, eventListener, options);
  
  // 이벤트 제거 함수 반환
  return () => {
    element.removeEventListener(type, eventListener, options);
  };
}
