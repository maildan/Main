/**
 * 메모리 최적화 통합 모듈
 * 메모리 최적화 핵심 기능 제공
 */
import { cleanupDOM, unloadUnusedImages } from './dom-optimizer';
import { clearImageCache, optimizeImageResources } from './image-optimizer';
import { cleanLocalStorage, clearLargeObjectsAndCaches } from './storage-cleaner';
import { suggestGarbageCollection, requestGC } from './gc-utils';

/**
 * 메모리 최적화 수행 함수 (내부 구현)
 * 불필요한 캐시 정리, 대형 객체 참조 해제 등 수행
 * @param {boolean} aggressive 적극적 최적화 여부
 */
export function internalOptimizeMemory(aggressive: boolean = false): void {
  try {
    // 1. 불필요한 DOM 참조 해제
    cleanupDOM();
    
    // 2. GC 힌트 제공
    suggestGarbageCollection();
    
    // 3. Electron 메인 프로세스에 메모리 최적화 요청
    if (window.electronAPI && window.electronAPI.optimizeMemory) {
      window.electronAPI.optimizeMemory(aggressive);
    }
    
    // 4. 적극적 모드일 경우 추가 작업
    if (aggressive) {
      // 이미지 캐시 정리
      clearImageCache();
      
      // 로컬 스토리지의 불필요한 데이터 정리
      cleanLocalStorage();
    }
  } catch (error) {
    console.error('메모리 최적화 중 오류:', error);
  }
}

/**
 * 메모리 최적화 수행 함수
 * 불필요한 캐시 정리, 대형 객체 참조 해제 등 수행
 * @param {boolean} deepCleanup 심층 정리 여부
 */
export async function optimizeMemory(deepCleanup = false): Promise<boolean> {
  try {
    // 큰 객체와 캐시 정리
    clearLargeObjectsAndCaches();
    
    // DOM 요소 정리
    cleanupDOM();
    
    // 심층 정리 모드인 경우 추가 작업
    if (deepCleanup) {
      // 이미지 참조 해제
      unloadUnusedImages();
      
      // 이미지 리소스 최적화
      await optimizeImageResources();
    }
    
    // GC 요청
    await requestGC();
    
    // 백엔드에도 메모리 최적화 요청
    if (window.electronAPI && typeof window.electronAPI.optimizeMemory === 'function') {
      await window.electronAPI.optimizeMemory(deepCleanup);
    }
    
    return true;
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    return false;
  }
}
