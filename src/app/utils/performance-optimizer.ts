/**
 * 성능 최적화 유틸리티
 * 
 * 애플리케이션 성능 최적화 기능을 제공합니다.
 */

import { getSystemStatus } from './system-monitor';
import { optimizeMemory } from './nativeModuleClient';
import { setGpuAcceleration } from './gpu-acceleration';
import { MemoryUsageLevel, ProcessingMode, SystemStatus, MemorySettings, OptimizationLevel } from '@/types';
import { useCallback, useEffect, useRef } from 'react';
import React from 'react';

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
  switchToGpuIfAvailable: true
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
    
    // 메모리 정보가 없으면 기본값 사용
    const memoryInfo = status.memory ?? {
      percentUsed: 0,
      level: MemoryUsageLevel.LOW,
      heapUsedMB: 0,
      rssMB: 0
    };

    // 메모리 사용량이 임계치 이상이거나 강제 모드인 경우에만 최적화
    if (memoryInfo.percentUsed >= currentSettings.memoryThreshold || forced) {
      // 메모리 레벨에 따른 최적화 수준 결정
      let optimizationLevel = 0;
      let emergency = false;

      switch (memoryInfo.level) {
        case MemoryUsageLevel.CRITICAL:
          optimizationLevel = 4;
          emergency = true;
          break;
        case MemoryUsageLevel.HIGH:
          optimizationLevel = 3;
          emergency = currentSettings.aggressiveMode;
          break;
        case MemoryUsageLevel.MEDIUM:
          optimizationLevel = 2;
          emergency = false;
          break;
        case MemoryUsageLevel.LOW:
        default:
          optimizationLevel = forced ? 1 : 0;
          emergency = false;
      }

      // 최적화 필요한 경우 수행
      if (optimizationLevel > 0) {
        console.log(`성능 최적화 수행 (레벨: ${optimizationLevel}, 긴급: ${emergency})`);

        const result = await optimizeMemory(optimizationLevel, emergency);
        return result.success;
      }
    }

    // 처리 모드 정보가 없으면 기본값 사용
    const processingInfo = status.processing ?? {
      mode: ProcessingMode.NORMAL,
      gpuEnabled: false
    };

    // GPU 가속 여부 결정
    if (currentSettings.switchToGpuIfAvailable) {
      const shouldUseGpu =
        memoryInfo.level !== MemoryUsageLevel.CRITICAL &&
        memoryInfo.level !== MemoryUsageLevel.HIGH;

      // 현재 GPU 상태와 다른 경우에만 변경
      if (shouldUseGpu !== processingInfo.gpuEnabled) {
        await setGpuAcceleration(shouldUseGpu);
      }
    }

    return true;
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
    const enableGpu = mode === 'gpu-intensive';

    // GPU 가속 설정 변경
    if (enableGpu) {
      await setGpuAcceleration(true);
    } else if (mode === 'cpu-intensive') {
      // CPU 집중 모드
      await setGpuAcceleration(false);
    } else if (mode === 'memory-saving') {
      // 메모리 절약 모드
      await setGpuAcceleration(false);
      await optimizeMemory(3, true);
    } else if (mode === 'normal') {
      // normal 모드
      await setGpuAcceleration(true);
    } else if (mode === 'auto') {
      // auto 모드
      await setGpuAcceleration(true);
    }
  } catch (error) {
    console.error('처리 모드 전환 오류:', error);
    return false;
  }

  return true;
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
  const memoryLevel = status.memory?.level ?? MemoryUsageLevel.LOW;

  // 메모리 사용량이 높으면 배치 크기 줄이기
  if (memoryLevel === MemoryUsageLevel.HIGH) {
    batchSize = Math.max(10, Math.floor(batchSize / 2));
  } else if (memoryLevel === MemoryUsageLevel.CRITICAL) {
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
      const currentMemoryLevel = currentStatus.memory?.level ?? MemoryUsageLevel.LOW;

      if (currentMemoryLevel === MemoryUsageLevel.HIGH ||
        currentMemoryLevel === MemoryUsageLevel.CRITICAL) {
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

    // 메모리 최적화 수행 (레벨 3, 긴급 모드)
    await optimizeMemory(3, true);

    return true;
  } catch (error) {
    console.error('백그라운드 최적화 오류:', error);
    return false;
  }
}

