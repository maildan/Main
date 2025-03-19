/**
 * 대형 객체 캐시 처리를 위한 WeakMap
 * 순환 참조 방지와 GC 허용을 위해 WeakMap 사용
 */
const objectCache = new WeakMap<object, boolean>();

/**
 * 객체를 약한 참조로 캐싱
 * @param key 객체 키 (참조형만 가능)
 * @param value 저장할 값
 */
export function weakCache<T extends object>(key: T, value: boolean = true): void {
  objectCache.set(key, value);
}

/**
 * 약한 참조 캐시에서 객체 확인
 * @param key 객체 키
 * @returns {boolean} 캐시 존재 여부
 */
export function hasWeakCache<T extends object>(key: T): boolean {
  return objectCache.has(key);
}

/**
 * LocalStorage 정리
 * 불필요하거나 오래된 데이터 정리
 */
export function cleanLocalStorage(): void {
  try {
    // 임시 데이터 정리 (예: 'temp_' 로 시작하는 항목들)
    const keysToRemove: string[] = [];
    
    for (let i = 0; localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('temp_') || key.startsWith('cache_'))) {
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
