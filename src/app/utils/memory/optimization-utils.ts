/**
 * 메모리 최적화 유틸리티
 * 
 * 이 모듈은 메모리 최적화의 실제 구현을 담당합니다.
 * 상위 레벨 인터페이스는 memory-optimizer.ts에서 제공합니다.
 */

import { OptimizationLevel, MemoryInfo } from '../../../types';
import { cleanupDom } from './gc/dom-cleanup';
import { cleanupCache } from './gc/cache-optimizer';
import { optimizeEvents } from './gc/event-optimizer';
import { optimizeResources } from './gc/resource-optimizer';
import { emergencyRecovery } from './gc/emergency-recovery';
import { logger } from './logger';

/**
 * 안전한 최적화 레벨 값으로 변환
 * @param level 최적화 레벨 (0-4)
 * @returns 안전한 최적화 레벨
 */
export function safeOptimizationLevel(level: number): number {
  // 0-4 범위로 제한
  return Math.max(0, Math.min(4, Math.floor(level)));
}

/**
 * 네이티브 최적화 레벨로 변환
 * (타입 변환 지원)
 * @param level 최적화 레벨
 * @returns 네이티브 최적화 레벨
 */
export function toNativeOptimizationLevel(level: number | OptimizationLevel): number {
  return typeof level === 'number' ? safeOptimizationLevel(level) : level;
}

/**
 * 메모리 사용량 기반 최적화 레벨 결정
 * @param memoryUsagePercent 메모리 사용 비율 (0-100)
 * @returns 최적화 레벨 (0-4)
 */
export function determineOptimizationLevel(memoryUsagePercent: number): OptimizationLevel {
  if (memoryUsagePercent > 95) return OptimizationLevel.Extreme;
  if (memoryUsagePercent > 85) return OptimizationLevel.High;
  if (memoryUsagePercent > 70) return OptimizationLevel.Medium;
  if (memoryUsagePercent > 50) return OptimizationLevel.Low;
  return OptimizationLevel.None;
}

/**
 * 미사용 객체 참조 제거
 * @param obj 정리할 객체
 * @param preserveKeys 보존할 키 배열
 */
export function cleanupObject(obj: Record<string, any>, preserveKeys: string[] = []): void {
  if (!obj || typeof obj !== 'object') return;
  
  Object.keys(obj).forEach(key => {
    if (!preserveKeys.includes(key)) {
      delete obj[key];
    }
  });
}

/**
 * 비활성 인터벌/타임아웃 정리
 * 오랫동안 사용되지 않은 타이머 정리
 */
export function cleanupTimers(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // 등록된 애니메이션 프레임 정리
    if (Array.isArray(window.__animationFrameIds)) {
      window.__animationFrameIds.forEach(id => {
        cancelAnimationFrame(id);
      });
      window.__animationFrameIds.length = 0;
    }
    
    // 전역 캐시에서 인터벌 ID 정리
    if (Array.isArray(window.__intervalIds)) {
      window.__intervalIds.forEach(id => {
        clearInterval(id);
      });
      window.__intervalIds.length = 0;
    }
    
    // 전역 캐시에서 타임아웃 ID 정리
    if (Array.isArray(window.__timeoutIds)) {
      window.__timeoutIds.forEach(id => {
        clearTimeout(id);
      });
      window.__timeoutIds.length = 0;
    }
  } catch (error) {
    console.warn('타이머 정리 중 오류:', error);
  }
}

/**
 * 페이지 메모리 최적화 수행
 * @param aggressive 적극적 최적화 여부
 * @returns 메모리 최적화 성공 여부
 */
export async function optimizePageMemory(aggressive = false): Promise<boolean> {
  try {
    // 네이티브 메모리 최적화 시도
    if (window.__memoryOptimizer?.optimizeMemory) {
      await window.__memoryOptimizer.optimizeMemory(aggressive);
      return true;
    }
    
    // 네이티브 모듈 없이 기본 최적화 수행
    cleanupTimers();
    
    // 이미지 캐시 정리
    if (window.__imageResizeCache) {
      window.__imageResizeCache.clear();
    }
    
    // Object URL 정리
    if (window.__objectUrls) {
      window.__objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      window.__objectUrls.clear();
    }
    
    // 수동 GC 유도 
    if (typeof window.gc === 'function') {
      window.gc();
    } else {
      // GC 유도를 위한 메모리 압력 생성
      const pressureArray = [];
      try {
        for (let i = 0; i < 10; i++) {
          pressureArray.push(new ArrayBuffer(1024 * 1024));
        }
      } finally {
        // 참조 해제
        pressureArray.length = 0;
      }
    }
    
    return true;
  } catch (error) {
    console.error('페이지 메모리 최적화 오류:', error);
    return false;
  }
}

/**
 * 미사용 DOM 요소 정리
 * 화면에 보이지 않는 요소 최적화
 * @returns 정리된 DOM 요소 수
 */
