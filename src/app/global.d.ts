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
  darkMode: boolean;
  windowMode: WindowModeType;
  // 트레이 관련 설정 추가
  minimizeToTray: boolean;
  showTrayNotifications: boolean;
  reduceMemoryInBackground: boolean;
  // 미니뷰 설정 추가
  enableMiniView: boolean;
  // GPU 가속 관련 설정을 필수 속성으로 변경
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
  }
}