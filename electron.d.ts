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
  saveSettings: (settings: SettingsState) => void;
  loadSettings: () => Promise<SettingsState>;
  setDarkMode: (enabled: boolean) => void;
  setWindowMode: (mode: WindowModeType) => void;
  getWindowMode: () => Promise<WindowModeType>;
  windowControl: (
    command: 'minimize' | 'maximize' | 'close' | 'showHeader' | 'hideHeader' | 'setTitle',
    param?: string
  ) => void;
  checkAutoStart: (shouldAutoStart: boolean) => void;
  onAutoTrackingStarted: (callback: (data: any) => void) => () => void;
  
  // 트레이 관련 API 추가
  updateTraySettings: (settings: {
    minimizeToTray?: boolean;
    showTrayNotifications?: boolean;
    reduceMemoryInBackground?: boolean;
  }) => Promise<{
    success: boolean;
    settings?: TraySettings;
    error?: string;
  }>;
  
  quitApp: () => void;
  toggleWindow: () => void;
  onBackgroundModeChange: (callback: (isBackground: boolean) => void) => () => void;
  onTrayCommand: (callback: (command: 'start' | 'stop') => void) => () => void;

  // 누락된 메서드 추가
  onSwitchTab: (callback: (tab: string) => void) => () => void;
  onOpenSaveStatsDialog: (callback: () => void) => () => void;
  requestStatsUpdate: () => void;
  
  // 미니뷰 관련 메소드 추가
  onMiniViewStatsUpdate: (callback: (data: TypingStatsUpdate) => void) => () => void;
  toggleMiniView: () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}