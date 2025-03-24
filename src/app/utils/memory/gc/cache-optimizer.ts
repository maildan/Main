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
    if (window.__imageResizeCache) {
      if (window.__imageResizeCache instanceof Map) {
        window.__imageResizeCache.clear();
      } else {
        window.__imageResizeCache = {};
      }
    }
    
    // 2. 객체 URL 캐시
    if (window.__objectUrls instanceof Map) {
      window.__objectUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // 무시
        }
      });
      window.__objectUrls.clear();
    }
    
    // 3. 일반 메모리 캐시
    if (window.__memoryCache instanceof Map) {
      window.__memoryCache.clear();
    }
    
    // 4. 스타일 캐시
    if (window.__styleCache) {
      window.__styleCache = {};
    }
    
    // 5. 위젯 캐시
    if (window.__widgetCache instanceof Map) {
      window.__widgetCache.clear();
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
    
    // 메모리 캐시에서 오래된 항목 제거
    if (window.__memoryCache instanceof Map) {
      window.__memoryCache.forEach((value, key) => {
        if (value && typeof value === 'object' && value.timestamp) {
          if (now - value.timestamp > CACHE_EXPIRY) {
            window.__memoryCache.delete(key);
          }
        }
      });
    }
    
    console.log('오래된 캐시 정리 완료');
  } catch (error) {
    console.warn('오래된 캐시 정리 중 오류:', error);
  }
}
