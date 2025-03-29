/**
 * 캐시 관리 유틸리티
 * 
 * 메모리 사용량 관리를 위한 캐시 관련 기능을 제공합니다.
 */

import { isBrowser } from './gc-utils';

// 기본 캐시 TTL 추가 (초 단위)
export const DEFAULT_CACHE_TTL = 300; // 5분

/**
 * 메모리 캐시 유틸리티
 */

// 메모리 효율적인 LRU 캐시 구현
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private keyTimestamps: Map<K, number>;
  
  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
    this.keyTimestamps = new Map();
  }
  
  /**
   * 캐시에서 값을 가져옴
   * @param key 캐시 키
   * @returns 캐시된 값 또는 undefined
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 접근 시간 업데이트
      this.keyTimestamps.set(key, Date.now());
    }
    return value;
  }
  
  /**
   * 캐시에 값을 저장
   * @param key 캐시 키
   * @param value 캐시할 값
   */
  set(key: K, value: V): void {
    // 용량 초과 시 가장 오래된 항목 제거
    if (this.cache.size >= this.capacity) {
      this.evictLeastRecentlyUsed();
    }
    
    this.cache.set(key, value);
    this.keyTimestamps.set(key, Date.now());
  }
  
  /**
   * 캐시 항목 삭제
   * @param key 삭제할 항목 키
   * @returns 성공 여부
   */
  delete(key: K): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.keyTimestamps.delete(key);
    }
    return deleted;
  }
  
  /**
   * 캐시 항목 유효성 검사 및 정리
   * @param maxAge 최대 수명 (ms)
   * @returns 정리된 항목 수
   */
  prune(maxAge: number): number {
    const now = Date.now();
    let prunedCount = 0;
    
    for (const [key, timestamp] of this.keyTimestamps.entries()) {
      if (now - timestamp > maxAge) {
        this.cache.delete(key);
        this.keyTimestamps.delete(key);
        prunedCount++;
      }
    }
    
    return prunedCount;
  }
  
  /**
   * 가장 오래된 항목 제거
   * @returns 제거된 키
   */
  private evictLeastRecentlyUsed(): K | undefined {
    let oldestKey: K | undefined;
    let oldestTime = Infinity;
    
    for (const [key, timestamp] of this.keyTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestKey = key;
        oldestTime = timestamp;
      }
    }
    
    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
      this.keyTimestamps.delete(oldestKey);
    }
    
    return oldestKey;
  }
  
  /**
   * 캐시 크기
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * 캐시 용량
   */
  get maxSize(): number {
    return this.capacity;
  }
  
  /**
   * 모든 캐시 항목 지우기
   */
  clear(): void {
    this.cache.clear();
    this.keyTimestamps.clear();
  }
  
  /**
   * 모든 캐시 키 가져오기
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }
}

/**
 * 글로벌 객체 URL 캐시
 */
export function setupObjectURLCache(): void {
  if (typeof window === 'undefined') return;
  
  // 객체 URL 캐시 초기화
  if (!window.__objectUrls) {
    window.__objectUrls = new Map<string, string>();
  }
}

/**
 * 캐시된 객체 URL 생성
 * @param blob 블롭 객체
 * @param key 캐시 키 (선택적)
 * @returns 객체 URL
 */
