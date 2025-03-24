import { useState, useEffect, useMemo } from 'react';

// 더미 일렉트론 API 생성 함수
const createDummyElectronAPI = (): ElectronAPI => ({
  onTypingStatsUpdate: () => () => {},
  onStatsSaved: () => () => {},
  startTracking: () => console.log('개발용 startTracking 호출'),
  stopTracking: () => console.log('개발용 stopTracking 호출'),
  saveStats: () => console.log('개발용 saveStats 호출'),
  getCurrentBrowserInfo: () => Promise.resolve({ name: null, isGoogleDocs: false, title: null }),
  getDebugInfo: () => Promise.resolve({
    isTracking: false,
    currentStats: {
      keyCount: 0,
      typingTime: 0,
      startTime: null,
      lastActiveTime: null,
      currentWindow: null,
      currentBrowser: null,
      totalChars: 0,
      totalWords: 0,
      totalCharsNoSpace: 0,
      pages: 0,
      accuracy: 100
    },
    platform: 'web',
    electronVersion: 'N/A',
    nodeVersion: 'N/A'
  }),
  saveSettings: (settings: SettingsState) => Promise.resolve({ success: true, settings }),
  loadSettings: () => Promise.resolve({
    enabledCategories: { docs: true, office: true, coding: true, sns: true },
    autoStartMonitoring: true,
    darkMode: false,
    windowMode: 'windowed',
    minimizeToTray: true,
    showTrayNotifications: true,
    reduceMemoryInBackground: true,
    enableMiniView: true,
    // 누락된 필수 속성 추가
    useHardwareAcceleration: false,
    processingMode: 'auto',
    maxMemoryThreshold: 100,
    // resumeAfterIdle 속성 추가
    resumeAfterIdle: true
  }),
  setDarkMode: () => Promise.resolve({ success: true }),
  setWindowMode: () => Promise.resolve({ success: true }),
  getWindowMode: () => Promise.resolve('windowed' as WindowModeType),
  windowControl: () => {},
  checkAutoStart: () => {},
  onAutoTrackingStarted: () => () => {},
  onSwitchTab: () => () => {},
  onOpenSaveStatsDialog: () => () => {},
  requestStatsUpdate: () => {},
  onMiniViewStatsUpdate: () => () => {},
  toggleMiniView: () => {},
  updateTraySettings: () => Promise.resolve({ success: true }),
  quitApp: () => console.log('개발용 quitApp 호출'),
  toggleWindow: () => console.log('개발용 toggleWindow 호출'),
  onBackgroundModeChange: () => () => {},
  onTrayCommand: () => () => {},
  restartApp: () => console.log('개발용 restartApp 호출'),
  // showRestartPrompt 메서드 추가
  showRestartPrompt: () => console.log('개발용 showRestartPrompt 호출'),
  // closeWindow 메서드 추가
  closeWindow: () => console.log('개발용 closeWindow 호출'),
  // getDarkMode 메서드 추가
  getDarkMode: () => Promise.resolve(false)
});

export function useElectronApi() {
  const [electronAPI, setElectronAPI] = useState<ElectronAPI | null>(null);

  // 더미 API - 개발 환경이나 일렉트론 API가 없을 때 사용
  const dummyApi = useMemo(() => createDummyElectronAPI(), []);

  // 실제 또는 더미 API - 항상 사용 가능한 API 제공
  const api = useMemo(() => electronAPI || dummyApi, [electronAPI, dummyApi]);

  // window 객체에서 electronAPI 가져오기 (클라이언트 사이드에서만 실행)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.electronAPI) {
        setElectronAPI(window.electronAPI);
      }
    }
  }, []);

  return { electronAPI, api };
}
