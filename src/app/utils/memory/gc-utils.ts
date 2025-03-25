/**
 * 가비지 컬렉션 유틸리티
 * 
 * 메모리 최적화 및 GC 요청 관련 유틸리티 함수들을 제공합니다.
 */

import { GCResult } from '@/types';
import { requestNativeGarbageCollection } from '../native-memory-bridge';

// 마지막 GC 요청 시간
let lastGCTime = 0;
// 최소 GC 요청 간격 (ms)
const MIN_GC_INTERVAL = 5000;

/**
 * 가비지 컬렉션 제안 함수
 * 
 * 브라우저 환경에서 가비지 컬렉션을 제안합니다.
 * window.gc가 있는 환경(크롬 --js-flags="--expose-gc")에서만 작동합니다.
 */
export function suggestGarbageCollection(): void {
  if (typeof window !== 'undefined') {
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
 * GC 요청 함수
 * 
 * 네이티브 모듈을 통해 GC를 요청합니다.
 * 
 * @param {boolean} emergency 긴급 GC 여부
 * @returns {Promise<GCResult>} GC 결과
 */
export async function requestGC(emergency = false): Promise<GCResult> {
  try {
    // 네이티브 GC 요청
    const result = await requestNativeGarbageCollection();
    
    if (result) {
      return result;
    }
    
    // 네이티브 모듈 사용 불가능한 경우 JS 폴백
    suggestGarbageCollection();
    
    // 폴백 결과 생성
    return {
      success: true,
      timestamp: Date.now(),
      freedMemory: 0,
      freedMB: 0
    };
  } catch (error) {
    console.error('GC 요청 오류:', error);
    
    // 오류 발생 시에도 JS 폴백 시도
    suggestGarbageCollection();
    
    return {
      success: false,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

/**
 * 브라우저 캐시 정리
 */
export async function clearBrowserCaches(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    
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
    if (typeof window === 'undefined') return false;
    
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

// 전역 API 노출
if (typeof window !== 'undefined') {
  if (!window.__memoryOptimizer) {
    window.__memoryOptimizer = {};
  }
  
  window.__memoryOptimizer.suggestGarbageCollection = suggestGarbageCollection;
  window.__memoryOptimizer.requestGC = requestGC;
  window.__memoryOptimizer.clearBrowserCaches = clearBrowserCaches;
  window.__memoryOptimizer.clearStorageCaches = clearStorageCaches;
}
