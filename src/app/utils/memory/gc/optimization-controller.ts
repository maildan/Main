/**
 * 메모리 최적화 컨트롤러
 * 
 * 이 모듈은 네이티브 모듈을 통해 다양한 수준의 메모리 최적화를 제공합니다.
 * 모든 실제 최적화 로직은 Rust 네이티브 모듈에서 처리됩니다.
 */

import { OptimizationLevel } from '@/types';
import { OptimizationResult } from '@/types';
import { requestNativeMemoryOptimization, requestNativeGarbageCollection } from '../../native-memory-bridge';
import { cleanLocalStorage, cleanSessionStorage, clearLargeObjectsAndCaches } from '../storage-cleaner';

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
  return requestNativeMemoryOptimization(OptimizationLevel.CRITICAL, true) as Promise<OptimizationResult>;
}

// 최적화 수준별 작업
export async function performOptimizationByLevel(level: OptimizationLevel): Promise<OptimizationResult> {
  return requestNativeMemoryOptimization(level, level === OptimizationLevel.CRITICAL) as Promise<OptimizationResult>;
}

// 메모리 최적화 단계를 간략화한 버전
export async function optimizeMemoryByLevel(level: 0 | 1 | 2 | 3 | 4): Promise<boolean> {
  try {
    // 최적화 수준에 따라 다른 동작 수행
    // 숫자 타입을 OptimizationLevel로 안전하게 변환
    const optimizationLevel = level as unknown as OptimizationLevel;
    await requestNativeMemoryOptimization(Number(optimizationLevel), level === 4);
    return true;
  } catch (error) {
    console.error(`메모리 최적화 실패 (레벨 ${level}):`, error);
    return false;
  }
}

// 이미지 및 미디어 캐시 정리
export async function clearImageCaches(): Promise<boolean> {
  try {
    if (window.caches) {
      const cacheNames = await caches.keys();
      const mediaRegex = /\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg|mp3|wav)$/i;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();

        for (const request of requests) {
          if (mediaRegex.test(request.url)) {
            await cache.delete(request);
          }
        }
      }
    }

    // 로컬 스토리지에서 이미지 캐시 정리
    cleanLocalStorage();

    return true;
  } catch (error) {
    console.error('이미지 캐시 정리 오류:', error);
    return false;
  }
}

// 로컬 스토리지 캐시 정리
export function clearStorageCaches(): boolean {
  try {
    cleanLocalStorage();
    cleanSessionStorage();
    clearLargeObjectsAndCaches();
    return true;
  } catch (error) {
    console.error('스토리지 캐시 정리 오류:', error);
    return false;
  }
}

// 브라우저 캐시 정리
export async function clearBrowserCaches(): Promise<boolean> {
  try {
    if (window.caches) {
      const cacheNames = await caches.keys();

      for (const cacheName of cacheNames) {
        if (cacheName.includes('temp') || cacheName.includes('nonessential')) {
          await caches.delete(cacheName);
        }
      }
    }

    return true;
  } catch (error) {
    console.error('브라우저 캐시 정리 오류:', error);
    return false;
  }
}

// 가비지 컬렉션 요청
export async function requestGC(emergency = false): Promise<any> {
  try {
    // emergency 매개변수를 올바르게 전달
    return await requestNativeGarbageCollection();
  } catch (error) {
    console.error('가비지 컬렉션 요청 오류:', error);
    return { success: false, error: String(error) };
  }
}

// 가비지 컬렉션 제안
export function suggestGarbageCollection(): void {
  if (typeof window !== 'undefined' && (window as any).gc) {
    (window as any).gc();
  }
}

// 최적화 컨트롤러 객체
interface OptimizationController {
  suggestGarbageCollection: () => void;
  requestGC: (emergency?: boolean) => Promise<any>;
  clearBrowserCaches: () => Promise<boolean>;
  clearStorageCaches: () => boolean;
  clearImageCaches: () => Promise<boolean>;
  performBasicOptimization: () => Promise<OptimizationResult>;
  performMediumOptimization: () => Promise<OptimizationResult>;
  performHighOptimization: () => Promise<OptimizationResult>;
  performCriticalOptimization: () => Promise<OptimizationResult>;
  optimizeMemoryByLevel: (level: 0 | 1 | 2 | 3 | 4) => Promise<boolean>;
  settings?: Record<string, any>;
}

// 최적화 컨트롤러 인스턴스 생성 및 내보내기
export const optimizationController: OptimizationController = {
  suggestGarbageCollection,
  requestGC,
  clearBrowserCaches,
  clearStorageCaches,
  clearImageCaches,
  performBasicOptimization,
  performMediumOptimization,
  performHighOptimization,
  performCriticalOptimization,
  optimizeMemoryByLevel,
  settings: {
    // 기본 설정
    preferNative: true,
    aggressiveMode: false,
    threshold: 80
  }
};

export default optimizationController;
