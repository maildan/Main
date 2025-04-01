/**
 * 전역 타입 선언
 * 
 * 타입스크립트 전역 타입 정의입니다.
 */

// 전역 네임스페이스 선언
declare global {
  // GPU 관련 설정
  type ProcessingMode = 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive' | 'memory-saving';

  // window 객체 확장
  interface Window {
    // Electron API
    electronAPI?: ElectronAPI;

    // 개발용 전역 GC 함수 (Chrome에서 --js-flags="--expose-gc" 옵션 필요)
    gc?: () => void;

    // 개발자 도구에서 getEventListeners 함수
    getEventListeners?: (element: Element) => Record<string, EventListener[]>;

    // 메모리 최적화 유틸리티
    __memoryOptimizer?: {
      // 메모리 정보 가져오기
      getMemoryInfo?: () => any;

      // 메모리 사용률 가져오기
      getMemoryUsagePercent?: () => Promise<number>;

      // 가비지 컬렉션 제안
      suggestGarbageCollection?: () => void;

      // GC 요청
      requestGC?: (emergency?: boolean) => Promise<any>;

      // 브라우저 캐시 정리
      clearBrowserCaches?: () => Promise<boolean>;

      // 스토리지 캐시 정리
      clearStorageCaches?: () => boolean;

      // 메모리 최적화
      optimizeMemory?: (emergency?: boolean) => Promise<any>;

      // 다양한 최적화 함수들
      performBasicOptimization?: () => Promise<any>;
      performMediumOptimization?: () => Promise<any>;
      performHighOptimization?: () => Promise<any>;
      performCriticalOptimization?: () => Promise<any>;
      performOptimizationByLevel?: (level: number) => Promise<any>;
      emergencyMemoryRecovery?: () => Promise<boolean>;
      getMemoryInfo?: () => Promise<MemoryInfo | null>;
      getMemoryUsagePercentage?: () => Promise<number>;
      optimizeMemory?: (aggressive: boolean) => Promise<any>;
      cleanupMemory?: () => Promise<any>;
      setupPeriodicOptimization?: (interval?: number, threshold?: number) => Promise<() => void>;
      cleanupPeriodicOptimization?: () => void;
      settings?: MemorySettings;
    };

    // GPU 가속 정보
    __gpuInfo?: {
      isAccelerated: () => boolean;
      renderer: string;
      vendor: string;
      getGPUTier: () => { tier: number; type: string };
      isHardwareAccelerated: () => boolean;
    };

    // GPU 가속 유틸리티
    __gpuAccelerator?: {
      detectGPUAcceleration: () => Promise<boolean>;
      applyHardwareAcceleration: (element: HTMLElement, options?: any) => void;
      createOptimizedWebGLContext: (canvas: HTMLCanvasElement, preferWebGL2?: boolean) => WebGLRenderingContext | WebGL2RenderingContext | null;
      cleanupWebGLResources: (gl: WebGLRenderingContext | WebGL2RenderingContext, resources: any) => void;
      enableGPUAcceleration: () => void;
      getStatus: () => any;
      settings?: GpuSettings;
    };

    // 앱 복구 유틸리티
    __appRecovery?: {
      performEmergencyMemoryRecovery: () => Promise<boolean>;
      collectMemoryDiagnostics: () => any;
    };

    // 추적 중인 타이머 ID
    __timeoutIds?: number[];
    __intervalIds?: number[];
    __animationFrameIds?: number[];

    // 추적 중인 이벤트 리스너
    __eventListeners?: Record<string, Record<string, EventListener>>;

    // 메모리 캐시
    __memoryCache?: Map<any, any>;

    // 버퍼 캐시
    __bufferCache?: Record<string, any>;

    // 로드된 모듈 관리
    __loadedModules?: Map<string, { unload?: () => void }>;
    __imageCache?: Map<string, HTMLImageElement>;
    _dynamicModules?: Map<string, any>;

    // 메모리 관리자
    __memoryManager?: MemoryManager;

    // 메모리 성능 객체 확장
    performance: Performance & {
      memory?: {
        usedJSHeapSize: number;
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
      };
    };
  }

  // 서버 사이드 전역 캐싱 (API 라우트에서 사용)
  namespace NodeJS {
    interface Global {
      // 메모리 정보 캐시
      __memoryInfoCache?: Map<string, { data: any; timestamp: number }>;

      // GPU 정보 캐시
      __gpuInfoCache?: Map<string, { data: any; timestamp: number }>;
    }
  }
}

/**
 * Electron API 인터페이스
 */
export interface ElectronAPI {
  // 추적 시작/중지
  startTracking: () => void;
  stopTracking: () => void;

  // GC 이벤트
  onRequestGC: (callback: (data: { emergency: boolean }) => void) => () => void;
  rendererGCCompleted: (data: { timestamp: number; success: boolean; memoryInfo: any }) => void;
}

/**
 * 전역 타입 확장
 */

import { MemorySettings } from '../app/utils/memory-settings-manager';
import { GpuSettings } from '../app/utils/gpu-settings-bridge';
import { MemoryInfo } from '../app/utils/memory/types';

// 전역 컬렉션 타입
interface GlobalCollections {
  imageCache?: Map<string, HTMLImageElement>;
  dataCache?: Map<string, any>;
  bufferCache?: Map<string, ArrayBuffer>;
}

// DOM 요소 확장
interface HTMLElement {
  dataset: DOMStringMap & {
    keepLoaded?: string;
    originalSrc?: string;
    animate?: string;
    scroll?: string;
    chart?: string;
  };
}

// 메모리 관리자 설정 타입
interface MemoryManagerSettings {
  processingMode?: string;
  [key: string]: any;
}

// 메모리 관리자 타입
interface MemoryManager {
  settings: MemoryManagerSettings;
  [key: string]: any;
}

export { };
