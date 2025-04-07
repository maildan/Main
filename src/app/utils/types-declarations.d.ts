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

  // GC 함수 - 일부 브라우저에서 특수 플래그로 활성화됨
  gc?: () => void;

  // 메모리 최적화 관련 전역 객체
  __memoryOptimizer?: {
    suggestGarbageCollection?: () => void;
    requestGC?: (emergency?: boolean) => Promise<any>;
    clearBrowserCaches?: () => Promise<boolean>;
    clearStorageCaches?: () => boolean;
    checkMemoryUsage?: () => any;
    forceGC?: () => boolean;
    optimizeMemory?: (aggressive?: boolean) => void;
    cleanAllCaches?: () => boolean;
    cleanupPeriodicOptimization?: () => void;
    settings?: Record<string, any>;
    [key: string]: any;
  };

  // 이미지 리사이즈 캐시
  __imageResizeCache?: Map<string, string>;

  // 오브젝트 URL 저장소
  __objectUrls?: Map<string, string>;

  // GPU 가속 관련 전역 객체
  __gpuAccelerator?: {
    isGpuAccelerationEnabled?: () => Promise<boolean>;
    getGpuInformation?: () => Promise<any>;
    toggleGpuAcceleration?: (enable: boolean) => Promise<boolean>;
    enableGpuAcceleration?: () => Promise<boolean>;
    disableGpuAcceleration?: () => Promise<boolean>;
    evaluateGpuPerformance?: () => Promise<number>;
    executeGpuTask?: <T>(taskType: string, data: unknown) => Promise<T | null>;
    settings?: Record<string, any>; // settings 속성 추가
  };

  // 메모리 관리자
  __memoryManager?: {
    memoryInfo?: any;
    settings?: Record<string, any>;
    [key: string]: any;
  };

  // 이벤트 리스너 추적
  __eventListeners?: Record<string, Array<{ cleanup?: () => void }>>;
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
