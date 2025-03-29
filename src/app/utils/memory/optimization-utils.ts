/**
 * 메모리 최적화 유틸리티
 */

import { MemoryInfo } from '@/types';
import { OptimizationResult } from '@/types/native-module';

// MemoryInfo 인터페이스에 error 속성 추가
export interface MemoryInfoWithError extends MemoryInfo {
  error?: string;
}

// 메모리 정보 변환 유틸리티
export function convertNativeMemoryInfo(nativeInfo: any): Partial<MemoryInfo> {
  if (!nativeInfo) return {};

  return {
    heapUsed: nativeInfo.heap_used || 0,
    heapTotal: nativeInfo.heap_total || 0,
    heapLimit: nativeInfo.heap_limit,
    heapUsedMB: nativeInfo.heap_used_mb || 0,
    rss: nativeInfo.rss,
    rssMB: nativeInfo.rss_mb,
    percentUsed: nativeInfo.percent_used || 0,
    timestamp: nativeInfo.timestamp || Date.now(),
  };
}

// 메모리 정보 가져오기
export async function getMemoryInfoAsync(): Promise<Partial<MemoryInfo>> {
  if (typeof window === 'undefined') {
    return {};
  }
  
  try {
    // 네이티브 모듈에서 정보 가져오기
    if (window.__memoryOptimizer?.getMemoryInfo) {
      const nativeInfo = await window.__memoryOptimizer.getMemoryInfo();
      return await Promise.resolve(convertNativeMemoryInfo(nativeInfo));
    }
    
    // 브라우저 performance API 사용
    if (performance && (performance as any).memory) {
      const mem = (performance as any).memory;
      
      const result: Partial<MemoryInfo> = {
        heapUsed: mem.usedJSHeapSize,
        heapTotal: mem.totalJSHeapSize,
        heapLimit: mem.jsHeapSizeLimit,
        heapUsedMB: mem.usedJSHeapSize / (1024 * 1024),
        percentUsed: (mem.usedJSHeapSize / mem.totalJSHeapSize) * 100,
        timestamp: Date.now()
      };
      
      return result;
    }
    
    return {
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('메모리 정보 가져오기 실패:', error);
    return {
      timestamp: Date.now(),
      error: String(error)
    } as MemoryInfoWithError;
  }
}

// OptimizationLevel 열거형을 값으로 사용할 수 있도록 상수로 선언
export const OptimizationLevelValues = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  EXTREME: 4
};

// 안전한 최적화 레벨 확인
export function safeOptimizationLevel(level: number | string | undefined): number {
  if (level === undefined) {
    return OptimizationLevelValues.NONE;
  }
  
  // 문자열인 경우 숫자로 변환 시도
  if (typeof level === 'string') {
    const numLevel = parseInt(level, 10);
    if (!isNaN(numLevel)) {
      level = numLevel;
    } else {
      // 열거형 문자열 매핑
      switch (level.toUpperCase()) {
        case 'NONE': return OptimizationLevelValues.NONE;
        case 'LOW': return OptimizationLevelValues.LOW;
        case 'MEDIUM': return OptimizationLevelValues.MEDIUM;
        case 'HIGH': return OptimizationLevelValues.HIGH;
        case 'EXTREME': return OptimizationLevelValues.EXTREME;
        default: return OptimizationLevelValues.NONE;
      }
    }
  }
  
  // 숫자로 처리
  const numLevel = Number(level);
  
  if (numLevel < OptimizationLevelValues.NONE) {
    return OptimizationLevelValues.NONE;
  }
  
  if (numLevel > OptimizationLevelValues.EXTREME) {
    return OptimizationLevelValues.EXTREME;
  }
  
  return numLevel;
}

// 네이티브 최적화 레벨로 변환
export function toNativeOptimizationLevel(level: number): number {
  const safeLevel = safeOptimizationLevel(level);
  
  switch (safeLevel) {
    case OptimizationLevelValues.NONE: return 0;
    case OptimizationLevelValues.LOW: return 1;
    case OptimizationLevelValues.MEDIUM: return 2;
    case OptimizationLevelValues.HIGH: return 3;
    case OptimizationLevelValues.EXTREME: return 4;
    default: return 0;
  }
}

