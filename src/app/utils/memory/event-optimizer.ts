/**
 * 이벤트 최적화 유틸리티
 */
import { logger } from './logger';

// 이벤트 최적화 추적을 위한 맵
const optimizedEvents = new Map<string, Set<EventTarget>>();

/**
 * 이벤트 리스너를 최적화합니다.
 */
export async function optimizeEvents(): Promise<boolean> {
  try {
    logger.info('[Event Optimizer] 이벤트 리스너 최적화 시작');

    // 브라우저 환경인 경우만 실행
    if (typeof window === 'undefined') {
      return false;
    }

    // 리스너가 없는 빈 요소 감지 및 정리
    cleanupEmptyEventListeners();

    // 추적된 최적화된 이벤트 리스너 검사
    checkTrackedEventListeners();

    return true;
  } catch (error) {
    logger.error('[Event Optimizer] 이벤트 최적화 중 오류 발생', { error });
    return false;
  }
}

/**
 * 리스너가 없는 빈 요소 정리
 */
function cleanupEmptyEventListeners(): void {
  try {
    // 문서 내의 모든 요소를 가져오기
    const allElements = document.querySelectorAll('*');
    let cleanedCount = 0;

    allElements.forEach(element => {
      if (!element.parentNode && element !== document.body && element !== document.documentElement) {
        // 부모 노드가 없는 분리된 요소는 정리
        element.remove();
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      logger.info(`[Event Optimizer] ${cleanedCount}개의 분리된 요소를 정리했습니다.`);
    }
  } catch (err) {
    logger.error('[Event Optimizer] 빈 이벤트 리스너 정리 중 오류 발생');
  }
}

/**
 * 추적된 이벤트 리스너 검사
 */
function checkTrackedEventListeners(): void {
  if (optimizedEvents.size === 0) {
    return;
  }

  let cleanedCount = 0;

  optimizedEvents.forEach((targets, eventType) => {
    const removedTargets = new Set<EventTarget>();

    targets.forEach(target => {
      // DOM 요소인 경우, 문서에 연결되어 있는지 확인
      if (target instanceof HTMLElement && !document.contains(target)) {
        removedTargets.add(target);
        cleanedCount++;
      }
    });

    // 제거된 대상 업데이트
    removedTargets.forEach(target => {
      targets.delete(target);
    });

    // 이 이벤트 유형에 대한 대상이 없으면 맵에서 제거
    if (targets.size === 0) {
      optimizedEvents.delete(eventType);
    }
  });

  if (cleanedCount > 0) {
    logger.info(`[Event Optimizer] ${cleanedCount}개의 추적된 이벤트 리스너를 정리했습니다.`);
  }
}

/**
 * 이벤트 리스너 등록을 최적화합니다.
 * 기본 addEventListener 대신 이 함수를 사용하여 리스너를 추적합니다.
 */
export function registerOptimizedEventListener<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K,
  listener: EventListener,
  options?: boolean | AddEventListenerOptions
): () => void {
  // 이벤트 유형에 대한 대상 집합이 없으면 생성
  if (!optimizedEvents.has(type as string)) {
    optimizedEvents.set(type as string, new Set());
  }

  // 대상 추가
  optimizedEvents.get(type as string)?.add(target);

  // 실제 이벤트 리스너 등록
  target.addEventListener(type, listener as EventListener, options);

  // 리스너 제거 함수 반환
  return () => {
    target.removeEventListener(type, listener as EventListener, options);
    // 추적된 대상에서 제거
    optimizedEvents.get(type as string)?.delete(target);
  };
} 