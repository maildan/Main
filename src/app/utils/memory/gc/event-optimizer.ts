/**
 * 이벤트 관련 최적화 모듈
 */

/**
 * 이벤트 리스너 정리
 */
export function cleanupEventListeners(): void {
  // 이벤트 리스너 정리 작업 구현
  try {
    // 직접 추적 중인 이벤트 리스너만 제거 가능
    // 앱에서 사용하는 대역별 이벤트 리스너 정리 구현
    
    // window resize 이벤트 같은 자주 발생하는 이벤트의 불필요한 리스너 정리
    const obsoleteEventNames = ['resize', 'mousemove', 'scroll'];
    
    // 전역 이벤트 확인 및 비상 처리 (React 사용 시 직접 접근하지 않는 것이 좋음)
    if (window._eventListeners && typeof window._eventListeners === 'object') {
      obsoleteEventNames.forEach(eventName => {
        if (window._eventListeners && window._eventListeners[eventName]) {
          window._eventListeners[eventName].forEach(handler => {
            try {
              if (typeof handler.cleanup === 'function') {
                handler.cleanup();
              }
            } catch (e) {
              // 개별 핸들러 정리 실패 무시
            }
          });
        }
      });
    }
  } catch (error) {
    console.warn('이벤트 리스너 정리 중 오류:', error);
  }
}

/**
 * 이벤트 리스너 최적화
 * 불필요한 이벤트 리스너 정리 및 최적화
 */
export function optimizeEventListeners(): void {
  try {
    // 이벤트 리스너 최적화 작업 구현
    cleanupEventListeners();
    
    // 뷰포트 밖 요소의 불필요한 이벤트 리스너 제거
    const elements = document.querySelectorAll('[data-optimize-events="true"]');
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) {
        // 이벤트 리스너 임시 제거
        const htmlElement = el as HTMLElement & { _eventHandlers?: Record<string, any[]> };
        if (htmlElement._eventHandlers) {
          Object.keys(htmlElement._eventHandlers).forEach(event => {
            const handlers = htmlElement._eventHandlers![event];
            handlers.forEach((handlerInfo: any) => {
              el.removeEventListener(event, handlerInfo.handler);
              handlerInfo.removed = true;
            });
          });
          el.setAttribute('data-events-optimized', 'true');
        }
      } else if (el.getAttribute('data-events-optimized') === 'true') {
        // 이벤트 리스너 복구
        const htmlElement = el as HTMLElement & { _eventHandlers?: Record<string, any[]> };
        if (htmlElement._eventHandlers) {
          Object.keys(htmlElement._eventHandlers).forEach(event => {
            const handlers = htmlElement._eventHandlers![event];
            handlers.forEach((handlerInfo: any) => {
              if (handlerInfo.removed) {
                el.addEventListener(event, handlerInfo.handler);
                handlerInfo.removed = false;
              }
            });
          });
          el.removeAttribute('data-events-optimized');
        }
      }
    });
  } catch (error) {
    console.warn('이벤트 리스너 최적화 중 오류:', error);
  }
}

/**
 * 동적 모듈 언로드
 * 사용하지 않는 동적 모듈 언로드
 */
export function unloadDynamicModules(): void {
  try {
    // 동적 모듈 언로드 작업 구현
    if (window._dynamicModules) {
      const moduleList = window._dynamicModules;
      Object.keys(moduleList).forEach(moduleName => {
        const module = moduleList[moduleName];
        if (module && module.lastUsed) {
          const now = Date.now();
          const idleTime = now - module.lastUsed;
          
          // 5분 이상 사용하지 않은 모듈 언로드
          if (idleTime > 300000 && typeof module.unload === 'function') {
            module.unload();
            module.loaded = false;
            console.debug(`동적 모듈 언로드됨: ${moduleName}`);
          }
        }
      });
    }
  } catch (error) {
    console.warn('동적 모듈 언로드 중 오류:', error);
  }
}
