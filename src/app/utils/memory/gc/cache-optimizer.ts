/**
 * 캐시 관련 최적화 모듈
 */
import { clearLargeObjectsAndCaches } from '../storage-cleaner';

/**
 * 비활성 캐시 정리
 */
export function clearInactiveCache(): void {
  // 캐시 정리 작업 구현
  // 웹 애플리케이션에서 사용하는 임시 데이터 정리
  if (window.caches) {
    // 오래된 캐시 삭제 (선택적)
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        if (cacheName.includes('temp') || cacheName.includes('nonessential')) {
          caches.delete(cacheName);
        }
      });
    }).catch(err => {
      console.warn('캐시 정리 중 오류:', err);
    });
  }
}

/**
 * 모든 낮은 우선순위 캐시 정리
 */
export function clearAllLowPriorityCache(): void {
  // 낮은 우선순위 캐시 정리 작업 구현
  try {
    // 로컬 스토리지의 임시 항목 정리
    if (window.localStorage) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // 세션 스토리지의 임시 항목 정리
    if (window.sessionStorage) {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('temp_') || key.includes('cache')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.warn('우선순위가 낮은 캐시 정리 중 오류:', error);
  }
}

/**
 * 모든 캐시 정리
 */
export function clearAllCache(): void {
  try {
    // 브라우저 캐시 정리
    clearBrowserCache();
    
    // 애플리케이션 캐시 정리
    clearAppCache();
    
    console.log('모든 캐시 정리 완료');
  } catch (error) {
    console.error('캐시 정리 중 오류:', error);
  }
}

/**
 * 브라우저 캐시 정리 (가능한 경우)
 */
function clearBrowserCache(): void {
  try {
    // sessionStorage 초기화 (이 세션 전용)
    if (window.sessionStorage) {
      sessionStorage.clear();
    }
    
    // Cache API를 사용하는 경우 (Service Worker 캐시 등)
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          // 앱 전용 캐시만 정리 (다른 웹사이트 캐시는 건드리지 않음)
          if (cacheName.includes('typing-stats-app')) {
            caches.delete(cacheName);
          }
        });
      }).catch(e => console.warn('캐시 API 접근 오류:', e));
    }
  } catch (error) {
    console.warn('브라우저 캐시 정리 중 오류:', error);
  }
}

/**
 * 애플리케이션 캐시 정리
 */
function clearAppCache(): void {
  try {
    // 앱 정의 캐시 객체 정리
    
    // 1. 이미지 변환 캐시
    cleanupImageResizeCache();
    
    // 2. 객체 URL 캐시
    cleanupObjectUrls();
    
    // 3. 일반 메모리 캐시
    cleanupMemoryCache();
    
    // 4. 스타일 캐시
    cleanupStyleCache();
    
    // 5. 위젯 캐시
    if (window.__widgetCache) {
      if (window.__widgetCache instanceof Map) {
        window.__widgetCache.clear();
      } else {
        window.__widgetCache = new Map<string, any>();
      }
    }
  } catch (error) {
    console.warn('앱 캐시 정리 중 오류:', error);
  }
}

/**
 * 모든 캐시 해제 (가장 극단적인 조치)
 */
export function releaseAllCaches(): void {
  // 모든 캐시 해제 작업 구현
  try {
    // IndexedDB 캐시 정리
    if (window.indexedDB) {
      window.indexedDB.databases().then(databases => {
        databases.forEach(db => {
          try {
            if (db.name) { // null 체크 추가
              window.indexedDB.deleteDatabase(db.name);
            }
          } catch (e) {
            // 개별 DB 삭제 실패 처리
          }
        });
      }).catch(err => {
        console.warn('IndexedDB 정리 중 오류:', err);
      });
    }
    
    // Storage API 정리
    if (navigator.storage && navigator.storage.estimate) {
      // 사용량 확인 후 필요시 정리
      navigator.storage.estimate().then(estimate => {
        if (estimate.usage && estimate.usage > 10 * 1024 * 1024) {
          // 10MB 이상 사용 중인 경우 캐시 정리 시도
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            // 서비스 워커에 캐시 정리 요청
            navigator.serviceWorker.controller.postMessage({
              type: 'CLEAR_ALL_CACHES'
            });
          }
        }
      });
    }
  } catch (error) {
    console.warn('모든 캐시 해제 중 오류:', error);
  }
}

/**
 * 스토리지 캐시 정리
 * localStorage, sessionStorage 등의 캐시 정리
 */
