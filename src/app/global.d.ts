interface TypingStatsUpdate {
  keyCount: number;
  typingTime: number;
  windowTitle?: string;
  browserName?: string;
  totalChars?: number;
  totalCharsNoSpace?: number;
  totalWords?: number;
  pages?: number;
  accuracy?: number;
  isTracking?: boolean; // isTracking 필드 추가
}

interface RecordData {
  content: string;
  keyCount: number;
  typingTime: number;
  timestamp: string;
  windowTitle?: string;
  browserName?: string;
  totalChars?: number;
  // totalCharsNoSpace 속성은 제거
  totalWords?: number;
  pages?: number;
  accuracy?: number;
}

interface StatsSaved extends RecordData {
  success: boolean;
}

interface DebugInfo {
  isTracking: boolean;
  currentStats: {
    keyCount: number;
    typingTime: number;
    startTime: number | null;
    lastActiveTime: number | null;
    currentWindow: string | null;
    currentBrowser: string | null;
    totalChars: number;
    totalWords: number;
    totalCharsNoSpace: number;
    pages: number;
    accuracy: number;
  };
  platform: string;
  electronVersion: string;
  nodeVersion: string;
}

type WindowModeType = 'windowed' | 'fullscreen' | 'fullscreen-auto-hide';

type ProcessingModeType = 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive';

interface TraySettings {
  minimizeToTray: boolean;
  showTrayNotifications: boolean;
  reduceMemoryInBackground: boolean;
}

interface SettingsState {
  enabledCategories: {
    docs: boolean;
    office: boolean;
    coding: boolean;
    sns: boolean;
  };
  autoStartMonitoring: boolean;
  resumeAfterIdle: boolean; // 옵셔널 제거, 필수 속성으로 변경
  idleTimeout?: number; // 유휴 상태 판단 시간 (초) (옵셔널)
  darkMode: boolean;
  windowMode: WindowModeType;
  // 트레이 관련 설정
  minimizeToTray: boolean;
  showTrayNotifications: boolean;
  reduceMemoryInBackground: boolean;
  // 미니뷰 설정
  enableMiniView: boolean;
  // GPU 가속 관련 설정
  useHardwareAcceleration: boolean;
  processingMode: ProcessingModeType;
  maxMemoryThreshold: number;
}

interface ElectronAPI {
  onTypingStatsUpdate: (callback: (data: TypingStatsUpdate) => void) => () => void;
  onStatsSaved: (callback: (data: StatsSaved) => void) => () => void;
  startTracking: () => void;
  stopTracking: () => void;
  saveStats: (content: string) => void;
  getCurrentBrowserInfo: () => Promise<{
    name: string | null;
    isGoogleDocs: boolean;
    title: string | null;
  }>;
  getDebugInfo: () => Promise<DebugInfo>;
  // Promise 반환 타입으로 변경
  saveSettings: (settings: SettingsState) => Promise<any>;
  loadSettings: () => Promise<SettingsState>;
  setDarkMode: (enabled: boolean) => Promise<any>;
  setWindowMode: (mode: WindowModeType) => Promise<any>;
  getWindowMode: () => Promise<WindowModeType>;
  windowControl: (
    command: 'minimize' | 'maximize' | 'close' | 'showHeader' | 'hideHeader' | 'setTitle',
    param?: string
  ) => void;
  checkAutoStart: (shouldAutoStart: boolean) => void;
  onAutoTrackingStarted: (callback: (data: any) => void) => () => void;
  
  // 메모리 관련 메서드
  getMemoryUsage?: () => Promise<MemoryInfo>;
  optimizeMemory?: (emergency?: boolean) => Promise<any>;
  requestGC?: () => Promise<any>;
  rendererGCCompleted?: (data: any) => void;
  onRequestGC?: (callback: (data: {emergency: boolean}) => void) => () => void;
  
  // 탭 전환 및 UI 상호작용 관련 메서드
  onSwitchTab?: (callback: (tab: string) => void) => () => void;
  onOpenSaveStatsDialog?: (callback: () => void) => () => void;
  requestStatsUpdate?: () => void;
  onMiniViewStatsUpdate?: (callback: (data: any) => void) => () => void;
  toggleMiniView?: () => void;
  
  // 트레이 관련 메서드
  updateTraySettings?: (settings: TraySettings) => Promise<any>;
  quitApp?: () => void;
  toggleWindow?: () => void;
  onBackgroundModeChange?: (callback: (isBackground: boolean) => void) => () => void;
  onTrayCommand?: (callback: (command: string) => void) => () => void;
  
