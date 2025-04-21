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
    caches
      .keys()
      .then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('temp') || cacheName.includes('nonessential')) {
            caches.delete(cacheName);
          }
        });
      })
      .catch(err => {
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
      caches
        .keys()
        .then(cacheNames => {
          cacheNames.forEach(cacheName => {
            // 앱 전용 캐시만 정리 (다른 웹사이트 캐시는 건드리지 않음)
            if (cacheName.includes('typing-stats-app')) {
              caches.delete(cacheName);
            }
          });
        })
        .catch(e => console.warn('캐시 API 접근 오류:', e));
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
    if (!window.__imageResizeCache) {
      // 타입 캐스팅을 사용하여 타입 오류 해결
      window.__imageResizeCache = {};
    } else {
      // 기존 Map을 적절한 타입으로 다시 설정
      const existingCache = window.__imageResizeCache;
      window.__imageResizeCache = existingCache;
    }

    // 2. 객체 URL 캐시
    if (window.__objectUrls) {
      if (window.__objectUrls instanceof Map) {
        window.__objectUrls.forEach(url => {
          try {
            URL.revokeObjectURL(url);
          } catch (_e) {
            // 무시 (사용하지 않는 변수 경고 수정)
          }
        });
        window.__objectUrls.clear();
      } else {
        window.__objectUrls = new Map<string, string>();
      }
    }

    // 3. 일반 메모리 캐시
    if (window.__memoryCache) {
      if (window.__memoryCache instanceof Map) {
        window.__memoryCache.clear();
      } else {
        window.__memoryCache = new Map<string, any>();
      }
    }

    // 4. 스타일 캐시
    if (window.__styleCache) {
      if (window.__styleCache instanceof Map) {
        window.__styleCache.clear();
      } else {
        window.__styleCache = new Map<string, any>();
      }
    }

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
      window.indexedDB
        .databases()
        .then(databases => {
          databases.forEach(db => {
            try {
              if (db.name) {
                // null 체크 추가
                window.indexedDB.deleteDatabase(db.name);
              }
            } catch (e) {
              // 개별 DB 삭제 실패 처리
            }
          });
        })
        .catch(err => {
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
              type: 'CLEAR_ALL_CACHES',
            });
          }
        }
      });
    }
  } catch (_e) {
    console.warn('모든 캐시 해제 중 오류:', _e);
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
 * 캐시 최적화 기능
 *
 * 브라우저 환경에서 발생하는 다양한 캐시를 관리하고 최적화합니다.
 */

// 브라우저 환경 확인
const isBrowser = typeof window !== 'undefined';

// Window 인터페이스 확장
declare global {
  interface Window {
    __imageResizeCache?: Record<string, any>;
  }
}

/**
 * 글로벌 이미지 리사이징 캐시
 */
if (isBrowser && !window.__imageResizeCache) {
  window.__imageResizeCache = {};
}

/**
 * 이미지 리사이즈 캐시 정리
 */
export function clearImageResizeCache(): number {
  if (!isBrowser) return 0;

  try {
    const cacheSize = window.__imageResizeCache ? Object.keys(window.__imageResizeCache).length : 0;
    if (window.__imageResizeCache) {
      window.__imageResizeCache = {};
    }
    return cacheSize;
  } catch (error) {
    console.error('이미지 캐시 정리 중 오류:', error);
    return 0;
  }
}

/**
 * 미사용 폰트 정리
 */
export function cleanupUnusedFonts(): number {
  if (!isBrowser) return 0;

  let count = 0;
  try {
    // 문서에서 사용 중인 폰트 패밀리 수집
    const usedFonts = new Set<string>();
    document.querySelectorAll('*').forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      const fontFamily = computedStyle.getPropertyValue('font-family');
      if (fontFamily) {
        fontFamily.split(',').forEach(font => {
          usedFonts.add(font.trim().replace(/["']/g, ''));
        });
      }
    });

    // TODO: 불필요한 폰트 언로드 로직 추가

    return count;
  } catch (error) {
    console.error('폰트 정리 중 오류:', error);
    return 0;
  }
}

/**
 * 테마 캐시 정리
 */
export function cleanupThemeCache(): number {
  if (!isBrowser) return 0;

  // 스타일시트 캐싱 관련 특정 구현을 제거
  return 0;
}

/**
 * 서비스 워커 캐시 정리 요청
 */
export async function clearServiceWorkerCache(): Promise<number> {
  if (!isBrowser) return 0;

  try {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' });
      return 1;
    }
    return 0;
  } catch (error) {
    console.error('서비스 워커 캐시 정리 중 오류:', error);
    return 0;
  }
}

/**
 * 모든 캐시 정리
 * 모든 종류의 캐시를 정리하고 항목 수 반환
 */
export function cleanupCache(aggressive: boolean = false): number {
  let count = 0;

  // 이미지 리사이징 캐시 정리
  count += clearImageResizeCache();

  // 테마 캐시 정리
  count += cleanupThemeCache();

  // 공격적 모드일 때만 수행할 작업
  if (aggressive) {
    count += cleanupUnusedFonts();
    clearServiceWorkerCache().catch(err => console.warn('서비스 워커 캐시 정리 실패:', err));
  }

  return count;
}

/**
 * 낮은 우선순위 캐시 정리
 */
export function cleanupLowPriorityCache(): number {
  return cleanupCache(false);
}

/**
 * 긴급 상황용 모든 캐시 정리
 */
export function cleanupAllCache(): number {
  return cleanupCache(true);
}
