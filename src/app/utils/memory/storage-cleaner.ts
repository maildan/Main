/**
 * 스토리지 정리 관련 유틸리티
 * 로컬 스토리지 정리 및 캐시 관리 기능 제공
 */

/**
 * LocalStorage 정리
 * 불필요하거나 오래된 데이터 정리
 */
export function cleanLocalStorage(): void {
  try {
    // 임시 데이터 정리 (예: 'temp_' 로 시작하는 항목들)
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('temp_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('로컬 스토리지 정리 중 오류:', error);
  }
}

/**
 * 큰 객체와 캐시를 정리합니다.
 */
export function clearLargeObjectsAndCaches(): void {
  try {
    // 로컬 스토리지의 임시 항목 정리
    if (window.localStorage) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('temp_') || key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    }
    
    // 모든 응용 프로그램 캐시 정리 시도
    if (window.caches) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('temp') || cacheName.includes('nonessential')) {
            caches.delete(cacheName);
          }
        });
      });
    }
  } catch (error) {
    console.error('캐시 정리 오류:', error);
  }
}

/**
 * 세션 스토리지 정리
 * 임시 세션 데이터 정리
 */
export function cleanSessionStorage(): void {
  try {
    // 세션 스토리지에서 임시 데이터 정리
    if (window.sessionStorage) {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('temp_') || key.includes('cache'))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    }
  } catch (error) {
    console.warn('세션 스토리지 정리 중 오류:', error);
  }
}