export function createCachedObjectURL(blob: Blob, key?: string): string {
  if (typeof window === 'undefined') return '';
  
  setupObjectURLCache();
  
  const cacheKey = key || `blob-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const existingUrl = window.__objectUrls?.get(cacheKey);
  
  if (existingUrl) {
    return existingUrl;
  }
  
  const url = URL.createObjectURL(blob);
  window.__objectUrls?.set(cacheKey, url);
  
  return url;
}

/**
 * 캐시에서 객체 URL 해제
 * @param key 캐시 키 또는 URL
 */
export function revokeCachedObjectURL(keyOrUrl: string): void {
  if (typeof window === 'undefined' || !window.__objectUrls) return;
  
  // 키로 직접 찾기
  if (window.__objectUrls.has(keyOrUrl)) {
    const url = window.__objectUrls.get(keyOrUrl);
    if (url) {
      URL.revokeObjectURL(url);
    }
    window.__objectUrls.delete(keyOrUrl);
    return;
  }
  
  // URL로 찾기
  for (const [key, url] of window.__objectUrls.entries()) {
    if (url === keyOrUrl) {
      URL.revokeObjectURL(url);
      window.__objectUrls.delete(key);
      return;
    }
  }
}

/**
 * 모든 캐시된 객체 URL 정리
 * @returns 정리된 URL 수
 */
export function clearAllCachedObjectURLs(): number {
  if (typeof window === 'undefined' || !window.__objectUrls) return 0;
  
  let count = 0;
  window.__objectUrls.forEach((url) => {
    URL.revokeObjectURL(url);
    count++;
  });
  
  window.__objectUrls.clear();
  return count;
}

/**
 * 메모리 내 시간 제한 캐시 생성
 * @param maxEntries 최대 항목 수
 * @returns LRU 캐시 인스턴스
 */
export function createTimeBasedCache<T>(maxEntries = 100): LRUCache<string, { data: T, timestamp: number }> {
  return new LRUCache<string, { data: T, timestamp: number }>(maxEntries);
}

// 글로벌 LRU 캐시 인스턴스 내보내기
export const imageCache = new LRUCache<string, HTMLImageElement>(50);
export const dataCache = new LRUCache<string, any>(100);
export const computationCache = new LRUCache<string, any>(30);

/**
 * 캐시 항목 인터페이스
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expires: number;
}

/**
 * 메모리 캐시 관리자
 */
class MemoryCacheManager {
  private cache: Map<string, CacheItem<unknown>>;
  private maxItems: number;
  private cleanupInterval: number;
  private intervalId: number | NodeJS.Timeout | null = null;
  
  /**
   * 생성자
   * @param maxItems 최대 캐시 항목 수
   * @param cleanupInterval 자동 정리 간격 (ms)
   */
  constructor(maxItems = 100, cleanupInterval = 60000) {
    this.cache = new Map();
    this.maxItems = maxItems;
    this.cleanupInterval = cleanupInterval;
    
    // 브라우저 환경에서만 자동 정리 시작
    if (isBrowser) {
      this.startPeriodicCleanup();
    }
  }
  
  /**
   * 캐시에 항목 추가
   * @param key 캐시 키
   * @param data 캐시할 데이터
   * @param ttl 유효 시간 (ms)
   */
  set<T>(key: string, data: T, ttl = DEFAULT_CACHE_TTL): void {
    // 캐시 용량 초과 시 가장 오래된 항목 제거
    if (this.cache.size >= this.maxItems) {
      this.removeOldestItem();
    }
    
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expires: now + ttl
    });
  }
  
  /**
   * 캐시에서 항목 가져오기
   * @param key 캐시 키
   * @returns 캐시된 데이터 또는 null (만료됐거나 없는 경우)
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    
    if (!item) return null;
    
    // 만료 확인
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  /**
   * 캐시 항목 삭제
   * @param key 캐시 키
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * 캐시 전체 비우기
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * 만료된 캐시 항목 정리
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }
  
  /**
   * 가장 오래된 캐시 항목 제거
   */
  private removeOldestItem(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * 주기적 캐시 정리 시작
   */
  startPeriodicCleanup(): void {
    // 이미 실행 중이면 중지
    if (this.intervalId) {
      this.stopPeriodicCleanup();
    }
    
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }
  
  /**
   * 주기적 캐시 정리 중지
   */
  stopPeriodicCleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId as number);
      this.intervalId = null;
    }
  }
  
  /**
   * 캐시 통계 가져오기
   */
  getStats(): Record<string, number> {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const item of this.cache.values()) {
      if (now > item.expires) {
        expiredCount++;
      }
    }
    
    return {
      totalItems: this.cache.size,
      expiredItems: expiredCount,
      activeItems: this.cache.size - expiredCount
    };
  }
}

// 전역 메모리 캐시 인스턴스
export const memoryCache = new MemoryCacheManager();

/**
 * 로컬 스토리지 캐시 관리
 */
export class LocalStorageCache {
  private prefix: string;
  
  /**
   * 생성자
   * @param prefix 캐시 키 접두어
   */
  constructor(prefix = 'app_cache_') {
    this.prefix = prefix;
  }
  
  /**
   * 항목 저장
   * @param key 캐시 키
   * @param data 데이터
   * @param ttl 유효 시간 (ms)
   */
  set<T>(key: string, data: T, ttl = DEFAULT_CACHE_TTL): boolean {
    if (!isBrowser) return false;
    
    try {
      const fullKey = this.prefix + key;
      const now = Date.now();
      const item: CacheItem<T> = {
        data,
        timestamp: now,
        expires: now + ttl
      };
      
      localStorage.setItem(fullKey, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('캐시 저장 오류:', error);
      return false;
    }
  }
  
  /**
   * 항목 가져오기
   * @param key 캐시 키
   * @returns 캐시된 데이터 또는 null
   */
  get<T>(key: string): T | null {
    if (!isBrowser) return null;
    
    try {
      const fullKey = this.prefix + key;
      const itemJson = localStorage.getItem(fullKey);
      
      if (!itemJson) return null;
      
      const item = JSON.parse(itemJson) as CacheItem<T>;
      
      // 만료 확인
      if (Date.now() > item.expires) {
        localStorage.removeItem(fullKey);
        return null;
      }
      
      return item.data;
    } catch (error) {
      console.error('캐시 조회 오류:', error);
      return null;
    }
  }
  
  /**
   * 항목 삭제
   * @param key 캐시 키
   */
  delete(key: string): boolean {
    if (!isBrowser) return false;
    
    try {
      const fullKey = this.prefix + key;
      localStorage.removeItem(fullKey);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 모든 캐시 항목 정리
   */
  clear(): boolean {
    if (!isBrowser) return false;
    
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      return true;
    } catch (error) {
      console.error('캐시 정리 오류:', error);
      return false;
    }
  }
  
  /**
   * 만료된 캐시 항목 정리
   */
  cleanup(): number {
    if (!isBrowser) return 0;
    
    try {
      const now = Date.now();
      const keysToCheck: string[] = [];
      
      // 관련 키 수집
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToCheck.push(key);
        }
      }
      
      // 만료된 항목 삭제
      let removedCount = 0;
      for (const key of keysToCheck) {
        try {
          const itemJson = localStorage.getItem(key);
          if (!itemJson) continue;
          
          const item = JSON.parse(itemJson) as CacheItem<unknown>;
          
          if (now > item.expires) {
            localStorage.removeItem(key);
            removedCount++;
          }
        } catch {
          // 개별 항목 처리 중 오류 무시
        }
      }
      
      return removedCount;
    } catch (error) {
      console.error('캐시 정리 오류:', error);
      return 0;
    }
  }
}

// 기본 로컬 스토리지 캐시 인스턴스
export const localStorageCache = new LocalStorageCache();

/**
 * 세션 스토리지 캐시 관리
 */
export class SessionStorageCache {
  private prefix: string;
  
  /**
   * 생성자
   * @param prefix 캐시 키 접두어
   */
  constructor(prefix = 'app_session_') {
    this.prefix = prefix;
  }
  
  /**
   * 항목 저장
   * @param key 캐시 키
   * @param data 데이터
   */
  set<T>(key: string, data: T): boolean {
    if (!isBrowser) return false;
    
    try {
      const fullKey = this.prefix + key;
      sessionStorage.setItem(fullKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      return true;
    } catch (error) {
      console.error('세션 캐시 저장 오류:', error);
      return false;
    }
  }
  
  /**
   * 항목 가져오기
   * @param key 캐시 키
   * @returns 캐시된 데이터 또는 null
   */
  get<T>(key: string): T | null {
    if (!isBrowser) return null;
    
    try {
      const fullKey = this.prefix + key;
      const itemJson = sessionStorage.getItem(fullKey);
      
      if (!itemJson) return null;
      
      const item = JSON.parse(itemJson);
      return item.data;
    } catch (error) {
      console.error('세션 캐시 조회 오류:', error);
      return null;
    }
  }
  
  /**
   * 항목 삭제
   * @param key 캐시 키
   */
  delete(key: string): boolean {
    if (!isBrowser) return false;
    
    try {
      const fullKey = this.prefix + key;
      sessionStorage.removeItem(fullKey);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * 모든 항목 정리
   */
  clear(): boolean {
    if (!isBrowser) return false;
    
    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
      });
      
      return true;
    } catch (error) {
      console.error('세션 캐시 정리 오류:', error);
      return false;
    }
  }
}

// 기본 세션 스토리지 캐시 인스턴스
export const sessionStorageCache = new SessionStorageCache();
