/**
 * 긴급 메모리 복구 모듈
 * 
 * 메모리 누수 또는 과도한 메모리 사용 상황에서 
 * 긴급 메모리 복구 기능을 제공합니다.
 */

import { requestNativeMemoryOptimization, requestNativeGarbageCollection } from '../../native-memory-bridge';
import { OptimizationLevel } from '@/types';

// 마지막 긴급 복구 시간
let lastEmergencyRecoveryTime = 0;
// 최소 긴급 복구 간격 (10초)
const MIN_RECOVERY_INTERVAL = 10000;

/**
 * 긴급 메모리 복구 수행
 * 
 * 메모리 부족 상황에서 긴급으로 메모리를 회수합니다.
 * 이 함수는 다른 기능을 중단시키고 최대한 많은 메모리를 확보하려고 시도합니다.
 * 
 * @returns {Promise<boolean>} 복구 성공 여부
 */
export async function performEmergencyMemoryRecovery(): Promise<boolean> {
  try {
    const now = Date.now();
    
    // 너무 자주 호출되는 것을 방지
    if (now - lastEmergencyRecoveryTime < MIN_RECOVERY_INTERVAL) {
      console.warn('긴급 메모리 복구 요청이 너무 자주 호출됩니다.');
      return false;
    }
    
    lastEmergencyRecoveryTime = now;
    
    console.warn('긴급 메모리 복구 시작...');
    
    // 1. 네이티브 모듈을 통한 긴급 메모리 최적화
    await requestNativeMemoryOptimization(OptimizationLevel.EXTREME, true);
    
    // 2. 네이티브 모듈을 통한 강제 GC
    await requestNativeGarbageCollection();
    
    // 3. DOM 정리
    cleanupDOM();
    
    // 4. 캐시 정리
    clearAllCaches();
    
    // 5. 불필요한 타이머 제거
    clearTimers();
    
    // 6. 이벤트 리스너 정리
    cleanupEventListeners();
    
    console.log('긴급 메모리 복구 완료');
    
    return true;
  } catch (error) {
    console.error('긴급 메모리 복구 오류:', error);
    
    // 오류 발생 시에도 간단한 복구 작업은 시도
    try {
      await requestNativeGarbageCollection();
      console.log('기본 GC 수행 완료');
    } catch {
      // 추가 오류 무시
    }
    
    return false;
  }
}

/**
 * DOM 요소 정리
 * 
 * 불필요한 DOM 요소와 참조를 정리합니다.
 */
function cleanupDOM(): void {
  if (typeof window === 'undefined' || !document) return;
  
  try {
    // 1. 숨겨진 요소 정리
    const hiddenElements = document.querySelectorAll('.hidden, [hidden], [style*="display: none"]');
    hiddenElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.innerHTML = '';
      }
    });
    
    // 2. 화면 밖의 이미지 src 비우기 (data-src에 원본 저장)
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (!isInViewport && img.src && !img.dataset.keepLoaded) {
        if (!img.dataset.originalSrc) {
          img.dataset.originalSrc = img.src;
        }
        img.src = '';
      }
    });
  } catch (e) {
    console.warn('DOM 정리 중 오류:', e);
  }
}

/**
 * 모든 캐시 정리
 * 
 * 브라우저와 앱의 모든 캐시를 정리합니다.
 */
function clearAllCaches(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // 1. 로컬 스토리지의 임시 항목 정리
    if (window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('temp_') || key.startsWith('cache_'))) {
          localStorage.removeItem(key);
        }
      }
    }
    
    // 2. 세션 스토리지 완전 정리
    if (window.sessionStorage) {
      sessionStorage.clear();
    }
    
    // 3. 앱 캐시 정리
    if (window.__memoryCache) {
      window.__memoryCache.clear();
    }
    
    // 4. 버퍼 캐시 정리
    if (window.__bufferCache) {
      window.__bufferCache = {};
    }
  } catch (e) {
    console.warn('캐시 정리 중 오류:', e);
  }
}

