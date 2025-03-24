/**
 * 글로벌 타입 정의
 */

// 브라우저 환경의 전역 객체 확장
interface Window {
  // GPU 가속 관련
  __gpuInfo?: {
    isAccelerated: () => boolean;
    getGPUTier?: () => { tier: number, type: string };
    isHardwareAccelerated?: () => boolean;
    renderer?: string;
    vendor?: string;
  };
  
  // 메모리 최적화 관련
  __memoryOptimizer?: {
    getMemoryInfo?: () => any;
    getMemoryUsagePercentage?: () => number;
    optimizeMemory?: (aggressive: boolean) => Promise<any>;
    suggestGarbageCollection?: () => void;
    requestGC?: (emergency?: boolean) => Promise<any>;
    optimizeImageResources?: () => Promise<boolean>;
    determineOptimizationLevel?: (memoryInfo: any) => number;
    acquireFromPool?: (poolName: string) => any;
    releaseToPool?: (obj: any) => void;
    setupPeriodicOptimization?: (interval?: number, threshold?: number) => () => void;
    settings?: any;
    cleanupPeriodicOptimization?: () => void;
  };
  
  // 캐싱 및 성능 관련
  __cachedData?: Record<string, any>;
  __bufferCache?: Record<string, any>;
  __animationFrameIds?: number[];
  __intervalIds?: number[];
  __timeoutIds?: number[];
  __appRecovery?: any;
  __loadedModules?: Map<string, any>;
  __memoryCache?: Map<string, any>;
  __taskScheduler?: any;
  __store?: any;
  __errorBoundaries?: any[];
  __apiClient?: any;
  
  // Electron API 관련
  electronAPI?: {
    requestGC: () => Promise<void>;
    optimizeMemory: (aggressive: boolean) => Promise<void>;
    getMemoryUsage: () => Promise<any>;
    onRequestGC: (callback: (data: { emergency: boolean }) => void) => (() => void);
    rendererGCCompleted: (data: { timestamp: number, success: boolean, memoryInfo: any }) => void;
    requestAppRecovery?: () => Promise<void>;
    restartApp?: () => void;
    showRestartPrompt?: () => void;
  };
  
  // 기타 필요한 전역 속성들
  electron?: any;
  gc?: () => void;
}

// Navigator 타입 확장 (브라우저 호환성 이슈를 위한 타입 정의)
interface Navigator {
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
    addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
    removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  }>;
  deviceMemory?: number;
}
