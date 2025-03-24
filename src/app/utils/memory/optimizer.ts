/**
 * 메모리 최적화 코어 유틸리티
 * 
 * 이 모듈은 네이티브 모듈 기반 최적화 함수를 제공합니다.
 * 모든 최적화 작업은 Rust로 구현된 네이티브 모듈을 통해 수행됩니다.
 */

import { requestNativeMemoryOptimization } from '../native-memory-bridge';
import { suggestGarbageCollection, requestGC } from './gc-utils';
import { OptimizationLevel as AppOptimizationLevel } from '@/types';
import { OptimizationLevel as NativeOptimizationLevel } from '@/types/native-module';
import { toNativeOptimizationLevel } from '../enum-converters';

/**
 * 메모리 최적화 수행 함수 (내부 구현)
 * 네이티브 모듈을 통해 메모리 최적화를 수행합니다.
 * 
 * @param {boolean} aggressive 적극적 최적화 여부
 * @returns {Promise<boolean>} 성공 여부
 */
export async function internalOptimizeMemory(aggressive: boolean = false): Promise<boolean> {
  try {
    // 적절한 최적화 레벨 선택
    const appLevel = aggressive ? AppOptimizationLevel.HIGH : AppOptimizationLevel.MEDIUM;
    // 명시적 변환 함수 사용
    const nativeLevel = toNativeOptimizationLevel(appLevel);
    
    // 네이티브 모듈 최적화 호출
    const result = await requestNativeMemoryOptimization(nativeLevel, aggressive);
    
    if (!result) {
      console.warn('네이티브 메모리 최적화 실패');
      return false;
    }
    
    // 브라우저에 GC 힌트 제공
    suggestGarbageCollection();
    
    // Electron 메인 프로세스에 메모리 최적화 요청 (지원되는 경우)
    if (window.electronAPI && window.electronAPI.optimizeMemory) {
      window.electronAPI.optimizeMemory(aggressive);
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
    
    // GC 요청
    await requestGC(deepCleanup);
    
    return result;
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    return false;
  }
}