/**
 * 모든 타이머 정리
 * 
 * 불필요한 타이머를 정리하여 메모리와 CPU 사용량을 줄입니다.
 */
function clearTimers(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // 1. 추적 중인 타임아웃 정리
    if (window.__timeoutIds && Array.isArray(window.__timeoutIds)) {
      window.__timeoutIds.forEach(id => clearTimeout(id));
      window.__timeoutIds = [];
    }
    
    // 2. 추적 중인 인터벌 정리
    if (window.__intervalIds && Array.isArray(window.__intervalIds)) {
      window.__intervalIds.forEach(id => clearInterval(id));
      window.__intervalIds = [];
    }
    
    // 3. 추적 중인 애니메이션 프레임 정리
    if (window.__animationFrameIds && Array.isArray(window.__animationFrameIds)) {
      window.__animationFrameIds.forEach(id => cancelAnimationFrame(id));
      window.__animationFrameIds = [];
    }
  } catch (e) {
    console.warn('타이머 정리 중 오류:', e);
  }
}

/**
 * 이벤트 리스너 정리
 * 
 * 불필요한 이벤트 리스너를 제거합니다.
 */
function cleanupEventListeners(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // 추적 중인 이벤트 리스너 정리
    // 애플리케이션에서 이벤트 리스너 추적 방식에 따라 수정 필요
    if (window.__eventListeners) {
      Object.entries(window.__eventListeners || {}).forEach(([selector, events]) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          Object.entries(events).forEach(([eventName, listener]) => {
            element.removeEventListener(eventName, listener);
          });
        });
      });
      
      window.__eventListeners = {};
    }
  } catch (e) {
    console.warn('이벤트 리스너 정리 중 오류:', e);
  }
}

/**
 * 메모리 진단 정보 수집
 * 
 * 현재 메모리 사용 상태에 대한 진단 정보를 수집합니다.
 * 
 * @returns {Object} 진단 정보
 */
export function collectMemoryDiagnostics(): any {
  if (typeof window === 'undefined') return null;
  
  try {
    // 메모리 정보 수집
    const memoryInfo: any = {};
    
    // 브라우저 메모리 API (Chrome 전용)
    if ((performance as any).memory) {
      const { totalJSHeapSize, usedJSHeapSize, jsHeapSizeLimit } = (performance as any).memory;
      memoryInfo.browser = {
        totalHeap: totalJSHeapSize,
        usedHeap: usedJSHeapSize,
        heapLimit: jsHeapSizeLimit,
        percentUsed: (usedJSHeapSize / totalJSHeapSize) * 100
      };
    }
    
    // DOM 크기
    memoryInfo.dom = {
      elements: document.querySelectorAll('*').length,
      images: document.querySelectorAll('img').length,
      scripts: document.querySelectorAll('script').length,
      styleSheets: document.styleSheets.length
    };
    
    // 스토리지 사용량
    memoryInfo.storage = {
      localStorage: localStorage.length,
      sessionStorage: sessionStorage.length
    };
    
    // 이벤트 리스너 수 (추정)
    const allElements = document.querySelectorAll('*');
    let listenerCount = 0;
    
    if (window.getEventListeners) {
      // Chrome 개발자 도구에서만 사용 가능한 API
      listenerCount = Array.from(allElements).reduce((count, el) => {
        const listeners = (window as any).getEventListeners(el);
        return count + Object.values(listeners || {}).reduce((sum: number, arr: any[]) => sum + arr.length, 0);
      }, 0);
    }
    
    memoryInfo.events = {
      estimatedListeners: listenerCount || 'Not available'
    };
    
    return memoryInfo;
  } catch (error) {
    console.error('메모리 진단 정보 수집 오류:', error);
    return { error: String(error) };
  }
}

// 애플리케이션 복구 유틸리티를 전역 객체에 노출
if (typeof window !== 'undefined') {
  if (!window.__appRecovery) {
    window.__appRecovery = {};
  }
  
  window.__appRecovery.performEmergencyMemoryRecovery = performEmergencyMemoryRecovery;
  window.__appRecovery.collectMemoryDiagnostics = collectMemoryDiagnostics;
}
