/**
 * 응급 메모리 복구 기능
 * 
 * 메모리 부족 상황에서 사용 가능한 비상 복구 기능을 제공합니다.
 */

/**
 * 응급 메모리 복구 수행
 * 
 * 위험한 수준의 메모리 사용량이 감지될 때 호출되어 메모리를 확보합니다.
 * 
 * @returns {boolean} 복구 성공 여부
 */
export function performEmergencyRecovery(): boolean {
  console.warn('[메모리 비상] 응급 메모리 복구 기능 실행');

  try {
    // 1. 이벤트 리스너 정리
    cleanupEventListeners();

    // 2. DOM 리소스 정리
    cleanupDomResources();

    // 3. 캐시 정리
    clearAllCaches();

    // 4. 타이머 정리
    clearTimers();

    // 5. 가비지 컬렉션 유도
    if (typeof window !== 'undefined' && window.gc) {
      window.gc();
    } else {
      forceGarbageCollection();
    }

    // 진단 정보 수집
    const diagnostics = collectMemoryDiagnostics();
    console.log('[메모리 비상] 진단 정보:', diagnostics);

    // 앱 복구 유틸리티에 진단 정보 등록
    if (typeof window !== 'undefined' && window.__appRecovery) {
      (window.__appRecovery as any).diagnostics = () => collectMemoryDiagnostics();
    }

    return true;
  } catch (error) {
    console.error('[메모리 비상] 응급 복구 중 오류 발생:', error);
    return false;
  }
}

/**
 * DOM 리소스 정리
 * 
 * 불필요한 DOM 요소를 제거하여 메모리를 확보합니다.
 */
function cleanupDomResources(): void {
  if (typeof document === 'undefined') return;

  try {
    // 숨겨진 이미지 및 미사용 요소 제거
    const hiddenElements = document.querySelectorAll('.hidden, [aria-hidden="true"], [style*="display: none"]');
    hiddenElements.forEach((el) => {
      // 중요하지 않은 요소만 제거
      if (!el.classList.contains('critical') && !el.hasAttribute('data-preserve')) {
        el.parentNode?.removeChild(el);
      }
    });

    // 이미지 src 정리
    const unusedImages = document.querySelectorAll('img:not(:visible)');
    unusedImages.forEach((img) => {
      if (img instanceof HTMLImageElement && !img.hasAttribute('data-preserve')) {
        // 참조를 임시 data-src에 저장하고 원본 src 제거
        img.setAttribute('data-src', img.src);
        img.removeAttribute('src');
      }
    });
  } catch (e) {
    console.warn('[메모리 비상] DOM 정리 중 오류:', e);
  }
}

/**
 * 모든 캐시 정리
 * 
 * 브라우저 캐시 및 애플리케이션 캐시를 정리합니다.
 */
function clearAllCaches(): void {
  if (typeof window === 'undefined') return;

  try {
    // 브라우저 캐시 API가 있으면 정리
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(name => {
          caches.delete(name);
        });
      });
    }

    // 애플리케이션 캐시 정리
    if (window.__imageResizeCache) {
      // 타입 단언을 사용하여 충돌 해결
      (window.__imageResizeCache as Map<string, any>).clear();
    }

    if (window.__objectUrls) {
      for (const [_key, url] of window.__objectUrls) {
        URL.revokeObjectURL(url);
      }
      window.__objectUrls.clear();
    }

    // LocalStorage 임시 데이터 정리
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('temp_') || key.startsWith('cache_'))) {
        localStorage.removeItem(key);
      }
    }

    // SessionStorage 정리
    sessionStorage.clear();
  } catch (e) {
    console.warn('[메모리 비상] 캐시 정리 중 오류:', e);
  }
}

/**
 * 불필요한 이벤트 리스너 정리
 * 
 * 불필요한 이벤트 리스너를 제거하여 메모리 누수를 방지합니다.
 */
