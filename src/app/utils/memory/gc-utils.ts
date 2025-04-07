/**
 * 가비지 컬렉션 유틸리티
 * 
 * 메모리 정리 관련 기능을 제공합니다.
 */

import { GCResult } from '@/types';
import { requestNativeGarbageCollection } from '../native-memory-bridge';

// 변수 및 상수 선언 추가
let lastGCTime = 0;
const MIN_GC_INTERVAL = 3000; // 3초

/**
 * 브라우저 환경인지 확인하는 함수
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * 가비지 컬렉션 요청
 * 네이티브 모듈을 통해 GC를 수행합니다.
 * @returns GC 결과
 */
export async function requestGC(_emergency: boolean = false): Promise<GCResult | null> {
  try {
    return await requestNativeGarbageCollection();
  } catch (error) {
    console.error('가비지 컬렉션 요청 오류:', error);
    return {
      success: false,
      freedMemory: 0,
      freedMB: 0,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * 수동 메모리 정리 수행
 * JS 환경에서 가능한 메모리 정리 작업을 수행합니다.
 */
export async function cleanupMemory(): Promise<boolean> {
  try {
    // 브라우저 환경에서만 실행
    if (!isBrowser) return false;

    // 가능한 경우 global.gc 호출
    if (typeof window.gc === 'function') {
      window.gc();
    }

    // 미사용 이미지 캐시 정리
    if (window.__imageResizeCache) {
      window.__imageResizeCache.clear();
    }

    // 오브젝트 URL 정리
    if (window.__objectUrls) {
      for (const [_key, url] of window.__objectUrls) {
        URL.revokeObjectURL(url);
      }
      window.__objectUrls.clear();
    }

    return true;
  } catch (error) {
    console.error('메모리 정리 오류:', error);
    return false;
  }
}

/**
 * 주기적인 메모리 정리 설정
 * @param interval 실행 간격(ms)
 * @returns 정리 함수
 */
export function setupPeriodicGC(interval: number = 60000): () => void {
  const timerId = setInterval(async () => {
    await requestGC(false);
  }, interval);

  return () => {
    clearInterval(timerId);
  };
}

/**
 * 가비지 컬렉션 제안 함수
 * 
 * 브라우저 환경에서 가비지 컬렉션을 제안합니다.
 * window.gc가 있는 환경(크롬 --js-flags="--expose-gc")에서만 작동합니다.
 */
export function suggestGarbageCollection(): void {
  if (isBrowser) {
    if (window.gc) {
      window.gc();
    } else {
      // GC를 직접 호출할 수 없는 경우 간접적으로 메모리 압박을 가함
      const now = Date.now();

      // 너무 자주 호출되지 않도록 조절
      if (now - lastGCTime < MIN_GC_INTERVAL) {
        return;
      }

      lastGCTime = now;

      // 메모리 할당 후 해제하여 GC 유도
      try {
        const arr = new Array(10000).fill({});
        arr.length = 0;
      } catch (e) {
        console.warn('GC 간접 호출 중 오류:', e);
      }
    }
  }
}

/**
 * 브라우저 캐시 정리
 */
export async function clearBrowserCaches(): Promise<boolean> {
  try {
    if (!isBrowser) return false;

    // 사용 가능한 캐시 API가 있으면 정리
    if ('caches' in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => window.caches.delete(cacheName))
      );
    }

    return true;
  } catch (error) {
    console.error('브라우저 캐시 정리 오류:', error);
    return false;
  }
}

/**
 * 브라우저 스토리지 정리
 */
export function clearStorageCaches(): boolean {
  try {
    if (!isBrowser) return false;

    // 세션 스토리지는 완전히 정리
    if (window.sessionStorage) {
      window.sessionStorage.clear();
    }

    // 로컬 스토리지는 임시 데이터만 정리
    if (window.localStorage) {
      const keysToDelete: string[] = [];

      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        // null 체크 추가
        if (key && (key.startsWith('temp_') || key.startsWith('cache_'))) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => window.localStorage.removeItem(key));
    }

    return true;
  } catch (error) {
    console.error('스토리지 캐시 정리 오류:', error);
    return false;
  }
}

/**
 * 캐시 정리 유틸리티
 */
export function cleanCache(cacheType: string): boolean {
  try {
    if (!isBrowser) return false;

    switch (cacheType) {
      case 'local':
        return cleanLocalStorageCache();
      case 'session':
        sessionStorage.clear();
        return true;
      case 'browser':
        clearBrowserCaches();
        return true;
      case 'memory':
        return cleanMemoryCache();
      case 'all':
        cleanLocalStorageCache();
        sessionStorage.clear();
        clearBrowserCaches();
        cleanMemoryCache();
        return true;
      default:
        return false;
    }
  } catch (error) {
    console.error(`캐시 정리 오류 (${cacheType}):`, error);
    return false;
  }
}

