/**
 * 성능 최적화 유틸리티
 *
 * 메모리와 CPU/GPU 사용을 최적화하여 애플리케이션 성능 개선
 */

import { optimizeMemory, forceGarbageCollection, getMemoryInfo } from './nativeModuleClient';
import { setGpuAcceleration } from './gpu-acceleration';
import { MemoryUsageLevel, SystemStatus, ProcessingMode } from '@/types';
import { OptimizationLevel } from '@/types/native-module';
import { useCallback, useEffect, useRef, useState } from 'react';
import React from 'react';
import { getSystemStatus } from './system-monitor';

// 최적화 설정
interface OptimizationSettings {
  autoOptimize: boolean;
  memoryThreshold: number;
  aggressiveMode: boolean;
  switchToGpuIfAvailable: boolean;
}

// 기본 설정
const defaultSettings: OptimizationSettings = {
  autoOptimize: true,
  memoryThreshold: 70, // 70% 이상 사용시 최적화
  aggressiveMode: false,
  switchToGpuIfAvailable: true,
};

// 현재 설정
let currentSettings: OptimizationSettings = { ...defaultSettings };

/**
 * 설정 업데이트
 * @param settings 부분 설정 객체
 */
export function updateSettings(settings: Partial<OptimizationSettings>) {
  currentSettings = { ...currentSettings, ...settings };
}

/**
 * 성능 분석 및 최적화 수행
 * @param forced 강제 최적화 여부
 */
export async function analyzeAndOptimize(forced = false): Promise<boolean> {
  try {
    // 자동 최적화가 비활성화되고 강제 모드가 아니면 중단
    if (!currentSettings.autoOptimize && !forced) {
      return false;
    }

    // 시스템 상태 확인
    const status = await getSystemStatus(true);

    // 메모리 사용량이 임계치 이상이거나 강제 모드인 경우에만 최적화
    const memoryPercentUsed =
      status.memoryInfo && status.memoryInfo.percentUsed ? status.memoryInfo.percentUsed : 0;

    if (memoryPercentUsed >= currentSettings.memoryThreshold || forced) {
      // 메모리 레벨에 따른 최적화 수준 결정
      let optimizationLevel = OptimizationLevel.Normal;

      switch (status.memoryUsageLevel) {
        case MemoryUsageLevel.CRITICAL:
          optimizationLevel = OptimizationLevel.Critical;
          break;
        case MemoryUsageLevel.HIGH:
          optimizationLevel = OptimizationLevel.High;
          break;
        case MemoryUsageLevel.MEDIUM:
          optimizationLevel = OptimizationLevel.Medium;
          break;
        case MemoryUsageLevel.LOW:
        default:
          optimizationLevel = forced ? OptimizationLevel.Low : OptimizationLevel.Normal;
      }

      // 최적화 필요한 경우 수행
      if (optimizationLevel > OptimizationLevel.Normal) {
        console.log(`성능 최적화 수행 (레벨: ${optimizationLevel})`);

        const result = await optimizeMemory(optimizationLevel);
        return result !== null;
      }
    }

    return false;
  } catch (error) {
    console.error('성능 최적화 오류:', error);
    return false;
  }
}

/**
 * 특정 처리 모드로 전환
 * @param mode 처리 모드
 */
export async function switchProcessingMode(mode: ProcessingMode): Promise<boolean> {
  try {
    // GPU 활성화 여부 결정
    const enableGpu = mode === ProcessingMode.GPU_INTENSIVE;

    // GPU 가속 설정 변경
    if (enableGpu) {
      await setGpuAcceleration(true);
    } else if (mode === ProcessingMode.CPU_INTENSIVE) {
      // CPU 집중 모드
      await setGpuAcceleration(false);
    } else if (mode === ProcessingMode.MEMORY_SAVING) {
      // 메모리 절약 모드
      await setGpuAcceleration(false);
      const result = await optimizeMemory(OptimizationLevel.High);
      return result !== null;
    } else if (mode === ProcessingMode.NORMAL) {
      // normal 모드
      await setGpuAcceleration(true);
    } else if (mode === ProcessingMode.AUTO) {
      // auto 모드
      await setGpuAcceleration(true);
    }

    return true;
  } catch (error) {
    console.error('처리 모드 전환 오류:', error);
    return false;
  }
}

