/**
 * 메모리 최적화 코어 유틸리티
 * 
 * 이 모듈은 기존 JavaScript 기반 메모리 최적화 함수와
 * 새로운 네이티브 모듈 기반 최적화 함수를 통합하여 제공합니다.
 */

import { cleanupDOM, unloadUnusedImages } from './dom-optimizer';
import { clearImageCache, optimizeImageResources } from './image-optimizer';
import { cleanLocalStorage, clearLargeObjectsAndCaches } from './storage-cleaner';
import { suggestGarbageCollection, requestGC } from './gc-utils';
import { requestNativeMemoryOptimization } from '../native-memory-bridge';
import { OptimizationLevel } from '@/types/native-module';

/**
 * 메모리 최적화 수행 함수 (내부 구현)
 * 네이티브 모듈과 JS 기반 메모리 최적화를 통합합니다.
 * 
 * @param {boolean} aggressive 적극적 최적화 여부
 * @returns {Promise<boolean>} 성공 여부
 */
export async function internalOptimizeMemory(aggressive: boolean = false): Promise<boolean> {
  try {
    // 1. 네이티브 최적화 시도 (Rust 모듈 사용)
    let nativeSuccess = false;
    try {
      // 적절한 최적화 레벨 선택
      const level = aggressive ? OptimizationLevel.High : OptimizationLevel.Medium;
      const result = await requestNativeMemoryOptimization(level, aggressive);
      nativeSuccess = !!result;
    } catch (error) {
      console.warn('네이티브 메모리 최적화 실패, JS 구현으로 폴백:', error);
    }
    
    // 네이티브 최적화 성공 시 추가 작업 생략 가능 (설정에 따라)
    if (nativeSuccess && !aggressive) return true;
    
    // 2. JavaScript 기반 최적화 (필요한 경우)
    
    // DOM 참조 정리
    cleanupDOM();
    
    // GC 힌트 제공
    suggestGarbageCollection();
    
    // Electron 메인 프로세스에 메모리 최적화 요청
    if (window.electronAPI && window.electronAPI.optimizeMemory) {
      window.electronAPI.optimizeMemory(aggressive);
    }
    
    // 적극적 모드일 경우 추가 작업
    if (aggressive) {
      // 이미지 캐시 정리
      clearImageCache();
      
      // 로컬 스토리지의 불필요한 데이터 정리
      cleanLocalStorage();
      
      // 사용하지 않는 이미지 언로드
      unloadUnusedImages();
    }
    
    return true;
  } catch (error) {
    console.error('메모리 최적화 중 오류:', error);
    return false;
  }
}

/**
 * 메모리 최적화 수행 함수 (공개 API)
 * 
 * @param {boolean} deepCleanup 심층 정리 여부
 * @returns {Promise<boolean>} 성공 여부
 */
export async function optimizeMemory(deepCleanup = false): Promise<boolean> {
  try {
    // 적극적인 플래그 설정
    const aggressive = deepCleanup;
    
    // 내부 최적화 함수 호출
    const result = await internalOptimizeMemory(aggressive);
    
    // 추가 정리 작업
    if (deepCleanup) {
      await clearLargeObjectsAndCaches();
    }
    
    // GC 요청
    await requestGC(deepCleanup);
    
    return result;
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    return false;
  }
}

/**
 * 객체를 메모리 풀에서 재사용
 * (네이티브 모듈에서 지원하는 경우 사용)
 */
export function getFromMemoryPool<T>(poolName: string, size: number, factory: () => T): T {
  // 메모리 풀 지원 확인
  if (window.__memoryOptimizer?.acquireFromPool) {
    try {
      const obj = window.__memoryOptimizer.acquireFromPool(poolName);
      if (obj) return obj as T;
    } catch (e) {
      console.warn('메모리 풀 사용 오류, 직접 생성으로 폴백:', e);
    }
  }
  
  // 폴백: 직접 객체 생성
  return factory();
}

/**
 * 객체를 메모리 풀로 반환
 * (네이티브 모듈에서 지원하는 경우 사용)
 */
export function returnToMemoryPool<T>(poolName: string, obj: T): void {
  if (window.__memoryOptimizer?.releaseToPool) {
    try {
      window.__memoryOptimizer.releaseToPool(obj);
    } catch (e) {
      console.warn('메모리 풀 반환 오류:', e);
    }
  }
}
