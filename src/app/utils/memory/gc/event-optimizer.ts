/**
 * 이벤트 관련 메모리 최적화
 * 과도한 이벤트 리스너와 관련된 메모리 누수 방지
 */

import { debounce } from 'lodash';

type EventHandler = () => void;
type EventCleanupHandler = () => void;
type EventCleanupRegistry = Map<string, EventCleanupHandler[]>;

// 이벤트 핸들러 등록 관리
const eventCleanupRegistry: EventCleanupRegistry = new Map();
// 사용되지 않는 변수 제거: const globalHandlers = {};

/**
 * 최적화된 이벤트 리스너 등록
 * @param element DOM 엘리먼트
 * @param eventType 이벤트 타입
 * @param handler 이벤트 핸들러
 * @param options 이벤트 리스너 옵션
 * @returns 정리 함수
 */
export function registerOptimizedEventListener(
  element: HTMLElement | Window | Document,
  eventType: string,
  handler: EventListenerOrEventListenerObject,
  options?: AddEventListenerOptions | boolean
): EventCleanupHandler {
  // 요소와 핸들러가 있는지 확인
  if (!element || !handler) {
    console.warn('Invalid element or handler for event registration');
    return () => {}; // No-op cleanup function
  }

  // 이벤트 리스너 등록
  element.addEventListener(eventType, handler, options);

  // 정리 함수 생성
  const cleanup = () => {
    element.removeEventListener(eventType, handler, options);
  };

  // 등록된 정리 함수를 등록
  const key = getElementKey(element);

  if (!eventCleanupRegistry.has(key)) {
    eventCleanupRegistry.set(key, []);
  }

  const cleanupHandlers = eventCleanupRegistry.get(key)!;
  cleanupHandlers.push(cleanup);

  return cleanup;
}

/**
 * 디바운스된 이벤트 핸들러 생성
 * @param handler 원본 핸들러
 * @param wait 대기 시간
 * @returns 디바운스된 핸들러
 */
export function createDebouncedEventHandler<T extends (...args: any[]) => void>(
  handler: T,
  wait: number
): T {
  return debounce(handler, wait) as unknown as T;
}

/**
 * 특정 요소의 모든 이벤트 리스너 정리
 * @param element DOM 엘리먼트
 */
export function cleanupAllEventListeners(element: HTMLElement | Window | Document): void {
  const key = getElementKey(element);
  const cleanupHandlers = eventCleanupRegistry.get(key);

  if (cleanupHandlers && cleanupHandlers.length > 0) {
    // 모든 정리 함수 실행
    cleanupHandlers.forEach(cleanup => cleanup());

    // 정리 함수 목록 비우기
    eventCleanupRegistry.set(key, []);
  }
}

/**
 * 요소에 대한 고유 키 생성
 */
function getElementKey(element: HTMLElement | Window | Document): string {
  if (element === window) {
    return 'window';
  } else if (element === document) {
    return 'document';
  } else if (element instanceof HTMLElement) {
    // ID가 있으면 사용, 없으면 태그명과 클래스 사용
    const id = element.id || '';
    const tagName = element.tagName || '';
    const classes = element.className || '';

    return `${tagName}#${id}.${classes}`;
  } else {
    return String(Math.random()); // 폴백
  }
}

/**
 * 메모리 누수 방지를 위한 이벤트 최적화
 */
export function optimizeEvents(): void {
  // 현재 등록된 모든 이벤트 정리 핸들러 수 확인
  let totalHandlers = 0;
  for (const handlers of eventCleanupRegistry.values()) {
    totalHandlers += handlers.length;
  }

  console.log(`Current event handlers registered: ${totalHandlers}`);

  // 지나치게 많은 핸들러가 등록되어 있다면 경고
  if (totalHandlers > 100) {
    console.warn('High number of event handlers detected. Consider cleaning up unused listeners.');
  }
}

/**
 * 스크롤 이벤트 최적화
 * @param handler 스크롤 이벤트 핸들러
 * @param wait 디바운스 대기 시간
 * @returns 정리 함수
 */
export function registerOptimizedScrollListener(
  handler: (event: Event) => void,
  wait = 100
): EventCleanupHandler {
  // 디바운스된 핸들러 생성
  const debouncedHandler = createDebouncedEventHandler(handler, wait);

  // 스크롤 이벤트 리스너 등록 (passive true로 성능 최적화)
  return registerOptimizedEventListener(window, 'scroll', debouncedHandler, { passive: true });
}

/**
 * 최적화된 리사이즈 이벤트 리스너 등록
 * @param handler 이벤트 핸들러
 * @param wait 디바운스 대기 시간
 * @returns 정리 함수
 */
export function registerOptimizedResizeListener(
  handler: (event: Event) => void,
  wait = 200
): EventCleanupHandler {
  // 디바운스된 핸들러 생성
  const debouncedHandler = createDebouncedEventHandler(handler, wait);

  // 리사이즈 이벤트 리스너 등록
  return registerOptimizedEventListener(window, 'resize', debouncedHandler);
}

/**
 * 이벤트 최적화 모듈 - ES 모듈 방식으로 내보내기
 */
export default {
  registerOptimizedEventListener,
  createDebouncedEventHandler,
  cleanupAllEventListeners,
  optimizeEvents,
  registerOptimizedScrollListener,
  registerOptimizedResizeListener,
};

/**
 * 페이지 언로드 시 남아있는 모든 핸들러 정리
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    try {
      // 모든 등록된 정리 함수 실행
      for (const [_key, handlers] of eventCleanupRegistry.entries()) {
        handlers.forEach(cleanup => cleanup());
      }

      // 등록 정보 초기화
      eventCleanupRegistry.clear();
    } catch (_) {
      // 언로드 중 오류는 무시
    }
  });
}