/**
 * 일괄 작업 최적화
 * @param items 처리할 항목 배열
 * @param processFn 항목 처리 함수
 * @param batchSize 배치 크기
 */
export async function processBatched<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  batchSize = 50
): Promise<R[]> {
  const results: R[] = [];

  // 항목이 없으면 빈 배열 반환
  if (!items.length) return results;

  // 처리 전 시스템 상태 확인
  const status = await getSystemStatus();

  // 메모리 사용량이 높으면 배치 크기 줄이기
  if (status.memoryUsageLevel === MemoryUsageLevel.HIGH) {
    batchSize = Math.max(10, Math.floor(batchSize / 2));
  } else if (status.memoryUsageLevel === MemoryUsageLevel.CRITICAL) {
    batchSize = Math.max(5, Math.floor(batchSize / 4));
  }

  // 배치로 처리
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // 병렬 처리
    const batchResults = await Promise.all(batch.map(processFn));
    results.push(...batchResults);

    // 배치 처리 후 메모리 사용량이 높으면 최적화 수행
    if (i + batchSize < items.length) {
      const currentStatus = await getSystemStatus(true);

      if (
        currentStatus.memoryUsageLevel === MemoryUsageLevel.HIGH ||
        currentStatus.memoryUsageLevel === MemoryUsageLevel.CRITICAL
      ) {
        await analyzeAndOptimize(true);

        // 잠시 딜레이를 주어 GC가 실행될 시간 제공
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  return results;
}

/**
 * 백그라운드 모드를 위한 성능 최적화
 */
export async function optimizeForBackground(): Promise<boolean> {
  try {
    // 백그라운드에서는 메모리 사용량 최소화에 집중
    console.log('백그라운드 모드에서 성능 최적화');

    // GPU 가속 비활성화
    await setGpuAcceleration(false);

    // 메모리 최적화 수행
    const result = await optimizeMemory(OptimizationLevel.High);
    return result !== null;
  } catch (error) {
    console.error('백그라운드 최적화 오류:', error);
    return false;
  }
}

/**
 * 성능 최적화 수행
 * @param level 최적화 레벨
 */
export async function optimizePerformance(
  level: OptimizationLevel = OptimizationLevel.Medium
): Promise<boolean> {
  try {
    console.log(`성능 최적화 시작 (레벨: ${level})`);

    // 메모리 최적화 실행
    const result = await optimizeMemory(level);

    console.log('성능 최적화 완료');
    return result !== null;
  } catch (error) {
    console.error('성능 최적화 중 오류:', error);
    return false;
  }
}

/**
 * 렌더링 성능 최적화 유틸리티
 */

// 렌더링 디바운스 시간 (밀리초)
const RENDER_DEBOUNCE_TIME = 16; // 약 60fps에 해당

/**
 * 렌더링 디바운스 훅
 * @param callback 콜백 함수
 * @param delay 지연 시간 (ms)
 * @returns 디바운스된 콜백 함수
 */
export function useRenderDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = RENDER_DEBOUNCE_TIME
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 콜백 참조 업데이트
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // 디바운스 함수 생성
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as unknown as T;

  // 클린업
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * 요소가 뷰포트 내에 있는지 확인
 * @param element HTML 요소
 * @returns 뷰포트 내 여부
 */
export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 숨겨진 요소 최적화
 */
export function optimizeHiddenElements(): void {
  // DOM 요소 선택 대상
  const targets = [
    document.querySelectorAll('.typing-chart'),
    document.querySelectorAll('.stats-panel'),
    document.querySelectorAll('.memory-monitor'),
  ];

  // 각 대상에 대해
  targets.forEach(elements => {
    elements.forEach(element => {
      const htmlElement = element as HTMLElement;
      if (!isElementInViewport(htmlElement)) {
        // 뷰포트 밖의 요소는 렌더링 최적화
        htmlElement.style.willChange = 'auto';
        htmlElement.style.animationPlayState = 'paused';
      } else {
        // 뷰포트 내의 요소는 일반 렌더링
        htmlElement.style.willChange = '';
        htmlElement.style.animationPlayState = '';
      }
    });
  });
}

/**
 * 성능 진단 및 최적화
 */
export async function diagnoseAndOptimizePerformance(): Promise<{
  optimized: boolean;
  memoryFreed: number;
}> {
  try {
    // 현재 상태 확인
    const status = await getSystemStatus(true);
    const memoryBefore = status.memoryInfo?.heapUsed || 0;

    // 메모리 사용량에 따라 최적화 레벨 결정
    let optimizationLevel = OptimizationLevel.Low;
    let shouldOptimize = true;

    if (status.memoryUsageLevel === MemoryUsageLevel.HIGH) {
      optimizationLevel = OptimizationLevel.High;
    } else if (status.memoryUsageLevel === MemoryUsageLevel.CRITICAL) {
      optimizationLevel = OptimizationLevel.Critical;
    } else if (status.memoryUsageLevel === MemoryUsageLevel.MEDIUM) {
      optimizationLevel = OptimizationLevel.Medium;
    } else if (status.memoryUsageLevel === MemoryUsageLevel.LOW) {
      shouldOptimize = false; // 낮은 메모리 사용량에서는 최적화 불필요
    }

    // 최적화 필요 시 수행
    if (shouldOptimize) {
      const result = await optimizeMemory(optimizationLevel);

      // 최적화 후 상태 확인
      const afterStatus = await getSystemStatus(true);
      const memoryAfter = afterStatus.memoryInfo?.heapUsed || 0;
      const memoryFreed = Math.max(0, memoryBefore - memoryAfter);

      return {
        optimized: result !== null,
        memoryFreed,
      };
    }

    return {
      optimized: false,
      memoryFreed: 0,
    };
  } catch (error) {
    console.error('성능 진단 중 오류:', error);
    return {
      optimized: false,
      memoryFreed: 0,
    };
  }
}

/**
 * 이벤트 리스너 정리
 */
function cleanupEventListeners(): void {
  if (typeof window === 'undefined') return;

  // 정리할 이벤트 타입
  const eventTypes = ['resize', 'scroll', 'mousemove', 'touchmove'];

  // 이벤트 캐시 초기화
  (window as any).__eventCache = (window as any).__eventCache || {};

  // 각 이벤트 타입에 대해
  eventTypes.forEach(type => {
    if ((window as any).__eventCache[type] > 20) {
      console.warn(`이벤트 리스너(${type}) 수가 많습니다. 정리 필요.`);
    }
  });
}

/**
 * 성능 최적화 HOC
 */
export function withPerformanceOptimization<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> {
  const OptimizedComponent: React.FC<P> = (props) => {
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    useEffect(() => {
      // 컴포넌트 마운트 시 최적화 설정
      const setup = async () => {
        setIsOptimizing(true);
        try {
          const status = await getSystemStatus();
          
          // 메모리 상태에 따라 GPU 가속화 설정
          if (status.memoryUsageLevel >= MemoryUsageLevel.HIGH) {
            await setGpuAcceleration(false);
          } else {
            await setGpuAcceleration(true);
          }
          
          // 필요한 경우 추가 최적화 수행
          if (status.memoryUsageLevel >= MemoryUsageLevel.MEDIUM) {
            const result = await optimizeMemory(OptimizationLevel.Low);
            if (result === null) {
              console.warn('메모리 최적화 실패');
            }
          }
        } catch (error) {
          console.error('성능 최적화 설정 오류:', error);
        } finally {
          setIsOptimizing(false);
        }
      };
      
      setup();
      
      // 주기적 최적화 검사
      const optimizationInterval = setInterval(async () => {
        const status = await getSystemStatus(false);
        if (status.memoryUsageLevel >= MemoryUsageLevel.HIGH) {
          await diagnoseAndOptimizePerformance();
        }
      }, 60000); // 1분마다 체크
      
      // 클린업 함수
      return () => {
        clearInterval(optimizationInterval);
        cleanupEventListeners();
      };
    }, []);

    return React.createElement(WrappedComponent, { ...props });
  };

  // 디스플레이 이름 설정
  OptimizedComponent.displayName = `WithPerformanceOptimization(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return OptimizedComponent;
}
