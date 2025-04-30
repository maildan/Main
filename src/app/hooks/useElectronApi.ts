import { useState, useEffect } from 'react';
import { ElectronAPI } from '../types/electron';

// 더미 일렉트론 API 생성 함수
const createDummyElectronAPI = (): ElectronAPI => ({
  windowControl: (action) => console.log(`개발용 windowControl 호출: ${action}`),
  onTypingStatsUpdate: (_callback) => {
    console.log('개발용 onTypingStatsUpdate 리스너 등록');
    return () => console.log('개발용 onTypingStatsUpdate 리스너 제거');
  },
  onStatsSaved: (_callback) => {
    console.log('개발용 onStatsSaved 리스너 등록');
    return () => console.log('개발용 onStatsSaved 리스너 제거');
  },
  startTracking: () => console.log('개발용 startTracking 호출'),
  stopTracking: () => console.log('개발용 stopTracking 호출'),
  saveStats: (data?) => {
    console.log('개발용 saveStats 호출:', data);
    return Promise.resolve(true);
  },
  loadSettings: () => {
    console.log('개발용 loadSettings 호출');
    return { darkMode: false, windowMode: 'normal' };
  },
  saveSettings: (settings) => {
    console.log('개발용 saveSettings 호출:', settings);
    return true;
  },
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
  setDarkMode: () => Promise.resolve({ success: true }),
  setWindowMode: () => Promise.resolve({ success: true }),
  getWindowMode: () => Promise.resolve('windowed' as WindowModeType),
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
  showRestartPrompt: () => console.log('개발용 showRestartPrompt 호출'),
  closeWindow: () => console.log('개발용 closeWindow 호출'),
  getDarkMode: () => Promise.resolve(false)
});

export function useElectronApi() {
  const [api, setApi] = useState<ElectronAPI | null>(null);

  useEffect(() => {
    // 브라우저 환경 확인
    if (typeof window !== 'undefined') {
      // window 객체에 electronAPI가 있는지 확인
      const electronAPI = (window as any).electronAPI as ElectronAPI | undefined;
      
      if (electronAPI) {
        // Electron 환경에서 실행 중
        setApi(electronAPI);
      } else {
        // 브라우저 환경에서 실행 중이므로 더미 API 생성
        setApi(createDummyElectronAPI());
      }
    }
  }, []);

  return { 
    electronAPI: api,
    api, // 호환성을 위해 alias로도 제공
    isElectron: typeof (window as any).electronAPI !== 'undefined'
  };
}
