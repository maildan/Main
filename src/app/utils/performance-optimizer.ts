/**
 * 성능 최적화 유틸리티
 * 
 * 애플리케이션 성능 최적화 기능을 제공합니다.
 */

import { getSystemStatus } from './system-monitor';
import { optimizeMemory } from './nativeModuleClient';
import { setGpuAcceleration } from './gpu-acceleration';
import { MemoryUsageLevel, ProcessingMode, OptimizationLevel } from '@/types';

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
    
    // 메모리 사용량이 임계치 이상이거나 강제 모드인 경우에만 최적화
    if (status.memory.percentUsed >= currentSettings.memoryThreshold || forced) {
      // 메모리 레벨에 따른 최적화 수준 결정
      let optimizationLevel = 0;
      let emergency = false;
      
      switch (status.memory.level) {
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
    
    // GPU 가속 여부 결정
    if (currentSettings.switchToGpuIfAvailable) {
      const shouldUseGpu = 
        status.memory.level !== MemoryUsageLevel.CRITICAL && 
        status.memory.level !== MemoryUsageLevel.HIGH;
      
      // 현재 GPU 상태와 다른 경우에만 변경
      if (shouldUseGpu !== status.processing.gpuEnabled) {
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
    } else if (mode === 'cpu-intensive' || mode === 'memory-saving') {
      await setGpuAcceleration(false);
      
      // 메모리 절약 모드면 추가 최적화 수행
      if (mode === 'memory-saving') {
        await optimizeMemory(3, true);
      }
    }
    
    // 현재 설정 및 모드 저장 (브라우저 환경인 경우)
    if (typeof window !== 'undefined') {
      // 타입 안전하게 접근
      if (!window.__memoryManager) {
        window.__memoryManager = { settings: {} };
      }
      
      // 설정 업데이트
      if (window.__memoryManager) {
        window.__memoryManager.settings = {
          ...window.__memoryManager.settings,
          processingMode: mode
        };
      }
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
  if (status.memory.level === MemoryUsageLevel.HIGH) {
    batchSize = Math.max(10, Math.floor(batchSize / 2));
  } else if (status.memory.level === MemoryUsageLevel.CRITICAL) {
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
      
      if (currentStatus.memory.level === MemoryUsageLevel.HIGH || 
          currentStatus.memory.level === MemoryUsageLevel.CRITICAL) {
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
