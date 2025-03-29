/**
 * 안전한 캐시 접근 유틸리티 함수들
 */

/**
 * 스타일 캐시 안전하게 접근
 */
export function getStyleCache(): Record<string, any> | Map<string, any> {
  if (typeof window === 'undefined') {
    return {};
  }
  
  if (!window.__styleCache) {
    // 캐시가 없으면 초기화
    window.__styleCache = {};
  }
  
  return window.__styleCache;
}

/**
 * 이미지 리사이즈 캐시 안전하게 접근
 */
export function getImageResizeCache(): Map<string, HTMLImageElement> {
  if (typeof window === 'undefined') {
    return new Map();
  }
  
  if (!window.__imageResizeCache || !(window.__imageResizeCache instanceof Map)) {
    // 캐시가 없거나 Map이 아닌 경우 초기화
    window.__imageResizeCache = new Map();
  }
  
  return window.__imageResizeCache;
}

/**
 * 스타일 캐시에서 값 가져오기
 */
export function getStyleCacheItem<T = any>(key: string): T | undefined {
  const cache = getStyleCache();
  
  if (cache instanceof Map) {
    return cache.get(key) as T | undefined;
  } else {
    return (cache as Record<string, any>)[key] as T | undefined;
  }
}

/**
 * 스타일 캐시에 값 설정하기
 */
export function setStyleCacheItem<T = any>(key: string, value: T): void {
  const cache = getStyleCache();
  
  if (cache instanceof Map) {
    cache.set(key, value);
  } else {
    (cache as Record<string, any>)[key] = value;
  }
}

/**
 * 이미지 리사이즈 캐시에서 값 가져오기
 */
export function getImageResizeCacheItem(key: string): HTMLImageElement | undefined {
  return getImageResizeCache().get(key);
}

/**
 * 이미지 리사이즈 캐시에 값 설정하기
 */
export function setImageResizeCacheItem(key: string, value: HTMLImageElement): void {
  getImageResizeCache().set(key, value);
}
