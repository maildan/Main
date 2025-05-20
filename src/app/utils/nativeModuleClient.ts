/**
 * 네이티브 모듈 클라이언트 API
 *
 * 프론트엔드에서 네이티브 모듈 기능을 사용하기 위한 래퍼 함수들을 제공합니다.
 */

import type {
  MemoryInfo,
  OptimizationResult,
  GCResult,
  GpuComputationResult,
  TaskResult,
} from '@/types';
import { OptimizationLevel, NativeModuleStatus } from '@/types/native-module';

// 윈도우 객체에 nativeModule 확장
declare global {
  interface Window {
    nativeModule: {
      getGpuInfo: () => Promise<NativeResponse<GpuInfo>>;
      setGpuAcceleration: (enabled: boolean) => Promise<NativeResponse<boolean>>;
      getMemoryInfo: () => Promise<NativeResponse<MemoryInfo>>;
      optimizeMemory: (level?: OptimizationLevel) => Promise<NativeResponse<OptimizationResult>>;
      forceGarbageCollection: () => Promise<NativeResponse<GCResult>>;
      performGpuComputation: (
        taskType: GpuTaskType,
        params: Record<string, any>
      ) => Promise<NativeResponse<any>>;
    };
  }
}

/**
 * 네이티브 모듈 응답 인터페이스
 */
interface NativeResponse<T = any> {
  success: boolean;
  error?: string;
  timestamp: number;
  data?: T;
}

/**
 * GPU 정보 인터페이스
 */
export interface GpuInfo {
  name: string;
  vendor: string;
  renderer?: string;
  driverInfo?: string;
  deviceType?: string;
  backend?: string;
  available: boolean;
  accelerationEnabled?: boolean;
}

/**
 * GPU 가속 상태 인터페이스
 */
export interface GpuAccelerationStatus {
  available: boolean;
  enabled: boolean;
  info?: GpuInfo;
}

/**
 * GPU 작업 유형
 */
export enum GpuTaskType {
  MatrixMultiplication = 'matrix',
  TextAnalysis = 'text',
  ImageProcessing = 'image',
  DataAggregation = 'data',
  PatternDetection = 'pattern',
  TypingStatistics = 'typing',
  Custom = 'custom',
}

// 상태 캐시
let moduleStatusCache: NativeModuleStatus | null = null;
let lastStatusCheck = 0;
const STATUS_CACHE_TTL = 10000; // 10초

/**
 * 메모리 정보 조회
 * @returns 메모리 사용량 정보
 */
