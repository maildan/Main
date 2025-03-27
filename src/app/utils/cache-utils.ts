/**
 * 캐시 관련 유틸리티 함수들
 */

/**
 * 메모리 캐시 클래스
 */
export class MemoryCache<T> {
  private cache: Map<string, { value: T; expires?: number }>;
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }
  
  /**
   * 캐시에 항목 저장
   * @param key 캐시 키
   * @param value 저장할 값
   * @param ttl 유효 시간(초)
   */
  set(key: string, value: T, ttl?: number): void {
    // 캐시가 최대 크기에 도달한 경우 가장 오래된 항목 제거
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      value,
      expires: ttl ? Date.now() + ttl * 1000 : undefined
    });
  }
  
  /**
   * 캐시에서 항목 가져오기
   * @param key 캐시 키
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) return undefined;
    
    // 만료 시간 확인
    if (item.expires && item.expires < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  /**
   * 캐시에 키가 존재하는지 확인
   * @param key 캐시 키
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) return false;
    
    // 만료 시간 확인
    if (item.expires && item.expires < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * 캐시에서 항목 삭제
   * @param key 캐시 키
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * 모든 캐시 항목 삭제
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * 만료된 모든 항목 삭제
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expires && item.expires < now) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * 캐시 크기 가져오기
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * 로컬 스토리지 캐시 함수
 * @param key 캐시 키
 * @param value 저장할 값
 * @param ttl 유효 시간(초)
 */
export function setLocalStorage(key: string, value: unknown, ttl?: number): void {
  if (typeof window === 'undefined') return;
  
  const item = {
    value,
    expires: ttl ? Date.now() + ttl * 1000 : undefined
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(item));
  } catch (e) {
    console.error('로컬 스토리지 캐시 저장 오류:', e);
  }
}

/**
 * 로컬 스토리지에서 항목 가져오기
 * @param key 캐시 키
 */
export function getLocalStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    
    // 만료 시간 확인
    if (item.expires && item.expires < Date.now()) {
      localStorage.removeItem(key);
      return null;
    }
    
    return item.value as T;
  } catch (e) {
    console.error('로컬 스토리지 캐시 조회 오류:', e);
    return null;
  }
}

/**
 * 세션 스토리지 캐시 함수
 * @param key 캐시 키
 * @param value 저장할 값
 */
export function setSessionStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(key, JSON.stringify({ value }));
  } catch (e) {
    console.error('세션 스토리지 캐시 저장 오류:', e);
  }
}

/**
 * 세션 스토리지에서 항목 가져오기
 * @param key 캐시 키
 */
export function getSessionStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) return null;
    
    const { value } = JSON.parse(itemStr);
    return value as T;
  } catch (e) {
    console.error('세션 스토리지 캐시 조회 오류:', e);
    return null;
  }
}