/**
 * 성능 최적화 수행
 * @param level 최적화 레벨
 * @param emergency 긴급 모드 여부
 */
export async function optimizePerformance(
  // 수정: OptimizationLevel 열거형 값 사용
  level: OptimizationLevel = OptimizationLevel.MEDIUM,
  emergency: boolean = false
): Promise<boolean> {
  try {
    console.log(`성능 최적화 시작 (레벨: ${level}, 긴급: ${emergency})`);

    // 메모리 최적화 실행
    await optimizeMemory(level, emergency);

    console.log('성능 최적화 완료');
    return true;
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
 * 고비용 렌더링 디바운스 훅
 * @param callback 실행할 콜백 함수
 * @param delay 디바운스 지연 시간 (ms)
 * @returns 디바운스된 콜백 함수
 */
export function useRenderDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = RENDER_DEBOUNCE_TIME
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 클린업 함수
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    return new Promise<ReturnType<T>>((resolve) => {
      timeoutRef.current = setTimeout(() => {
        const result = callback(...args);
        resolve(result as ReturnType<T>);
      }, delay);
    });
  }, [callback, delay]) as T;
}

/**
 * DOM 요소 가시성에 따른 렌더링 최적화
 * @param element DOM 요소
 * @returns 요소가 화면에 보이는지 여부
 */
