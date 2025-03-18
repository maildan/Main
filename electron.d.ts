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
  windowControl: (command: 'minimize' | 'maximize' | 'close') => void;
  checkAutoStart: (shouldAutoStart: boolean) => void;
  onAutoTrackingStarted: (callback: (data: any) => void) => () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}