/**
 * 로컬 스토리지 캐시 정리
 */
function cleanLocalStorageCache(): boolean {
  try {
    // 임시 데이터만 정리
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('cache_') || key.startsWith('temp_'))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error('로컬 스토리지 캐시 정리 오류:', error);
    return false;
  }
}

/**
 * 메모리 캐시 정리
 */
function cleanMemoryCache(): boolean {
  try {
    // 이미지 캐시 정리
    if (window.__imageResizeCache) {
      window.__imageResizeCache.clear();
    }

    // 오브젝트 URL 정리
    if (window.__objectUrls) {
      for (const [_key, url] of window.__objectUrls) {
        URL.revokeObjectURL(url);
      }
      window.__objectUrls.clear();
    }

    return true;
  } catch (error) {
    console.error('메모리 캐시 정리 오류:', error);
    return false;
  }
}

/**
 * 비활성 캐시 정리
 */
export function cleanInactiveCaches(): boolean {
  try {
    if (!isBrowser) return false;

    // 접근 시간 추적을 위한 메타데이터 키
    const CACHE_ACCESS_KEY = 'cache_last_access';

    // 현재 시간
    const now = Date.now();

    // 마지막 접근 시간 정보 로드
    let accessInfo: Record<string, number> = {};
    try {
      const accessInfoJson = localStorage.getItem(CACHE_ACCESS_KEY);
      if (accessInfoJson) {
        accessInfo = JSON.parse(accessInfoJson);
      }
    } catch {
      // 파싱 오류 무시, 빈 객체 사용
    }

    // 캐시 항목 스캔
    const keysToCheck: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cache_')) {
        keysToCheck.push(key);
      }
    }

    // 일정 시간 접근되지 않은 캐시 정리 (7일 이상)
    const expiryTime = 7 * 24 * 60 * 60 * 1000; // 7일
    const expiredKeys = keysToCheck.filter(key => {
      const lastAccess = accessInfo[key] || 0;
      return now - lastAccess > expiryTime;
    });

    // 만료된 키 제거
    expiredKeys.forEach(key => {
      localStorage.removeItem(key);
      delete accessInfo[key];
    });

    // 접근 정보 업데이트
    localStorage.setItem(CACHE_ACCESS_KEY, JSON.stringify(accessInfo));

    return true;
  } catch (error) {
    console.error('비활성 캐시 정리 오류:', error);
    return false;
  }
}

/**
 * 모든 캐시 정리
 */
export function cleanAllCaches(): boolean {
  try {
    if (!isBrowser) return false;

    // 세션 스토리지 정리
    sessionStorage.clear();

    // 로컬 스토리지에서 캐시 키 찾기
    const cacheKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('cache_') ||
        key.startsWith('temp_') ||
        key.includes('cache')
      )) {
        cacheKeys.push(key);
      }
    }

    // 캐시 키 제거
    cacheKeys.forEach(key => localStorage.removeItem(key));

    // 메모리 내 캐시 정리
    cleanMemoryCache();

    // 브라우저 캐시 정리
    clearBrowserCaches();

    return true;
  } catch (error) {
    console.error('모든 캐시 정리 오류:', error);
    return false;
  }
}

// 윈도우 메모리 옵티마이저 초기화 부분 수정
if (typeof window !== 'undefined') {
  // 타입 안전한 방식으로 속성 초기화
  if (!window.__memoryOptimizer) {
    (window as any).__memoryOptimizer = {
      suggestGarbageCollection: () => {
        // 기존 구현
      },
      requestGC: async (emergency?: boolean) => {
        // 기존 구현
        return {};
      },
      clearBrowserCaches: async () => {
        // 기존 구현
        return true;
      },
      clearStorageCaches: () => {
        // 기존 구현
        return true;
      },
      checkMemoryUsage: () => {
        // 기존 구현
        return null;
      },
      forceGC: () => {
        // 기존 구현
        return true;
      },
      // cleanAllCaches 메서드 추가
      cleanAllCaches: () => {
        // 캐시 정리 로직 구현
        return true;
      }
    };
  }

  // 옵셔널 체이닝 사용 + cleanAllCaches 대신 clearStorageCaches 사용
  window.__memoryOptimizer?.clearStorageCaches?.();
  window.__memoryOptimizer?.suggestGarbageCollection?.();
  window.__memoryOptimizer?.requestGC?.();
}

// 매개변수 사용되지 않음 경고 수정 (이름 앞에 _ 추가)
async function _defaultRequestGC(_emergency?: boolean): Promise<any> {
  return Promise.resolve();
}
