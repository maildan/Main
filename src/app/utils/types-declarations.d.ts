/**
 * 추가 타입 선언
 *
 * 이 파일은 외부 라이브러리나 웹 API에 대한 타입 확장을 정의합니다.
 */

// Navigator.getBattery() API 정의
interface Navigator {
  getBattery?: () => Promise<BatteryManager>;
  connection?: any;
}

interface BatteryManager {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: ((this: BatteryManager, ev: Event) => any) | null;
  onchargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  ondischargingtimechange: ((this: BatteryManager, ev: Event) => any) | null;
  onlevelchange: ((this: BatteryManager, ev: Event) => any) | null;
}

/**
 * 글로벌 타입 확장
 */
interface Window {
  electronAPI?: {
    saveStats: (data: StatsData) => Promise<boolean>;
    loadStats: () => Promise<StatsData[] | null>;
    resetStats: () => Promise<boolean>;
    startTracking: () => Promise<boolean>;
    stopTracking: () => Promise<boolean>;
    getActiveWindow: () => Promise<ActiveWindowInfo | null>;
    saveSettings: (settings: UserSettings) => Promise<boolean>;
    loadSettings: () => Promise<UserSettings | null>;
    getCurrentBrowserInfo: () => Promise<BrowserInfo | null>;
    getDebugInfo: () => Promise<Record<string, unknown>>;
    setUpdateInterval: (interval: number) => Promise<boolean>;
    getSystemInfo: () => Promise<SystemInfo>;
  };

  // 가비지 컬렉션 관련
  gc?: () => void;

  // 전역 메모리 관리 상태
  __memoryOptimizer?: {
    suggestGarbageCollection: () => void;
    requestGC: (emergency?: boolean) => Promise<GCResult | null>;
    clearBrowserCaches: () => Promise<boolean>;
    clearStorageCaches: () => boolean;
    checkMemoryUsage: () => Record<string, number> | null;
    forceGC: () => boolean;
    // 추가 메서드들
    getMemoryInfo: () => any;
    optimizeMemory: (aggressive?: boolean) => Promise<any>;
    optimizeImageResources: () => Promise<any>;
    settings?: Record<string, any>;
  };

  // 앱 복구 기능
  __appRecovery?: {
    emergencyCleanup: () => void;
    diagnostics: () => Record<string, unknown>;
    optimizeMemory: (level: number) => boolean;
  };

  // 메모리 관리자
  __memoryManager?: {
    settings: {
      processingMode?: string;
      [key: string]: any;
    };
    memoryInfo?: any;
    [key: string]: any;
  };

  // 기타 시스템 속성
  __nativeBinding?: boolean;
  __gpuInfo?: any;
  __gpuAccelerator?: any;

  // 메모리 최적화 관련 캐시 속성들 (WindowWithResources와 일치)
  __objectUrls?: Map<string, string>;
  __widgetCache?: Record<string, any>;
  __styleCache?: Record<string, any>;
  __imageResizeCache?: Record<string, any>;
  __textureCache?: Map<string, string>;
  __objectCache?: Map<string, any>;
  __memoryCache?: Map<string, any>;
  __bufferCache?: Record<string, any>;
  _dynamicModules?: Map<string, any>;
}

/**
 * 시스템 정보 타입
 */
interface SystemInfo {
  platform: string;
  arch: string;
  version: string;
  cpuCount: number;
  memoryTotal: number;
  memoryFree: number;
  uptime: number;
}

/**
 * 활성 창 정보
 */
interface ActiveWindowInfo {
  title: string | null;
  execPath: string | null;
  pid: number;
  appName: string | null;
}

/**
 * 브라우저 정보
 */
interface BrowserInfo {
  name: string | null;
  isGoogleDocs: boolean;
  title: string | null;
}

/**
 * 사용자 설정
 */
interface UserSettings {
  enabledCategories?: {
    docs: boolean;
    office: boolean;
    coding: boolean;
    sns: boolean;
  };
  autoStartMonitoring?: boolean;
  resumeAfterIdle?: boolean;
  darkMode?: boolean;
  windowMode?: 'windowed' | 'fullscreen' | 'fullscreen-auto-hide';
  minimizeToTray?: boolean;
  showTrayNotifications?: boolean;
  reduceMemoryInBackground?: boolean;
  enableMiniView?: boolean;
  useHardwareAcceleration?: boolean;
  processingMode?: string;
  maxMemoryThreshold?: number;
}

/**
 * 통계 데이터
 */
interface StatsData {
  id?: number;
  timestamp: number;
  keyCount: number;
  typingTime: number;
  windowTitle: string | null;
  application: string | null;
  browser: string | null;
  appCategory: string | null;
  totalChars: number;
  wordCount: number;
  accuracy: number;
  wpm: number;
}

// 권한 오류 인터페이스
interface PermissionError {
  code: string;
  message: string;
  detail?: string;
}

// 권한 상태 인터페이스
interface PermissionStatus {
  code: string;
  granted: boolean;
  message?: string;
}

// ElectronAPI 인터페이스
interface ElectronAPI {
  onTypingStatsUpdate: (callback: (data: any) => void) => () => void;
  onPermissionError: (callback: (error: PermissionError) => void) => () => void;
  onPermissionStatus: (callback: (status: PermissionStatus) => void) => () => void;
  startTracking: () => void;
  stopTracking: () => void;
  saveStats: (content: any) => void;
  getCurrentBrowserInfo: () => Promise<any>;
  getDebugInfo: () => Promise<any>;
  onStatsSaved: (callback: (data: any) => void) => () => void;
  sendKeyboardEvent: (eventData: any) => Promise<any>;
  getHangulStatus: () => Promise<any>;
  testKeyboardInput: (key: string) => Promise<any>;
  testHangulInput: (text: string) => Promise<any>;
  decomposeHangul: (char: string) => string[];
  saveSettings: (settings: any) => Promise<any>;
  loadSettings: () => Promise<any>;
  setDarkMode: (enabled: boolean) => Promise<any>;
  setWindowMode: (mode: string) => Promise<any>;
  getWindowMode: () => Promise<string>;
  windowControl: (command: string) => void;
  checkAutoStart: (shouldAutoStart: boolean) => void;
  onAutoTrackingStarted: (callback: (data: any) => void) => () => void;
  onSwitchTab: (callback: (tabName: string) => void) => () => void;
  onOpenSaveStatsDialog: (callback: () => void) => () => void;
  requestStatsUpdate: () => void;
  onMiniViewStatsUpdate: (callback: (data: any) => void) => () => void;
  toggleMiniView: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