function cleanupEventListeners(): void {
  if (typeof window === 'undefined') return;

  try {
    // 낮은 우선순위 이벤트 리스너 정리
    const lowPriorityEvents = ['mousemove', 'resize', 'scroll'];

    lowPriorityEvents.forEach(eventType => {
      // 전역 이벤트 리스너 래핑 (직접적인 제거는 위험함)
      const originalAddEventListener = window.addEventListener;
      window.addEventListener = function (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        if (type === eventType) {
          console.log(`[메모리 비상] ${eventType} 이벤트 리스너 추가 차단됨`);
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    });

    // 이벤트 리스너 최적화 모듈 사용 (있는 경우)
    // 타입 확장을 위한 인터페이스 사용
    const memOptimizer = window.__memoryOptimizer as any;
    if (memOptimizer && typeof memOptimizer.optimizeEventListeners === 'function') {
      memOptimizer.optimizeEventListeners();
    }
  } catch (e) {
    console.warn('[메모리 비상] 이벤트 리스너 정리 중 오류:', e);
  }
}

/**
 * 불필요한 타이머를 정리하여 메모리와 CPU 사용량을 줄입니다.
 */
function clearTimers(): void {
  if (typeof window === 'undefined') return;

  try {
    // 알려진 타이머 ID 정리
    const memOptimizer = window.__memoryOptimizer as any;
    const timerIds = memOptimizer?.timerIds;

    if (timerIds && Array.isArray(timerIds)) {
      timerIds.forEach((id: number) => {
        clearTimeout(id);
        clearInterval(id);
      });
      timerIds.length = 0;
    }
  } catch (e) {
    console.warn('[메모리 비상] 타이머 정리 중 오류:', e);
  }
}

/**
 * 메모리 진단 정보 수집
 * 
 * 현재 메모리 사용 상태에 대한 진단 정보를 수집합니다.
 * 
 * @returns {Record<string, unknown>} 진단 정보
 */
export function collectMemoryDiagnostics(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};

  try {
    // 메모리 정보 수집
    const memoryInfo: Record<string, unknown> = {};

    // 브라우저 메모리 API (Chrome 전용)
    if ((performance as any).memory) {
      const { totalJSHeapSize, usedJSHeapSize, jsHeapSizeLimit } = (performance as any).memory;
      memoryInfo.browser = {
        totalHeap: totalJSHeapSize,
        usedHeap: usedJSHeapSize,
        heapLimit: jsHeapSizeLimit,
        percentUsed: (usedJSHeapSize / totalJSHeapSize) * 100
      };
    }

    // DOM 크기
    memoryInfo.dom = {
      elements: document.querySelectorAll('*').length,
      images: document.querySelectorAll('img').length,
      scripts: document.querySelectorAll('script').length,
      styleSheets: document.styleSheets.length
    };

    // 스토리지 사용량
    memoryInfo.storage = {
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length
    };

    // 이벤트 리스너 수 (추정)
    const allElements = document.querySelectorAll('*');
    let listenerCount = 0;

    if ((window as any).getEventListeners) {
      // Chrome 개발자 도구에서 제공하는 getEventListeners 사용
      try {
        // 타입 안전하게 수정
        const windowListeners = (window as any).getEventListeners(window) || {};
        const documentListeners = (window as any).getEventListeners(document) || {};
        const bodyListeners = (window as any).getEventListeners(document.body) || {};

        listenerCount += Object.values(windowListeners).length;
        listenerCount += Object.values(documentListeners).length;
        listenerCount += Object.values(bodyListeners).length;
      } catch (_err) {
        // getEventListeners 호출 실패 시 무시
      }
    } else {
      // 추정: 요소당 평균 0.5개 리스너로 계산
      listenerCount = Math.round(allElements.length * 0.5);
    }

    memoryInfo.listeners = {
      estimated: listenerCount,
      window: window.onresize || window.onload ? 'has listeners' : 'no direct listeners',
      document: document.onclick || document.onkeydown ? 'has listeners' : 'no direct listeners',
      body: document.body.onclick ? 'has listeners' : 'no direct listeners'
    };

    return {
      timestamp: Date.now(),
      ...memoryInfo
    };
  } catch (error) {
    console.error('[메모리 비상] 진단 정보 수집 중 오류:', error);
    return {
      error: String(error),
      timestamp: Date.now()
    };
  }
}

/**
 * 강제 가비지 컬렉션 유도
 * 
 * gc 함수가 노출되지 않은 환경에서 간접적으로 GC를 유도합니다.
 */
function forceGarbageCollection(): void {
  try {
    // 대량 객체 생성 후 해제하여 GC 유도
    const objects: Record<string, unknown>[] = [];
    for (let i = 0; i < 10000; i++) {
      objects.push({ index: i, data: new Array(100).fill('x') });
    }
    // 참조 제거
    objects.length = 0;

    // 대량 배열 생성 후 해제
    const arr = new Array(1000000).fill(0);
    // 참조 제거
    arr.length = 0;

    // 추가 메모리 압박
    setTimeout(() => {
      // 임시 대량 객체
      const tempObjects: unknown[] = [];
      for (let i = 0; i < 1000; i++) {
        tempObjects.push({ data: new Array(1000).fill('temp') });
      }
      // 10ms 후 참조 해제
      setTimeout(() => {
        tempObjects.length = 0;
      }, 10);
    }, 0);
  } catch (e) {
    console.warn('[메모리 비상] GC 유도 중 오류:', e);
  }
}

// 애플리케이션 복구 유틸리티를 전역 객체에 노출
if (typeof window !== 'undefined') {
  // 타입 안전한 방식으로 속성 초기화
  if (!window.__appRecovery) {
    (window as any).__appRecovery = {};
  }

  // 타입 단언을 사용하여 충돌 해결
  const appRecovery = window.__appRecovery as any;

  appRecovery.emergencyCleanup = performEmergencyRecovery;
  appRecovery.diagnostics = collectMemoryDiagnostics;
  appRecovery.optimizeMemory = (level: number): boolean => {
    try {
      if (level >= 3) {
        performEmergencyRecovery();
      } else {
        clearAllCaches();
        clearTimers();
      }
      return true;
    } catch {
      return false;
    }
  };
}

/**
 * 긴급 메모리 복구 함수
 * @param force 강제 실행 여부
 * @returns 복구 결과
 */
export function emergencyRecovery(force: boolean = false): {
  success: boolean;
  freedMB: number;
  actions: string[];
} {
  try {
    const actions: string[] = [];
    let freedMB = 0;

    // 1. 가비지 컬렉션 요청
    if (typeof window !== 'undefined' && window.gc) {
      window.gc();
      actions.push('garbage_collection');
      freedMB += 10;
    }

    // 2. 로컬 스토리지 정리
    if (typeof localStorage !== 'undefined') {
      try {
        const tempItems = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('temp_')) {
            tempItems.push(key);
          }
        }

        tempItems.forEach(key => localStorage.removeItem(key));

        if (tempItems.length > 0) {
          actions.push('localStorage_cleanup');
          freedMB += 0.5;
        }
      } catch (e) {
        console.error('로컬 스토리지 정리 오류:', e);
      }
    }

    // 3. 세션 스토리지 정리
    if (typeof sessionStorage !== 'undefined') {
      try {
        const tempItems = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('temp_')) {
            tempItems.push(key);
          }
        }

        tempItems.forEach(key => sessionStorage.removeItem(key));

        if (tempItems.length > 0) {
          actions.push('sessionStorage_cleanup');
          freedMB += 0.3;
        }
      } catch (e) {
        console.error('세션 스토리지 정리 오류:', e);
      }
    }

    return {
      success: true,
      freedMB,
      actions
    };
  } catch (error) {
    console.error('긴급 복구 오류:', error);
    return {
      success: false,
      freedMB: 0,
      actions: ['recovery_failed']
    };
  }
}

export default {
  emergencyRecovery
};
