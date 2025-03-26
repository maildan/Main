/**
 * 메모리 최적화 컨트롤러
 * 
 * 이 모듈은 네이티브 모듈을 통해 다양한 수준의 메모리 최적화를 제공합니다.
 * 모든 실제 최적화 로직은 Rust 네이티브 모듈에서 처리됩니다.
 */

import { OptimizationLevel } from '@/types';
import { OptimizationResult } from '@/types';
import { requestNativeMemoryOptimization, requestNativeGarbageCollection } from '../../native-memory-bridge';

// 네이티브 모듈을 사용하여 기본 최적화 수행
export async function performBasicOptimization(): Promise<OptimizationResult> {
  return requestNativeMemoryOptimization(0, false) as Promise<OptimizationResult>;
}

// 네이티브 모듈을 사용하여 중간 수준 최적화 수행
export async function performMediumOptimization(): Promise<OptimizationResult> {
  return requestNativeMemoryOptimization(OptimizationLevel.MEDIUM, false) as Promise<OptimizationResult>;
}

// 네이티브 모듈을 사용하여 높은 수준 최적화 수행
export async function performHighOptimization(): Promise<OptimizationResult> {
  return requestNativeMemoryOptimization(OptimizationLevel.HIGH, false) as Promise<OptimizationResult>;
}

// 네이티브 모듈을 사용하여 위험 수준 최적화 수행
export async function performCriticalOptimization(): Promise<OptimizationResult> {
  return requestNativeMemoryOptimization(OptimizationLevel.EXTREME, true) as Promise<OptimizationResult>;
}

// 최적화 수준별 작업
export async function performOptimizationByLevel(level: OptimizationLevel): Promise<OptimizationResult> {
  return requestNativeMemoryOptimization(level, level === OptimizationLevel.EXTREME) as Promise<OptimizationResult>;
}

// 메모리 최적화 단계를 간략화한 버전
export async function optimizeMemoryByLevel(level: 0 | 1 | 2 | 3 | 4): Promise<boolean> {
  try {
    // 최적화 수준에 따라 다른 동작 수행
    const optimizationLevel = level as OptimizationLevel;
    await requestNativeMemoryOptimization(optimizationLevel, level === 4);
    return true;
  } catch (error) {
    console.error(`메모리 최적화 실패 (레벨 ${level}):`, error);
    return false;
  }
}

// 이미지 및 미디어 캐시 정리
export async function clearImageCaches(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    
    // 이미지 요소 재로드
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && !img.src.startsWith('data:')) {
        const currentSrc = img.src;
        img.src = '';
        setTimeout(() => {
          img.src = currentSrc;
        }, 10);
      }
    });
    
    return true;
  } catch (error) {
    console.error('이미지 캐시 정리 오류:', error);
    return false;
  }
}

// DOM 요소 참조 정리
export async function cleanupDOMReferences(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    
    // 숨겨진 요소에 연결된 이벤트 정리
    const hiddenElements = document.querySelectorAll('.hidden, [hidden], [style*="display: none"]');
    hiddenElements.forEach(element => {
      if (element instanceof HTMLElement) {
        // Element에 연결된 모든 속성 정리
        element.innerHTML = '';
      }
    });
    
    return true;
  } catch (error) {
    console.error('DOM 참조 정리 오류:', error);
    return false;
  }
}

// 브라우저 스토리지 캐시 정리
export async function clearStorageCaches(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    
    // 세션 스토리지에서 캐시 키 정리
    if (window.sessionStorage) {
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('cache') || key.includes('temp'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key));
    }
    
    return true;
  } catch (error) {
    console.error('스토리지 캐시 정리 오류:', error);
    return false;
  }
}

// 비표시 요소 리소스 해제
export async function unloadNonVisibleResources(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    
    // 화면 밖에 있는 이미지 unload
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0 &&
                         rect.left < window.innerWidth && rect.right > 0;
      
      if (!isVisible && img.src && !img.dataset.keepLoaded) {
        img.dataset.originalSrc = img.src;
        img.src = '';
      }
    });
    
    return true;
  } catch (error) {
    console.error('비표시 리소스 해제 오류:', error);
    return false;
  }
}

// 이벤트 리스너 최적화
export async function optimizeEventListeners(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    
    // 전역 이벤트 리스너 정리 (애플리케이션 코드에서 관리하지 않는 것들)
    if (window.__animationFrameIds && Array.isArray(window.__animationFrameIds)) {
      for (const id of window.__animationFrameIds) {
        cancelAnimationFrame(id);
      }
      window.__animationFrameIds = [];
    }
    
    return true;
  } catch (error) {
    console.error('이벤트 리스너 최적화 오류:', error);
    return false;
  }
}

// 동적 모듈 해제
export async function unloadDynamicModules(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    
    // 애플리케이션이 관리하는 사용자 정의 모듈 언로드
    if (window.__loadedModules && window.__loadedModules instanceof Map) {
      const modulesToUnload: string[] = [];
      
      window.__loadedModules.forEach((module, key) => {
        if (module && typeof module.unload === 'function') {
          try {
            module.unload();
            modulesToUnload.push(key);
          } catch (err) {
            console.warn(`모듈 언로드 오류 (${key}):`, err);
          }
        }
      });
      
      // 언로드된 모듈 삭제
      modulesToUnload.forEach(key => {
        window.__loadedModules?.delete(key);
      });
    }
    
    return true;
  } catch (error) {
    console.error('동적 모듈 해제 오류:', error);
    return false;
  }
}

// 긴급 메모리 복구
export async function emergencyMemoryRecovery(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;
    
    // 모든 최적화 함수 호출
    await Promise.all([
      clearImageCaches(),
      cleanupDOMReferences(), 
      clearStorageCaches(),
      unloadNonVisibleResources(),
      optimizeEventListeners(),
      unloadDynamicModules()
    ]);
    
    // 네이티브 모듈에 긴급 최적화 요청
    await requestNativeMemoryOptimization(OptimizationLevel.EXTREME, true);
    
    // 브라우저 GC 요청
    await requestNativeGarbageCollection();
    
    return true;
  } catch (error) {
    console.error('긴급 메모리 복구 오류:', error);
    return false;
  }
}

// 전역 API에 최적화 함수 등록
if (typeof window !== 'undefined') {
  if (!window.__memoryOptimizer) {
    window.__memoryOptimizer = {};
  }
  
  // 기존에 정의된 함수가 있다면 유지, 없다면 새로 추가
  window.__memoryOptimizer = {
    ...window.__memoryOptimizer,
    performBasicOptimization,
    performMediumOptimization,
    performHighOptimization,
    performCriticalOptimization,
    performOptimizationByLevel,
    emergencyMemoryRecovery
  };
}
