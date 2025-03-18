'use client';

import { useState, useEffect, useCallback } from 'react';
import { TypingStats } from './components/TypingStats';
import { TypingMonitor } from './components/TypingMonitor';
import { TypingHistory } from './components/TypingHistory';
import { TypingChart } from './components/TypingChart';
import { AppFooter } from './components/AppFooter';
import { ThemeProvider } from './components/ThemeProvider';
import { Settings } from './components/Settings';
import { ToastProvider, useToast } from './components/ToastContext';
import { CustomHeader } from './components/CustomHeader';
import styles from './page.module.css';

// ElectronAPI, WindowModeType 등의 타입은 global.d.ts에서 가져옵니다

// 더미 API 생성 함수
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
  saveSettings: (settings) => Promise.resolve({ success: true, settings }),
  loadSettings: () => Promise.resolve({
    enabledCategories: { docs: true, office: true, coding: true, sns: true },
    autoStartMonitoring: true,
    darkMode: false,
    windowMode: 'windowed'
  }),
  setDarkMode: (enabled) => Promise.resolve({ success: true, enabled }),
  setWindowMode: (mode) => Promise.resolve({ success: true, mode }),
  getWindowMode: () => Promise.resolve('windowed'),
  windowControl: () => console.log('개발용 windowControl 호출'),
  checkAutoStart: () => console.log('개발용 checkAutoStart 호출'),
  onAutoTrackingStarted: () => () => {}
});