export const getMemoryInfo = async (): Promise<MemoryInfo | null> => {
  try {
    // 네이티브 모듈을 통해 메모리 정보 요청
    const response = await window.nativeModule.getMemoryInfo();

    if (!response.success || !response.data) {
      console.error('메모리 정보를 가져오는 데 실패했습니다:', response.error);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error('메모리 정보를 가져오는 중 오류 발생:', error);
    return null;
  }
};

/**
 * 메모리 최적화 수행
 * @param level 최적화 레벨
 * @returns 최적화 결과
 */
export const optimizeMemory = async (
  level: OptimizationLevel = OptimizationLevel.Medium
): Promise<OptimizationResult | null> => {
  try {
    // 네이티브 모듈을 통해 메모리 최적화 요청
    const response = await window.nativeModule.optimizeMemory(level);

    if (!response.success || !response.data) {
      console.error('메모리 최적화에 실패했습니다:', response.error);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error('메모리 최적화 중 오류 발생:', error);
    return null;
  }
};

/**
 * 가비지 컬렉션 강제 수행
 * @returns GC 결과
 */
export const forceGarbageCollection = async (): Promise<GCResult | null> => {
  try {
    // 네이티브 모듈을 통해 GC 요청
    const response = await window.nativeModule.forceGarbageCollection();

    if (!response.success || !response.data) {
      console.error('가비지 컬렉션에 실패했습니다:', response.error);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error('가비지 컬렉션 중 오류 발생:', error);
    return null;
  }
};

/**
 * GPU 연산 작업 수행
 * @param taskType 작업 유형
 * @param params 작업 파라미터
 * @returns 연산 결과
 */
export const performGpuComputation = async (
  taskType: GpuTaskType,
  params: Record<string, any>
): Promise<any | null> => {
  try {
    // 네이티브 모듈을 통해 GPU 연산 요청
    const response = await window.nativeModule.performGpuComputation(taskType, params);

    if (!response.success || !response.data) {
      console.error(`GPU 연산(${taskType})에 실패했습니다:`, response.error);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error(`GPU 연산(${taskType}) 중 오류 발생:`, error);
    return null;
  }
};

/**
 * GPU 정보 가져오기
 * @returns GPU 정보
 */
export const getGpuInfo = async (): Promise<GpuInfo | null> => {
  try {
    // 네이티브 모듈 존재 확인
    if (!window.nativeModule || !window.nativeModule.getGpuInfo) {
      console.warn('네이티브 GPU 모듈을 사용할 수 없어 기본값을 반환합니다.');
      return {
        name: 'Default GPU',
        vendor: 'Unknown',
        renderer: 'Software Renderer',
        available: false,
        accelerationEnabled: false
      };
    }

    // 네이티브 모듈을 통해 GPU 정보 가져오기
    const response = await window.nativeModule.getGpuInfo();

    if (!response.success || !response.data) {
      console.error('GPU 정보를 가져오는 데 실패했습니다:', response.error);
      return null;
    }

    return response.data;
  } catch (error) {
    console.error('GPU 정보를 가져오는 중 오류 발생:', error);
    return null;
  }
};

/**
 * GPU 가속 설정
 * @param enabled 활성화 여부
 * @returns 설정 결과
 */
export const setGpuAcceleration = async (enabled: boolean): Promise<boolean> => {
  try {
    // 네이티브 모듈을 통해 GPU 가속 설정
    const response = await window.nativeModule.setGpuAcceleration(enabled);

    if (!response.success) {
      console.error('GPU 가속 설정에 실패했습니다:', response.error);
      return false;
    }

    return response.data || false;
  } catch (error) {
    console.error('GPU 가속 설정 중 오류 발생:', error);
    return false;
  }
};

/**
 * 네이티브 모듈 상태 조회
 * @returns 네이티브 모듈 상태 정보
 */
export async function getNativeModuleStatus(): Promise<NativeModuleStatus> {
  // 캐시된 상태가 있으면 반환
  if (moduleStatusCache && Date.now() - (moduleStatusCache.timestamp || 0) < 60000) {
    return moduleStatusCache;
  }

  try {
    // GPU 정보 요청으로 네이티브 모듈 상태 확인
    const gpuInfo = await getGpuInfo();

    // 성공적으로 응답을 받았으면 모듈이 사용 가능함
    if (gpuInfo) {
      // NativeResponse 형식에서 NativeModuleStatus 형식으로 변환
      const result: NativeModuleStatus = {
        available: true,
        fallbackMode: false,
        version: '1.0.0', // 네이티브 모듈 버전
        info: gpuInfo,
        timestamp: Date.now(),
      };

      // 상태 캐싱
      moduleStatusCache = result;
      return result;
    }

    // 응답 실패 시 기본 오류 상태 반환
    const errorStatus: NativeModuleStatus = {
      available: false,
      fallbackMode: true,
      version: null,
      info: null,
      timestamp: Date.now(),
      error: '네이티브 모듈을 사용할 수 없습니다.',
    };

    moduleStatusCache = errorStatus;
    return errorStatus;
  } catch (error) {
    console.error('네이티브 모듈 상태 조회 오류:', error);

    const errorStatus: NativeModuleStatus = {
      available: false,
      fallbackMode: true,
      version: null,
      info: null,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };

    moduleStatusCache = errorStatus;
    return errorStatus;
  }
}

/**
 * 네이티브 모듈 사용 가능 여부 확인
 * @returns 사용 가능 여부
 */
export function isNativeModuleAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.nativeModule;
}