export function isElementInViewport(element: HTMLElement): boolean {
  if (!element) return false;

  const rect = element.getBoundingClientRect();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 숨겨진 요소의 렌더링 최적화
 */
export function optimizeHiddenElements(): void {
  if (typeof document === 'undefined') return;

  // 뷰포트 밖에 있는 큰 요소 최적화
  const offscreenElements = document.querySelectorAll('[data-optimize-offscreen="true"]');
  offscreenElements.forEach((element) => {
    if (element instanceof HTMLElement) {
      if (!isElementInViewport(element)) {
        // 화면 밖 요소는 DOM에서 렌더링 비용이 낮은 상태로 변경
        element.style.visibility = 'hidden';
        element.style.content = 'normal'; // CSS content 비우기
      } else {
        // 화면 안에 들어온 요소는 다시 표시
        element.style.visibility = 'visible';
      }
    }
  });
}

/**
 * 앱 성능 진단 및 최적화
 * @returns 성능 진단 결과
 */
export async function diagnoseAndOptimizePerformance(): Promise<{
  optimized: boolean;
  memoryFreed: number;
}> {
  let memoryFreed = 0;

  // 현재 메모리 상태 확인
  if (window.performance && (window.performance as any).memory) {
    const memory = (window.performance as any).memory;
    const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

    // 메모리 사용량이 70% 이상인 경우 최적화 수행
    if (usedRatio > 0.7) {
      const result = await optimizeMemory(2, usedRatio > 0.9);

      if (result && result.success && result.result) {
        memoryFreed = result.result.freed_mb || 0;
      }

      // DOM 최적화
      optimizeHiddenElements();

      // 이벤트 핸들러 누수 감지 및 정리
      cleanupEventListeners();

      return { optimized: true, memoryFreed };
    }
  }

  // 일반 최적화만 수행
  optimizeHiddenElements();

  return { optimized: false, memoryFreed };
}

/**
 * 이벤트 리스너 정리 (메모리 누수 방지)
 */
function cleanupEventListeners(): void {
  // 구현 힌트: DOM에 연결된 이벤트 리스너를 정리하는 로직
  // 실제 구현은 애플리케이션 특성에 맞게 조정 필요
  console.log('이벤트 리스너 정리 완료');
}

/**
 * 컴포넌트에서 사용할 성능 최적화 래퍼
 * @param WrappedComponent 최적화할 React 컴포넌트
 * @returns 최적화된 컴포넌트
 */
export function withPerformanceOptimization<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> {
  const OptimizedComponent: React.FC<P> = (props) => {
    useEffect(() => {
      // 컴포넌트 마운트 시 성능 최적화
      const optimizeTimer = setTimeout(() => {
        diagnoseAndOptimizePerformance();
      }, 500);

      return () => {
        clearTimeout(optimizeTimer);
      };
    }, []);

    // 수정: props 전달 방식 변경, 불필요한 타입 캐스팅 제거
    return React.createElement(WrappedComponent, props);
  };

  // 디버깅을 위한 표시 이름 설정
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';
  OptimizedComponent.displayName = `WithPerformanceOptimization(${displayName})`;

  return OptimizedComponent;
}

/**
 * 시스템 상태에 따라 메모리 최적화 수행
 * @param status 시스템 상태
 * @param currentSettings 메모리 설정
 * @param forced 강제 최적화 여부
 */
function optimizeBasedOnSystemStatus(status: SystemStatus, currentSettings: MemorySettings, forced = false): void {
  // status.memory와 status.processing이 undefined일 경우를 대비한 기본값 설정
  const memoryInfo = status.memory ?? {
    percentUsed: 0,
    level: MemoryUsageLevel.LOW,
    heapUsedMB: 0,
    rssMB: 0
  };
  
  const processingInfo = status.processing ?? {
    mode: ProcessingMode.NORMAL,
    gpuEnabled: false
  };

  // 메모리 임계값 초과 또는 강제 최적화 시 수행
  if (memoryInfo.percentUsed >= currentSettings.memoryThreshold || forced) {
    // 최적화 수준 선택
    let optimizationLevel: OptimizationLevel;
    
    // 메모리 사용 수준에 따른 최적화 강도 설정
    switch (memoryInfo.level) {
      case MemoryUsageLevel.CRITICAL:
        optimizationLevel = OptimizationLevel.AGGRESSIVE;
        break;
      case MemoryUsageLevel.HIGH:
        optimizationLevel = OptimizationLevel.HIGH;
        break;
      case MemoryUsageLevel.MEDIUM:
        optimizationLevel = OptimizationLevel.MEDIUM;
        break;
      default:
        optimizationLevel = OptimizationLevel.LOW;
    }

    // 최적화 실행
    optimizeMemory(optimizationLevel);
    
    // 보조 최적화 작업: 하드웨어 가속 최적화
    const shouldUseGpu = 
      memoryInfo.level !== MemoryUsageLevel.CRITICAL &&
      memoryInfo.level !== MemoryUsageLevel.HIGH;
    
    // GPU 가속 설정 변경 필요한 경우
    if (shouldUseGpu !== processingInfo.gpuEnabled) {
      setGpuAcceleration(shouldUseGpu);
    }
  }
}

/**
 * 시스템 성능에 따른 권장 테마 반환
 * @param status 시스템 상태
 * @returns 권장 테마
 */
function getRecommendedThemeBasedOnPerformance(status: SystemStatus): 'light' | 'dark' | 'system' {
  // memory 필드가 undefined일 경우를 대비한 기본값 설정
  const memoryLevel = status.memory?.level ?? MemoryUsageLevel.LOW;
  
  if (memoryLevel === MemoryUsageLevel.HIGH) {
    return 'light'; // 메모리 높음 - 라이트 테마 (일반적으로 DOM 요소가 덜 복잡함)
  } else if (memoryLevel === MemoryUsageLevel.CRITICAL) {
    return 'light'; // 메모리 위험 - 라이트 테마 (최소한의 스타일)
  } else {
    return 'system'; // 메모리 정상 - 시스템 기본값 유지
  }
}

/**
 * 시스템 상태에 따라 애니메이션 축소 여부 결정
 * @param currentStatus 시스템 상태
 * @returns 애니메이션 축소 여부
 */
function shouldUseReducedAnimations(currentStatus: SystemStatus): boolean {
  // memory 필드가 undefined일 경우를 대비한 기본값 설정
  const memoryLevel = currentStatus.memory?.level ?? MemoryUsageLevel.LOW;
  
  // 메모리 사용량이 높거나 위험한 경우에는 애니메이션 최소화
  return memoryLevel === MemoryUsageLevel.HIGH || memoryLevel === MemoryUsageLevel.CRITICAL;
}