/**
 * 현재 메모리 사용량 기준으로 최적화 레벨 결정
 */
export async function determineOptimizationLevel(): Promise<number> {
  const memoryInfo = await getMemoryInfoAsync();
  const percentUsed = memoryInfo.percentUsed || 0;
  
  // 문자열을 숫자로 명시적 변환
  const percent = Number(percentUsed);
  
  if (percent >= 90) {
    return OptimizationLevelValues.EXTREME;
  }
  
  if (percent >= 75) {
    return OptimizationLevelValues.HIGH;
  }
  
  if (percent >= 60) {
    return OptimizationLevelValues.MEDIUM;
  }
  
  if (percent >= 40) {
    return OptimizationLevelValues.LOW;
  }
  
  return OptimizationLevelValues.NONE;
}

/**
 * 브라우저의 가시성 상태에 따른 메모리 최적화
 */
export function setupVisibilityBasedOptimization(
  onVisibilityChange?: (isVisible: boolean) => void
): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const handleVisibilityChange = () => {
    const isVisible = document.visibilityState === 'visible';
    
    if (onVisibilityChange) {
      onVisibilityChange(isVisible);
    }
    
    if (!isVisible) {
      // 페이지가 숨겨진 경우 메모리 최적화 수행
      setTimeout(async () => {
        const level = await determineOptimizationLevel();
        if (level > OptimizationLevelValues.NONE) {
          if (window.__memoryOptimizer?.optimizeMemory) {
            window.__memoryOptimizer.optimizeMemory(level >= OptimizationLevelValues.HIGH);
          }
        }
      }, 500);
    }
  };

  // 여러 브라우저 접두사 지원
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // MS 접두사 이벤트 (cSpell 경고 무시)
  /* cspell:disable-next-line */
  document.addEventListener('msvisibilitychange', handleVisibilityChange);
  
  // Webkit 접두사 이벤트 (cSpell 경고 무시)
  /* cspell:disable-next-line */
  document.addEventListener('webkitvisibilitychange', handleVisibilityChange);

  // 정리 함수 반환
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    /* cspell:disable-next-line */
    document.removeEventListener('msvisibilitychange', handleVisibilityChange);
    /* cspell:disable-next-line */
    document.removeEventListener('webkitvisibilitychange', handleVisibilityChange);
  };
}

// DOM 정리 함수
export function cleanupDom(rootElement?: HTMLElement): void {
  const root = rootElement || document.body;
  
  // 메모리 누수 방지를 위한 참조 정리
  const cleanElement = (element: HTMLElement) => {
    // 이벤트 리스너 정리
    const clonedElement = element.cloneNode(false);
    if (element.parentNode) {
      element.parentNode.replaceChild(clonedElement, element);
    }
  };
  
  // 선택적으로 DOM 요소 정리
  if (root !== document.body) {
    cleanElement(root);
  }
}

// 캐시 정리 함수
export function cleanupCache(): boolean {
  let success = false;
  
  try {
    // Object URL 캐시 정리
    if (window.__objectUrls) {
      window.__objectUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // 무시
        }
      });
      window.__objectUrls.clear();
      success = true;
    }
    
    // 이미지 리사이즈 캐시 정리
    if (window.__imageResizeCache) {
      window.__imageResizeCache = new Map();
      success = true;
    }
    
    return success;
  } catch (e) {
    console.error('캐시 정리 중 오류 발생:', e);
    return false;
  }
}

// 리소스 최적화 함수
export function optimizeResources(): boolean {
  cleanupCache();
  
  // 추가 최적화 로직
  try {
    // 비활성 애니메이션 정리
    if (window.__animationFrameIds) {
      window.__animationFrameIds.forEach(id => {
        cancelAnimationFrame(id);
      });
      window.__animationFrameIds = [];
    }
    
    return true;
  } catch (e) {
    console.error('리소스 최적화 중 오류 발생:', e);
    return false;
  }
}
