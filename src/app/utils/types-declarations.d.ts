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
    requestGC: (emergency?: boolean) => Promise<any>;
    clearBrowserCaches: () => Promise<boolean>;
    clearStorageCaches: () => boolean;
    checkMemoryUsage: () => Record<string, number> | null;
    forceGC: () => boolean;
    getMemoryUsagePercentage: () => Promise<number>;
    getMemoryInfo: () => Promise<Partial<MemoryInfo>>;
    optimizeMemory: (aggressive?: boolean) => Promise<any>;
  };
  
  // 이미지 캐시 저장소
  __imageResizeCache?: Map<string, any>;
  
  // 오브젝트 URL 저장소
  __objectUrls?: Map<string, string>;
  
  // 스타일 캐시 저장소
  __styleCache?: Record<string, any> | Map<string, any>;
  
  // 메모리 캐시 저장소
  __memoryCache?: Map<string, any>;
  
  // 위젯 캐시 저장소
  __widgetCache?: Map<string, any>;
  
  // 애니메이션 프레임 ID 저장소
  __animationFrameIds?: number[];
  
  // 인터벌 ID 저장소
  __intervalIds?: number[];
  
  // 타임아웃 ID 저장소
  __timeoutIds?: number[];
  
  // 동적 모듈 저장소
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