// 메인 컴포넌트
function HomeContent() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('monitor');
  const [isTracking, setIsTracking] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [currentStats, setCurrentStats] = useState({
    keyCount: 0,
    typingTime: 0,
    windowTitle: '',
    browserName: '',
    totalChars: 0,
    totalCharsNoSpace: 0,
    totalWords: 0,
    pages: 0,
    accuracy: 100
  });
  
  const [settings, setSettings] = useState<SettingsState>({
    enabledCategories: {
      docs: true,
      office: true,
      coding: true,
      sns: true
    },
    autoStartMonitoring: true,
    darkMode: false,
    windowMode: 'windowed'
  });
  
  const [darkMode, setDarkMode] = useState(false);
  const [electronAPI, setElectronAPI] = useState<ElectronAPI>(createDummyElectronAPI());
  const { showToast } = useToast();
  
  // 창 모드 상태 관리 (Zen Browser 스타일 구현)
  const [windowMode, setWindowMode] = useState<WindowModeType>('windowed');

  // 탭 전환 핸들러 (메모이제이션)
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // API 호출 최적화
  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/getLogs');
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
        
        if (debugMode) {
          console.log('로그 데이터 불러옴:', data.logs);
        }
      } else {
        console.error('로그 불러오기 실패:', data.error);
      }
    } catch (error) {
      console.error('로그 API 요청 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [debugMode]);

  // 데이터베이스 저장 함수
  const saveToDatabase = useCallback(async (record: RecordData) => {
    try {
      if (debugMode) {
        console.log('저장할 데이터:', record);
      }
      
      const response = await fetch('/api/saveLogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });

      const result = await response.json();
      
      if (response.ok) {
        if (debugMode) {
          console.log('저장 성공:', result);
        }
        await fetchLogs(); // 로그 다시 불러오기
      } else {
        console.error('저장 실패:', result.error);
      }
    } catch (error) {
      console.error('저장 API 요청 오류:', error);
    }
  }, [fetchLogs, debugMode]);

  // 모니터링 시작 핸들러 수정
  const handleStartTracking = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        if (window.electronAPI) {
          window.electronAPI.startTracking();
          setIsTracking(true);
          
          if (debugMode) {
            console.log('모니터링 시작됨');
          }
        } else {
          console.warn('electronAPI를 찾을 수 없습니다.');
          setIsTracking(true); // API 없어도 UI는 tracking 상태로 표시
        }
      }
    } catch (error) {
      console.error('startTracking 호출 오류:', error);
      setIsTracking(true);
    }
  }, [debugMode]);

  // 모니터링 중지 핸들러
  const handleStopTracking = useCallback(() => {
    try {
      electronAPI.stopTracking();
      setIsTracking(false);
      
      if (debugMode) {
        console.log('모니터링 중지됨');
      }
    } catch (error) {
      console.error('stopTracking 호출 오류:', error);
      setIsTracking(false);
    }
  }, [debugMode, electronAPI]);

  // 통계 저장 핸들러
  const handleSaveStats = useCallback((content: string) => {
    try {
      if (debugMode) {
        console.log('통계 저장 요청:', content);
      }
      
      electronAPI.saveStats(content);
      
      // 현재 통계 정보를 데이터베이스에 저장
      const recordData: RecordData = {
        content,
        keyCount: currentStats.keyCount,
        typingTime: currentStats.typingTime,
        timestamp: new Date().toISOString(),
        windowTitle: currentStats.windowTitle,
        browserName: currentStats.browserName,
        totalChars: currentStats.totalChars,
        totalWords: currentStats.totalWords,
        pages: currentStats.pages,
        accuracy: currentStats.accuracy
        // totalCharsNoSpace 속성 제거
      };
      
      saveToDatabase(recordData);
    } catch (error) {
      console.error('saveStats 호출 오류:', error);
      // API 호출 실패해도 데이터베이스에는 저장 시도
      const recordData: RecordData = {
        content,
        keyCount: currentStats.keyCount,
        typingTime: currentStats.typingTime,
        timestamp: new Date().toISOString(),
        windowTitle: currentStats.windowTitle,
        browserName: currentStats.browserName || 'Unknown',
        totalChars: currentStats.totalChars,
        totalWords: currentStats.totalWords,
        pages: currentStats.pages,
        accuracy: currentStats.accuracy
        // totalCharsNoSpace 속성 제거
      };
      saveToDatabase(recordData);
    }
  }, [currentStats, saveToDatabase, debugMode, electronAPI]);

  // 디버그 모드 토글
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev);
  }, []);

  // 앱 설정을 로컬 스토리지에 저장하는 함수
  const saveSettingsToLocalStorage = useCallback((settingsToSave: SettingsState) => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settingsToSave));
      console.log('설정이 로컬 스토리지에 저장됨');
    } catch (error) {
      console.error('설정 저장 중 오류:', error);
    }
  }, []);

  // 로컬 스토리지에서 설정 로드하는 함수 수정
  const loadSettingsFromLocalStorage = useCallback(() => {
    try {
      const savedSettings = localStorage.getItem('app-settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings) as SettingsState;
        // 누락된 필드가 있을 경우 기본값 추가
        const completeSettings: SettingsState = {
          enabledCategories: {
            docs: parsedSettings.enabledCategories?.docs ?? true,
            office: parsedSettings.enabledCategories?.office ?? true,
            coding: parsedSettings.enabledCategories?.coding ?? true,
            sns: parsedSettings.enabledCategories?.sns ?? true
          },
          autoStartMonitoring: parsedSettings.autoStartMonitoring ?? true,
          darkMode: parsedSettings.darkMode ?? false,
          windowMode: parsedSettings.windowMode ?? 'windowed'
        };
        
        setSettings(completeSettings);
        setDarkMode(completeSettings.darkMode);
        console.log('설정이 로컬 스토리지에서 로드됨');
        return completeSettings;
      }
    } catch (error) {
      console.error('설정 로드 중 오류:', error);
    }
    return null;
  }, []);

  // 설정 저장 핸들러 수정 - Promise 처리를 통해 일관성 유지
  const handleSaveSettings = useCallback(async (newSettings: SettingsState) => {
    setSettings(newSettings);
    saveSettingsToLocalStorage(newSettings);
    setDarkMode(newSettings.darkMode);
    
    // Electron API로 설정 저장
    try {
      if (!electronAPI) return;
      
      // saveSettings가 Promise를 반환하도록 타입을 맞춤
      const savePromise = electronAPI.saveSettings(newSettings);
      if (savePromise instanceof Promise) {
        const result = await savePromise;
        if (result.success) {
          showToast('설정이 저장되었습니다.', 'success');
        } else {
          showToast('설정 저장에 실패했습니다.', 'error');
        }
      }
      
      // 다크 모드 적용
      if (electronAPI.setDarkMode) {
        await electronAPI.setDarkMode(newSettings.darkMode);
      }
      
      // 창 모드 적용
      if (electronAPI.setWindowMode) {
        await electronAPI.setWindowMode(newSettings.windowMode);
      }
    } catch (error: any) { // 명시적 타입 지정
      console.error('Electron 설정 적용 오류:', error);
      showToast('설정 적용 중 오류가 발생했습니다.', 'error');
    }
  }, [saveSettingsToLocalStorage, electronAPI, showToast]);

  // 다크 모드 변경 핸들러
  const handleDarkModeChange = useCallback((enabled: boolean) => {
    setDarkMode(enabled);
    if (electronAPI) {
      electronAPI.setDarkMode(enabled);
    }
  }, [electronAPI]);

  // 창 모드 변경 핸들러 수정 - 오류 처리 추가 및 API 일관성 확보
  const handleWindowModeChange = useCallback(async (mode: WindowModeType) => {
    try {
      // Electron API가 있는지 확인 (window.electronAPI 또는 window.electron 둘 중 하나)
      const api = window.electronAPI;

      if (api && typeof api.setWindowMode === 'function') {
        // electronAPI가 있는 경우 직접 사용
        const result = await api.setWindowMode(mode);
        if (!result.success) {
          console.error(`창 모드 변경 실패: ${result.error || JSON.stringify(result)}`);
          showToast('창 모드 변경에 실패했습니다.', 'error');
        } else {
          // 성공적으로 변경됨
          setWindowMode(mode);
        }
      } else {
        // API가 없는 경우 로컬에서만 설정 변경
        console.warn('Electron API를 찾을 수 없습니다. 로컬에서만 창 모드를 변경합니다.');
        setWindowMode(mode);
      }
    } catch (error) {
      console.error('창 모드 변경 실패:', error);
      showToast('창 모드 변경 중 오류가 발생했습니다.', 'error');
    }
  }, [showToast]);

  // 초기 로그 데이터 및 설정 로딩
  useEffect(() => {
    fetchLogs();
    
    // 로컬 스토리지에서 설정 로드
    const savedSettings = loadSettingsFromLocalStorage();
    
    // 자동 시작 기능 처리
    if (savedSettings?.autoStartMonitoring) {
      try {
        handleStartTracking();
      } catch (error) {
        console.error('자동 시작 오류:', error);
      }
    }
  }, [fetchLogs, loadSettingsFromLocalStorage, handleStartTracking]);

  // 초기 설정 로드 후 자동 시작 확인
  useEffect(() => {
    const initApp = async () => {
      try {
        const settings = loadSettingsFromLocalStorage();
        
        if (settings?.autoStartMonitoring) {
          console.log('자동 시작 설정이 활성화되어 있음');
          try {
            // 함수 존재 여부 확인 후 호출
            const customWindow = window as typeof window;
            if (customWindow?.electronAPI && typeof customWindow.electronAPI.checkAutoStart === 'function') {
              customWindow.electronAPI.checkAutoStart(true);
            } else {
              console.warn('checkAutoStart 함수를 찾을 수 없습니다. 자동으로 모니터링을 시작합니다.');
            }
            handleStartTracking();
          } catch (error) {
            console.error('자동 시작 초기화 오류:', error);
            // 에러가 있어도 트래킹은 시작
            handleStartTracking();
          }
        }
      } catch (error) {
        console.error('앱 초기화 오류:', error);
      }
    };
    
    initApp();
  }, [loadSettingsFromLocalStorage, handleStartTracking, electronAPI]);

  // 창 모드 상태 이벤트 리스너
  useEffect(() => {
    const handleWindowModeStatus = (event: CustomEvent<{mode: WindowModeType, autoHideToolbar: boolean}>) => {
      setWindowMode(event.detail.mode);
    };
    
    window.addEventListener('window-mode-status' as any, handleWindowModeStatus);
    
    // 초기 창 모드 확인
    const checkWindowMode = async () => {
      if (electronAPI.getWindowMode) {
        try {
          const mode = await electronAPI.getWindowMode();
          setWindowMode(mode);
        } catch (err) {
          console.error('창 모드 확인 오류:', err);
        }
      }
    };
    
    checkWindowMode();
    
    return () => {
      window.removeEventListener('window-mode-status' as any, handleWindowModeStatus);
    };
  }, [electronAPI]);

  // Electron API 이벤트 구독
  useEffect(() => {
    // 클린업 함수 배열
    const cleanupFunctions: (() => void)[] = [];
    
    try {
      // 실시간 타이핑 통계 업데이트 이벤트
      const unsubscribeStats = electronAPI.onTypingStatsUpdate((data: TypingStatsUpdate) => {
        setCurrentStats(prev => ({
          ...prev,
          keyCount: data.keyCount,
          typingTime: data.typingTime,
          windowTitle: data.windowTitle || prev.windowTitle,
          browserName: data.browserName || prev.browserName,
          totalChars: data.totalChars || 0,
          totalCharsNoSpace: data.totalCharsNoSpace || 0,
          totalWords: data.totalWords || 0,
          pages: data.pages || 0,
          accuracy: data.accuracy || 100
        }));
        
        if (!isTracking) {
          setIsTracking(true);
        }
        
        if (debugMode) {
          console.log('통계 업데이트 수신:', data);
        }
      });
      
      cleanupFunctions.push(unsubscribeStats);
      
      // 통계 저장 완료 이벤트
      const unsubscribeSaved = electronAPI.onStatsSaved((data: StatsSaved) => {
        fetchLogs(); // 로그 목록 다시 불러오기
        
        if (debugMode) {
          console.log('통계 저장 완료:', data);
        }
      });
      
      cleanupFunctions.push(unsubscribeSaved);
      
      if (debugMode) {
        console.log('Electron API 이벤트 리스너 설정 완료');
      }
    } catch (error) {
      console.error('Electron API 이벤트 구독 오류:', error);
    }
    
    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('이벤트 리스너 정리 오류:', error);
        }
      });
    };
  }, [fetchLogs, isTracking, debugMode, electronAPI]);

  // 앱이 종료되거나 페이지가 새로고침될 때 설정 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveSettingsToLocalStorage(settings);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [settings, saveSettingsToLocalStorage]);

  // window 객체 안전하게 접근
  useEffect(() => {
    // 클라이언트 사이드에서만 실행
    try {
      if (typeof window !== 'undefined') {
        if (window.electronAPI) {
          console.log('electronAPI 발견됨:', Object.keys(window.electronAPI));
          // 기존 타입 충돌을 피하기 위해 as unknown as 사용
          setElectronAPI(window.electronAPI as unknown as ElectronAPI);
        } else {
          console.warn('window.electronAPI를 찾을 수 없습니다. 개발 환경용 더미 API를 사용합니다.');
          // 개발 환경을 위한 더미 객체 생성 (이미 초기 상태로 설정됨)
        }
      }
    } catch (err) {
      console.error('electronAPI 초기화 중 오류:', err);
    }
  }, []);

  // useEffect를 추가하여 전역 다크 모드 클래스를 설정
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  return (
    <div className={`${styles.container} ${darkMode ? 'dark-mode' : ''} ${windowMode === 'fullscreen-auto-hide' ? styles.zenMode : ''}`}>
      {/* 커스텀 헤더만 유지하고 불필요한 주석은 제거 */}
      <CustomHeader darkMode={darkMode} windowMode={windowMode} />
        
      <main className={styles.mainContent}>
        <div className={styles.appTabs}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'monitor' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('monitor')}
          >
            모니터링
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'history' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('history')}
          >
            히스토리
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'stats' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('stats')}
          >
            통계
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'chart' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('chart')}
          >
            차트
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'settings' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            설정
          </button>
          
          {/* 디버그 모드 토글 버튼 */}
          <button 
            className={`${styles.tabButton} ${styles.debugButton} ${debugMode ? styles.debugActive : ''}`}
            onClick={toggleDebugMode}
            title="디버그 모드 토글"
          >
            🐞
          </button>
        </div>
        
        {activeTab === 'monitor' && (
          <TypingMonitor 
            stats={currentStats}
            isTracking={isTracking}
            onStartTracking={handleStartTracking}
            onStopTracking={handleStopTracking}
            onSaveStats={handleSaveStats}
          />
        )}
        
        {activeTab === 'history' && (
          <TypingHistory 
            logs={logs}
            isLoading={isLoading}
          />
        )}
        
        {activeTab === 'stats' && (
          <TypingStats 
            logs={logs}
          />
        )}
        
        {activeTab === 'chart' && (
          <TypingChart 
            logs={logs}
          />
        )}

        {activeTab === 'settings' && (
          <Settings 
            onSave={handleSaveSettings}
            initialSettings={settings}
            darkMode={darkMode}
            onDarkModeChange={handleDarkModeChange}
            onWindowModeChange={handleWindowModeChange}
          />
        )}
      </main>
      
      {/* 디버그 패널을 하단으로 이동 */}
      {debugMode && (
        <div className={styles.debugPanelBottom}>
          <h3>디버그 정보</h3>
          <div className={styles.debugInfo}>
            <div><strong>isTracking:</strong> {isTracking ? 'true' : 'false'}</div>
            <div><strong>Logs:</strong> {logs.length}개</div>
            <div><strong>Current keyCount:</strong> {currentStats.keyCount}</div>
            <div><strong>Browser:</strong> {currentStats.browserName || 'N/A'}</div>
            <div><strong>Window:</strong> {currentStats.windowTitle || 'N/A'}</div>
            <div><strong>Window Mode:</strong> {windowMode}</div>
          </div>
        </div>
      )}
      
      <AppFooter />
    </div>
  );
}

// 메인 페이지 컴포넌트
export default function Home() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <HomeContent />
      </ToastProvider>
    </ThemeProvider>
  );
}