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
  // 캐시 정리 작업 구현
  try {
    // 앱 관련 모든 캐시 정리
    clearAllLowPriorityCache();
    
    // 웹 캐시 API 사용
    if (window.caches) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
    }
    
    // 앱 특화 캐시 정리 (필요시 구현)
    if (window._appCache && typeof window._appCache.clear === 'function') {
      window._appCache.clear();
    }
  } catch (error) {
    console.warn('모든 캐시 정리 중 오류:', error);
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