  // 재시작 관련 API
  restartApp: () => void;
  showRestartPrompt: () => void;
  closeWindow: () => void;
  getDarkMode: () => Promise<boolean>;
  
  /**
   * 재시작 로딩 상태 이벤트 수신
   * @param callback 재시작 로딩 상태 변경 핸들러
   */
  onShowRestartLoading?: (callback: (data: RestartLoadingData) => void) => () => void;
}

// RestartLoadingData 인터페이스 추가
interface RestartLoadingData {
  message?: string;
  timeout?: number;
}

interface LogEntry {
  id: number;
  content: string;
  key_count: number;
  typing_time: number;
  timestamp: string;
  created_at: string;
  window_title?: string;
  browser_name?: string;
  total_chars?: number;
  total_words?: number;
  pages?: number;
  accuracy?: number;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    electron?: ElectronAPI; // 명시적으로 추가
    
    // GPU 관련 전역 객체
    __gpuInfo?: {
      renderer?: string;
      vendor?: string;
      isAccelerated: () => boolean;
      getGPUTier?: () => { tier: number; type: string; };
      isHardwareAccelerated?: () => boolean;
    };
    
    // 메모리 최적화 관련 전역 객체
    __memoryOptimizer?: {
      [key: string]: any;
      getMemoryInfo?: () => any;
      getMemoryUsagePercentage?: () => number;
      optimizeMemory?: (aggressive: boolean) => Promise<any>;
      suggestGarbageCollection?: () => void;
      requestGC?: (emergency?: boolean) => Promise<any>;
      determineOptimizationLevel?: () => number;
      settings?: any;
      cleanupPeriodicOptimization?: () => void;
    };
    
    // GPU 가속화 관련 전역 객체
    __gpuAccelerator?: {
      [key: string]: any;
    };
  
    // 리소스 최적화를 위한 전역 캐시 객체들
    __objectUrls?: Map<string, string>;
    __widgetCache?: Map<string, any>;
    __styleCache?: Map<string, any>;
    __imageResizeCache?: Map<string, HTMLImageElement>;
    
    // 동적 모듈 관리
    _dynamicModules?: Map<string, any>;
  }
}

/**
 * 전역 타입 정의 파일
 * Window 객체와 전역 인터페이스 확장
 */

import { MemoryInfo, GCResult, OptimizationResult } from '@/types/native-module';

// Window 인터페이스 확장
interface Window {
  // 기존 API 확장
  electronAPI?: ElectronAPI;
  restartAPI?: RestartAPI;
  
  // 네이티브 모듈 관련
  __nativeBinding?: boolean;
  __memoryOptimizer?: {
    getMemoryInfo?: () => any;
    getMemoryUsagePercentage?: () => number;
    optimizeMemory?: (aggressive: boolean) => Promise<any>;
    suggestGarbageCollection?: () => void;
    requestGC?: (emergency?: boolean) => Promise<any>;
    setupPeriodicOptimization?: (interval?: number, threshold?: number) => void;
    cleanupPeriodicOptimization?: () => void;
  };
  
  // GPU 관련
  __gpuInfo?: {
    isAccelerated: () => boolean;
    renderer: string;
    vendor: string;
    getGPUTier?: () => { tier: number; type: string; };
    isHardwareAccelerated?: () => boolean;
  };
  
  // 캐시 관련
  __objectUrls?: Map<string, string>;
  __widgetCache?: Map<string, any>;
  __styleCache?: Record<string, any>;
  __imageResizeCache?: Record<string, any>;
  
  // GC 관련
  gc?: () => void;
}

// 특수 캐시 확장 Window 인터페이스
interface WindowWithCache extends Window {
  __cachedData?: Record<string, any>;
  __bufferCache?: Record<string, ArrayBuffer>;
  __memoryCache?: Map<string, any>;
  __animationFrameIds?: number[];
  __intervalIds?: number[];
  __timeoutIds?: number[];
}

// 동적 모듈 인터페이스
interface DynamicModule {
  lastUsed: number;
  loaded: boolean;
  unload: () => void;
}

// 이벤트 리스너 데이터 인터페이스
interface EventListenerData {
  handler: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
}

declare global {
  // 전역 함수 정의
  function normalizeMemoryInfo(info: any): MemoryInfo;
  
  // 네임스페이스 정의
  namespace NodeJS {
    interface Global {
      gc?: () => void;
    }
  }
}

// 모듈 선언
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}