export function clearStorageCaches(): void {
  try {
    // 로컬 스토리지와 대형 객체 캐시 정리
    clearLargeObjectsAndCaches();
    
    // 추가 스토리지 캐시 정리 작업
    if (window.sessionStorage) {
      // 세션 스토리지 정리 (temp_ 또는 cache_ 시작하는 항목)
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.warn('스토리지 캐시 정리 중 오류:', error);
  }
}

/**
 * 오래된 캐시 항목만 정리
 */
export function clearOldCache(): void {
  try {
    // 일정 기간 이상 지난 캐시만 정리
    const now = Date.now();
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24시간
    
    // 메모리 캐시에서 오래된 항목 제거 - WeakMap은 forEach를 지원하지 않음
    if (window.__memoryCache && window.__memoryCache instanceof Map) {
      const keysToDelete: any[] = [];
      
      window.__memoryCache.forEach((value, key) => {
        if (value && typeof value === 'object' && value.timestamp) {
          if (now - value.timestamp > CACHE_EXPIRY) {
            keysToDelete.push(key);
          }
        }
      });
      
      keysToDelete.forEach(key => {
        window.__memoryCache?.delete(key);
      });
    }
    
    console.log('오래된 캐시 정리 완료');
  } catch (error) {
    console.warn('오래된 캐시 정리 중 오류:', error);
  }
}

/**
 * 캐시 최적화 유틸리티
 */

/**
 * 브라우저 캐시 정리
 * @returns {boolean} 성공 여부
 */
export function cleanupCache(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // 객체 URL 캐시 정리
    cleanupObjectUrls();
    
    // 메모리 캐시 정리
    cleanupMemoryCache();
    
    // 스타일 캐시 정리
    cleanupStyleCache();
    
    // 이미지 리사이즈 캐시 정리
    cleanupImageResizeCache();
    
    return true;
  } catch (error) {
    console.error('캐시 정리 중 오류:', error);
    return false;
  }
}

/**
 * 객체 URL 캐시 정리
 */
function cleanupObjectUrls(): void {
  if (window.__objectUrls) {
    window.__objectUrls.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        // 오류 무시
      }
    });
    window.__objectUrls.clear();
  }
}

/**
 * 메모리 캐시 정리
 */
function cleanupMemoryCache(): void {
  if (window.__memoryCache) {
    window.__memoryCache.clear();
  }
}

/**
 * 스타일 캐시 정리
 */
function cleanupStyleCache(): void {
  if (typeof window === 'undefined') return;
  
  // 안전 타입 확인 후 접근
  if (window.__styleCache) {
    try {
      if (window.__styleCache instanceof Map) {
        // Map인 경우 clear 메서드 사용
        window.__styleCache.clear();
      } else if (typeof window.__styleCache === 'object' && window.__styleCache !== null) {
        // 일반 객체인 경우 속성 삭제
        Object.keys(window.__styleCache).forEach(key => {
          delete (window.__styleCache as Record<string, any>)[key];
        });
      }
    } catch (error) {
      console.error('스타일 캐시 정리 오류:', error);
    }
  }
}

/**
 * 이미지 리사이즈 캐시 정리
 */
function cleanupImageResizeCache(): void {
  if (typeof window === 'undefined') return;
  
  // 안전 타입 확인 후 접근
  if (window.__imageResizeCache) {
    try {
      if (window.__imageResizeCache instanceof Map) {
        window.__imageResizeCache.clear();
      } else if (typeof window.__imageResizeCache === 'object' && window.__imageResizeCache !== null) {
        // Map이 아닌 경우 새 Map으로 교체 (권장 방식)
        window.__imageResizeCache = new Map<string, HTMLImageElement>();
      }
    } catch (error) {
      console.error('이미지 리사이즈 캐시 정리 오류:', error);
    }
  }
}

/**
 * 스타일 캐시 정리 (키를 지정하거나 전체 삭제)
 */
function clearStyleCache(key?: string): boolean {
  if (!window.__styleCache) {
    return false;
  }
  
  if (key) {
    // Map인지 일반 객체인지 확인 후 적절한 방식으로 삭제
    if (window.__styleCache instanceof Map) {
      if (window.__styleCache.has(key)) {
        return window.__styleCache.delete(key);
      }
    } else if (typeof window.__styleCache === 'object') {
      if (key in (window.__styleCache as Record<string, any>)) {
        delete (window.__styleCache as Record<string, any>)[key];
        return true;
      }
    }
    return false;
  } else {
    // 전체 캐시 삭제
    if (window.__styleCache instanceof Map) {
      window.__styleCache.clear();
    } else {
      window.__styleCache = {};
    }
    return true;
  }
}

/**
 * 이미지 리사이즈 캐시 정리 (키를 지정하거나 전체 삭제)
 */
function clearImageResizeCache(key?: string): boolean {
  if (!window.__imageResizeCache) {
    return false;
  }
  
  if (key) {
    // Map 객체이므로 get 메서드 사용
    if (window.__imageResizeCache instanceof Map) {
      if (window.__imageResizeCache.has(key)) {
        return window.__imageResizeCache.delete(key);
      }
    }
    return false;
  } else {
    // 전체 캐시 삭제
    if (window.__imageResizeCache instanceof Map) {
      window.__imageResizeCache.clear();
    } else {
      window.__imageResizeCache = new Map<string, HTMLImageElement>();
    }
    return true;
  }
}
