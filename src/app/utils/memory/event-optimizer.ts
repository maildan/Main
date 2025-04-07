/**
 * 이벤트 최적화 유틸리티
 */

/**
 * 이벤트 리스너 최적화
 * 메모리 효율을 위해 불필요한 이벤트 리스너를 정리합니다.
 */
export function optimizeEventListeners(): boolean {
  // 브라우저 환경이 아니면 무시
  if (typeof window === 'undefined') return false;

  try {
    let optimizedCount = 0;

    // 감시 중인 이벤트 리스너 정리
    if (window.__eventListeners) {
      const listeners = window.__eventListeners;
      for (const key in listeners) {
        if (Object.prototype.hasOwnProperty.call(listeners, key)) {
          const handlers = listeners[key];
          // 핸들러 배열인 경우 정리 함수 호출
          if (Array.isArray(handlers)) {
            handlers.forEach(handler => {
              if (handler.cleanup && typeof handler.cleanup === 'function') {
                handler.cleanup();
                optimizedCount++;
              }
            });
          }
        }
      }

      // 정리된 리스너 목록 초기화
      window.__eventListeners = {};
    }

    return optimizedCount > 0;
  } catch (error) {
    console.error('이벤트 리스너 최적화 오류:', error);
    return false;
  }
}