export function cleanupInvisibleDomElements(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
  
  let cleanedCount = 0;
  
  try {
    // 보이지 않는 큰 이미지 요소 최적화
    const images = document.querySelectorAll('img[data-src]:not([loading="lazy"])');
    images.forEach((img) => {
      const imgElement = img as HTMLImageElement;
      const rect = imgElement.getBoundingClientRect();
      
      // 뷰포트 바깥에 있으면서 너무 큰 이미지 처리
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        if (imgElement.src && imgElement.dataset.src && imgElement.width > 300) {
          // 원본 소스 백업 후 작은 플레이스홀더로 대체
          if (!imgElement.dataset.originalSrc) {
            imgElement.dataset.originalSrc = imgElement.src;
            imgElement.src = imgElement.dataset.src; // 작은 썸네일로 대체
            cleanedCount++;
          }
        }
      } else {
        // 뷰포트로 돌아온 이미지 복원
        if (imgElement.dataset.originalSrc) {
          imgElement.src = imgElement.dataset.originalSrc;
          delete imgElement.dataset.originalSrc;
        }
      }
    });
    
    // 미사용 캔버스 정리
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach((canvas) => {
      const rect = canvas.getBoundingClientRect();
      
      // 뷰포트 바깥에 있는 캔버스 메모리 정리
      if (rect.bottom < -100 || rect.top > window.innerHeight + 100) {
        if (canvas.width > 200 && canvas.height > 200) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // 캔버스 컨텍스트 정리 (최적화)
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // 크기 백업
            if (!canvas.dataset.originalWidth) {
              canvas.dataset.originalWidth = canvas.width.toString();
              canvas.dataset.originalHeight = canvas.height.toString();
              
              // 메모리 사용량 줄이기 위해 크기 축소
              canvas.width = 10;
              canvas.height = 10;
              cleanedCount++;
            }
          }
        }
      } else {
        // 뷰포트로 돌아온 캔버스 복원
        if (canvas.dataset.originalWidth && canvas.dataset.originalHeight) {
          canvas.width = parseInt(canvas.dataset.originalWidth, 10);
          canvas.height = parseInt(canvas.dataset.originalHeight, 10);
          delete canvas.dataset.originalWidth;
          delete canvas.dataset.originalHeight;
        }
      }
    });
  } catch (error) {
    console.warn('DOM 요소 정리 중 오류:', error);
  }
  
  return cleanedCount;
}

// 자동 최적화 설정
let autoOptimizationEnabled = false;
let optimizationInterval = 60000; // 기본값: 1분
let memoryThreshold = 80; // 기본값: 80%

/**
 * 메모리 최적화를 실행합니다.
 * 
 * @param level - 최적화 레벨
 * @param emergency - 긴급 상황 여부
 */
export async function runOptimization(
  level: OptimizationLevel,
  emergency: boolean
): Promise<void> {
  logger.info(`[Optimization Utils] Running optimization at level: ${level}, emergency: ${emergency}`);
  
  // 요청된 레벨에 따라 최적화 작업 수행
  switch (level) {
    case OptimizationLevel.LIGHT:
      await cleanupCache();
      break;
      
    case OptimizationLevel.MEDIUM:
      await cleanupCache();
      await cleanupDom(false);
      break;
      
    case OptimizationLevel.AGGRESSIVE:
      await cleanupCache();
      await cleanupDom(true);
      await optimizeEvents();
      await optimizeResources();
      break;
      
    case OptimizationLevel.EMERGENCY:
      await emergencyRecovery();
      break;
      
    default:
      logger.warn(`[Optimization Utils] Unknown optimization level: ${level}`);
  }
  
  // 긴급 상황이면 추가 최적화 수행
  if (emergency) {
    logger.info('[Optimization Utils] Performing emergency optimizations');
    await emergencyRecovery();
  }
}

/**
 * 자동 메모리 최적화 설정을 구성합니다.
 * 
 * @param options - 자동 최적화 설정
 */
export function configureAutoOptimization(options: {
  enabled: boolean;
  interval?: number;
  threshold?: number;
}): void {
  autoOptimizationEnabled = options.enabled;
  
  if (options.interval !== undefined && options.interval > 0) {
    optimizationInterval = options.interval;
  }
  
  if (options.threshold !== undefined && options.threshold > 0) {
    memoryThreshold = Math.min(Math.max(options.threshold, 50), 90);
  }
  
  logger.info(`[Optimization Utils] Auto optimization configured: enabled=${autoOptimizationEnabled}, interval=${optimizationInterval}ms, threshold=${memoryThreshold}%`);
}

/**
 * 메모리 사용량을 확인하고 필요 시 최적화를 수행합니다.
 * 
 * @param memoryUsage - 현재 메모리 사용량
 */
export async function checkAndOptimize(memoryUsage: MemoryInfo): Promise<void> {
  if (!autoOptimizationEnabled) return;
  
  const usagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  logger.debug(`[Optimization Utils] Memory usage check: ${usagePercent.toFixed(2)}% (threshold: ${memoryThreshold}%)`);
  
  if (usagePercent >= memoryThreshold) {
    logger.warn(`[Optimization Utils] Memory usage (${usagePercent.toFixed(2)}%) exceeds threshold (${memoryThreshold}%)`);
    
    // 사용량에 따른 최적화 레벨 결정
    let level = OptimizationLevel.MEDIUM;
    let emergency = false;
    
    if (usagePercent >= 90) {
      level = OptimizationLevel.EMERGENCY;
      emergency = true;
    } else if (usagePercent >= 85) {
      level = OptimizationLevel.AGGRESSIVE;
    }
    
    await runOptimization(level, emergency);
  }
}
