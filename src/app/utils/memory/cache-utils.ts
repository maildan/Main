/**
 * 캐시 관리 유틸리티
 * 
 * 메모리 사용량 관리를 위한 캐시 관련 기능을 제공합니다.
 */

import { isBrowser } from './gc-utils';

// 캐시 만료 시간 기본값 (10분)
const DEFAULT_CACHE_TTL = 10 * 60 * 1000;

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
