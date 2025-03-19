/// <reference path="./src/app/global.d.ts" />

type WindowModeType = 'windowed' | 'fullscreen' | 'fullscreen-auto-hide';

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
  saveSettings: (settings: SettingsState) => Promise<any>;
  loadSettings: () => Promise<SettingsState>;
  setDarkMode: (enabled: boolean) => Promise<any>;
  setWindowMode: (mode: WindowModeType) => Promise<any>;
  getWindowMode: () => Promise<WindowModeType>;
  windowControl: (command: 'minimize' | 'maximize' | 'close') => void;
  checkAutoStart: (shouldAutoStart: boolean) => void;
  onAutoTrackingStarted: (callback: (data: any) => void) => () => void;
  onShowRestartLoading?: (callback: (data: RestartLoadingData) => void) => () => void;
  // 메모리 관련 API 추가
  getMemoryUsage?: () => Promise<MemoryInfo>;
  requestGC?: () => Promise<any>;
  optimizeMemory?: (emergency?: boolean) => Promise<any>;
  rendererGCCompleted?: (data: any) => void;
  onRequestGC?: (callback: (data: {emergency: boolean}) => void) => () => void;
  // 재시작 관련 API 추가
  restartApp: () => void;
  showRestartPrompt: () => void;
}

// 통합된 MemoryInfo 인터페이스 - 각 속성에 설명 추가
interface MemoryInfo {
  // 공통 필드
  timestamp: number;        // 메모리 정보 수집 시간
  
  // 프로세스 메모리 정보 필드
  heapUsed: number;         // 사용 중인 힙 메모리 (바이트)
  heapTotal: number;        // 총 할당된 힙 메모리 (바이트)
  heapLimit?: number;       // 힙 메모리 한도 (바이트)
  heapUsedMB: number;       // 사용 중인 힙 메모리 (MB)
  percentUsed: number;      // 메모리 사용률 (%)
  
  // 추가 필드
  unavailable?: boolean;    // 메모리 정보 사용 불가 여부
  error?: string;           // 오류 메시지 (있을 경우)
  
  // Chrome Performance API 확장 필드
  totalJSHeapSize?: number; // 총 JS 힙 크기 (바이트)
  usedJSHeapSize?: number;  // 사용 중인 JS 힙 크기 (바이트)
  jsHeapSizeLimit?: number; // JS 힙 크기 제한 (바이트)
}

// Window 인터페이스 확장
interface Window {
  electronAPI?: ElectronAPI;
  electron?: ElectronAPI;
  gc?: () => void;
}

// Performance 인터페이스 확장
interface Performance {
  memory?: {
    totalJSHeapSize: number;
    usedJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}