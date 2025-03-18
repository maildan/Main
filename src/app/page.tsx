'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TypingStats } from './components/TypingStats';
import { TypingMonitor } from './components/TypingMonitor';
import { TypingHistory } from './components/TypingHistory';
import { TypingChart } from './components/TypingChart';
import { AppFooter } from './components/AppFooter';
import { AppHeader } from './components/AppHeader'; // AppHeader 컴포넌트 import 추가
import { ThemeProvider } from './components/ThemeProvider';
import { Settings } from './components/Settings';
import { ToastProvider, useToast } from './components/ToastContext';
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
  saveSettings: (settings: SettingsState) => Promise.resolve({ success: true, settings }),
  loadSettings: () => Promise.resolve({
    enabledCategories: { docs: true, office: true, coding: true, sns: true },
    autoStartMonitoring: true,
    darkMode: false,
    windowMode: 'windowed',
    minimizeToTray: true,
    showTrayNotifications: true,
    reduceMemoryInBackground: true,
    enableMiniView: true
  }),
  setDarkMode: (enabled: boolean) => Promise.resolve({ success: true, enabled }),
  setWindowMode: (mode: WindowModeType) => Promise.resolve({ success: true, mode }),
  getWindowMode: () => Promise.resolve('windowed' as WindowModeType),
  windowControl: () => console.log('개발용 windowControl 호출'),
  checkAutoStart: () => console.log('개발용 checkAutoStart 호출'),
  onAutoTrackingStarted: () => () => {},
  // 트레이 관련 누락된 메서드 추가
  updateTraySettings: (settings: { minimizeToTray?: boolean; showTrayNotifications?: boolean; reduceMemoryInBackground?: boolean }) => Promise.resolve({ 
    success: true, 
    settings: {
      minimizeToTray: settings.minimizeToTray ?? true,
      showTrayNotifications: settings.showTrayNotifications ?? true,
      reduceMemoryInBackground: settings.reduceMemoryInBackground ?? true
    }
  }),
  quitApp: () => console.log('개발용 quitApp 호출'),
  toggleWindow: () => console.log('개발용 toggleWindow 호출'),
  onBackgroundModeChange: () => () => {},
  onTrayCommand: () => () => {},
  // 새로 추가된 메서드들
  onSwitchTab: (callback: (tab: string) => void) => {
    console.log('개발용 onSwitchTab 등록');
    return () => console.log('개발용 onSwitchTab 해제');
  },
  onOpenSaveStatsDialog: (callback: () => void) => {
    console.log('개발용 onOpenSaveStatsDialog 등록');
    return () => console.log('개발용 onOpenSaveStatsDialog 해제');
  },
  requestStatsUpdate: () => console.log('개발용 requestStatsUpdate 호출'),
  // 누락된 메서드 추가
  onMiniViewStatsUpdate: (callback: (data: TypingStatsUpdate) => void) => {
    console.log('개발용 onMiniViewStatsUpdate 등록');
    return () => console.log('개발용 onMiniViewStatsUpdate 해제');
  },
  toggleMiniView: () => console.log('개발용 toggleMiniView 호출')
});

// HomeContent 컴포넌트를 메모이제이션
const HomeContent = React.memo(function HomeContent() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('monitor');
  const [isTracking, setIsTracking] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  
  // 메모리 관리를 위한 ref 사용
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const eventsCleanupRef = useRef<(() => void)[]>([]);
  
  // 현재 통계를 useRef로 관리하여 불필요한 렌더링 방지
  const currentStatsRef = useRef({
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
  
  // 화면에 표시할 통계만 useState로 관리
  const [displayStats, setDisplayStats] = useState(currentStatsRef.current);
  
  // 표시 통계 업데이트 인터벌 설정 (불필요한 렌더링 방지)
  useEffect(() => {
    // 화면 업데이트는 1초에 한 번만 수행
    const updateInterval = setInterval(() => {
      setDisplayStats({...currentStatsRef.current});
    }, 1000);
    
    intervalsRef.current.push(updateInterval);
    
    return () => {
      clearInterval(updateInterval);
    };
  }, []);

  // 설정 관련 상태 - 최적화를 위해 분리
  const [settings, setSettings] = useState<SettingsState>({
    enabledCategories: {
      docs: true,
      office: true,
      coding: true,
      sns: true
    },
    autoStartMonitoring: true,
    darkMode: false,
    windowMode: 'windowed',
    minimizeToTray: true,
    showTrayNotifications: true,
    reduceMemoryInBackground: true,
    enableMiniView: true // 미니뷰 설정 추가
  });
  
  const [darkMode, setDarkMode] = useState(false);
  const [electronAPI, setElectronAPI] = useState<ElectronAPI | null>(null);
  const { showToast } = useToast();
  
  // 창 모드 상태 관리
  const [windowMode, setWindowMode] = useState<WindowModeType>('windowed');

  // 더미 API 생성 함수를 컴포넌트 외부로 이동
  const createDummyAPI = useMemo(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return window.electronAPI;
    }
    
    // 더미 API 반환 - 누락된 메서드 추가
    return {
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
        reduceMemoryInBackground: true
      }),
      setDarkMode: (enabled: boolean) => Promise.resolve({ success: true, enabled }),
      setWindowMode: (mode: WindowModeType) => Promise.resolve({ success: true, mode }),
      getWindowMode: () => Promise.resolve('windowed'),
      windowControl: () => console.log('개발용 windowControl 호출'),
      checkAutoStart: () => console.log('개발용 checkAutoStart 호출'),
      onAutoTrackingStarted: () => () => {},
      updateTraySettings: (settings: { minimizeToTray?: boolean; showTrayNotifications?: boolean; reduceMemoryInBackground?: boolean }) => Promise.resolve({ 
        success: true, 
        settings: {
          minimizeToTray: settings.minimizeToTray ?? true,
          showTrayNotifications: settings.showTrayNotifications ?? true,
          reduceMemoryInBackground: settings.reduceMemoryInBackground ?? true
        }
      }),
      quitApp: () => console.log('개발용 quitApp 호출'),
      toggleWindow: () => console.log('개발용 toggleWindow 호출'),
      onBackgroundModeChange: () => () => {},
      onTrayCommand: () => () => {},
      // 누락된 메서드들 추가
      onSwitchTab: (callback: (tab: string) => void) => {
        console.log('개발용 onSwitchTab 등록');
        return () => console.log('개발용 onSwitchTab 해제');
      },
      onOpenSaveStatsDialog: (callback: () => void) => {
        console.log('개발용 onOpenSaveStatsDialog 등록');
        return () => console.log('개발용 onOpenSaveStatsDialog 해제');
      },
      requestStatsUpdate: () => console.log('개발용 requestStatsUpdate 호출'),
      // 미니뷰 관련 메서드 추가
      onMiniViewStatsUpdate: (callback: (data: TypingStatsUpdate) => void) => {
        console.log('개발용 onMiniViewStatsUpdate 등록');
        return () => console.log('개발용 onMiniViewStatsUpdate 해제');
      },
      toggleMiniView: () => console.log('개발용 toggleMiniView 호출')
    };
  }, []);

  // 탭 전환 핸들러
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // API 호출 최적화
  const fetchLogs = useCallback(async () => {
    if (activeTab !== 'history' && activeTab !== 'stats' && activeTab !== 'chart') {
      // 필요한 탭에서만 로그를 가져오도록 최적화
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/getLogs');
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
        
        if (debugMode) {
          console.log('로그 데이터 불러옴:', data.logs.length);
        }
      } else {
        console.error('로그 불러오기 실패:', data.error);
      }
    } catch (error) {
      console.error('로그 API 요청 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [debugMode, activeTab]);

  // 데이터베이스 저장 함수 최적화
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
      // null 체크 추가
      if (electronAPI) {
        electronAPI.stopTracking();
        setIsTracking(false);
        
        if (debugMode) {
          console.log('모니터링 중지됨');
        }
      } else {
        console.warn('electronAPI가 없습니다');
        setIsTracking(false);
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
      
      // null 체크 추가
      if (electronAPI) {
        electronAPI.saveStats(content);
      }
      
      // 현재 통계 정보를 데이터베이스에 저장
      const recordData: RecordData = {
        content,
        keyCount: currentStatsRef.current.keyCount,
        typingTime: currentStatsRef.current.typingTime,
        timestamp: new Date().toISOString(),
        windowTitle: currentStatsRef.current.windowTitle,
        browserName: currentStatsRef.current.browserName,
        totalChars: currentStatsRef.current.totalChars,
        totalWords: currentStatsRef.current.totalWords,
        pages: currentStatsRef.current.pages,
        accuracy: currentStatsRef.current.accuracy
      };
      
      saveToDatabase(recordData);
    } catch (error) {
      console.error('saveStats 호출 오류:', error);
      // API 호출 실패해도 데이터베이스에는 저장 시도
      const recordData: RecordData = {
        content,
        keyCount: currentStatsRef.current.keyCount,
        typingTime: currentStatsRef.current.typingTime,
        timestamp: new Date().toISOString(),
        windowTitle: currentStatsRef.current.windowTitle,
        browserName: currentStatsRef.current.browserName || 'Unknown',
        totalChars: currentStatsRef.current.totalChars,
        totalWords: currentStatsRef.current.totalWords,
        pages: currentStatsRef.current.pages,
        accuracy: currentStatsRef.current.accuracy
      };
      saveToDatabase(recordData);
    }
  }, [saveToDatabase, debugMode, electronAPI]);

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
          windowMode: parsedSettings.windowMode ?? 'windowed',
          minimizeToTray: parsedSettings.minimizeToTray ?? true,
          showTrayNotifications: parsedSettings.showTrayNotifications ?? true,
          reduceMemoryInBackground: parsedSettings.reduceMemoryInBackground ?? true,
          enableMiniView: parsedSettings.enableMiniView ?? true // 미니뷰 기본값 추가
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
      // null 체크 추가
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

  // 다크 모드 클래스 관리 함수 추가
  const applyDarkModeToAllElements = useCallback((isDark: boolean) => {
    if (isDark) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
      // 주요 컨테이너에도 클래스 추가
      document.querySelectorAll('.tab-content, .chart-container, .history-table').forEach(el => {
        el.classList.add('dark-mode');
      });
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
      // 주요 컨테이너에서도 클래스 제거
      document.querySelectorAll('.tab-content, .chart-container, .history-table').forEach(el => {
        el.classList.remove('dark-mode');
      });
    }
  }, []);

  // useEffect를 수정하여 전역 다크 모드 클래스를 설정
  useEffect(() => {
    applyDarkModeToAllElements(darkMode);
    
    // 다크 모드 변경 이벤트 발생
    const darkModeEvent = new CustomEvent('darkmode-changed', { detail: { darkMode } });
    window.dispatchEvent(darkModeEvent);
  }, [darkMode, applyDarkModeToAllElements]);

  // 창 모드 변경 핸들러 수정 - 오류 처리 추가 및 API 일관성 확보
// 다른 부분에서도 null 체크 추가
// 예: handleWindowModeChange 함수
const handleWindowModeChange = useCallback(async (mode: WindowModeType) => {
  try {
    setWindowMode(mode); // UI 즉시 업데이트
    
    // electronAPI가 null이 아니고 setWindowMode 메서드가 있는지 확인
    if (electronAPI && typeof electronAPI.setWindowMode === 'function') {
      // API 호출에 시간제한 추가
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('창 모드 변경 시간 초과')), 3000);
      });
      
      const result = await Promise.race([
        electronAPI.setWindowMode(mode),
        timeoutPromise
      ]) as {success: boolean, error?: string};
      
      if (!result.success) {
        console.error(`창 모드 변경 실패: ${result.error || '알 수 없는 오류'}`);
        showToast('창 모드 변경에 실패했습니다.', 'error');
      }
    } else {
      console.warn('setWindowMode API를 사용할 수 없습니다. UI만 업데이트됩니다.');
    }
  } catch (error) {
    console.error('창 모드 변경 중 오류:', error);
    showToast('창 모드 변경 중 오류가 발생했습니다.', 'error');
  }
}, [electronAPI, showToast]);

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
// 창 모드 상태 이벤트 리스너 부분 수정
useEffect(() => {
  const handleWindowModeStatus = (event: CustomEvent<{mode: WindowModeType, autoHideToolbar: boolean}>) => {
    setWindowMode(event.detail.mode);
  };
  
  window.addEventListener('window-mode-status' as any, handleWindowModeStatus);
  
  // 초기 창 모드 확인
  const checkWindowMode = async () => {
    // electronAPI가 null이 아닌지 확인
    if (electronAPI && electronAPI.getWindowMode) {
      try {
        const mode = await electronAPI.getWindowMode();
        setWindowMode(mode);
      } catch (err) {
        console.error('창 모드 확인 오류:', err);
      }
    } else {
      console.log('getWindowMode API를 사용할 수 없습니다. 기본 창 모드를 사용합니다.');
    }
  };
  
  // electronAPI 존재 시에만 창 모드 확인
  if (electronAPI) {
    checkWindowMode();
  }
  
  return () => {
    window.removeEventListener('window-mode-status' as any, handleWindowModeStatus);
  };
}, [electronAPI]);

  // 모니터링 이벤트 처리 최적화
  useEffect(() => {
    const api = electronAPI || createDummyAPI;
    
    // 클린업 함수 배열
    const cleanupFunctions: (() => void)[] = [];
    
    try {
      // 실시간 타이핑 통계 업데이트 이벤트
      const unsubscribeStats = api.onTypingStatsUpdate((data: TypingStatsUpdate) => {
        // ref로 상태 관리하여 불필요한 렌더링 방지
        currentStatsRef.current = {
          ...currentStatsRef.current,
          keyCount: data.keyCount,
          typingTime: data.typingTime,
          windowTitle: data.windowTitle || currentStatsRef.current.windowTitle,
          browserName: data.browserName || currentStatsRef.current.browserName,
          totalChars: data.totalChars || 0,
          totalCharsNoSpace: data.totalCharsNoSpace || 0,
          totalWords: data.totalWords || 0,
          pages: data.pages || 0,
          accuracy: data.accuracy || 100
        };
        
        if (!isTracking) {
          setIsTracking(true);
        }
      });
      
      cleanupFunctions.push(unsubscribeStats);
      
      // 통계 저장 완료 이벤트
      const unsubscribeSaved = api.onStatsSaved(() => {
        // 저장 완료 시 로그 업데이트
        fetchLogs();
      });
      
      cleanupFunctions.push(unsubscribeSaved);
      
      // 저장
      eventsCleanupRef.current = cleanupFunctions;
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
      
      // 등록된 모든 인터벌 제거
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
    };
  }, [electronAPI, createDummyAPI, isTracking, fetchLogs]);

  // 트레이 메뉴에서 탭 전환 이벤트 처리
  useEffect(() => {
    const api = electronAPI || createDummyAPI;
    
    // 트레이 메뉴에서 특정 탭으로 이동하는 이벤트 처리
    const unsubscribeSwitchTab = api.onSwitchTab((tab: string) => {
      console.log(`트레이 메뉴에서 ${tab} 탭으로 이동 요청`);
      handleTabChange(tab);
    });
    
    // 트레이 메뉴에서 통계 저장 다이얼로그 열기 요청 처리
    const unsubscribeOpenSaveDialog = api.onOpenSaveStatsDialog(() => {
      console.log('트레이 메뉴에서 통계 저장 다이얼로그 열기 요청');
      handleTabChange('monitor'); // 모니터링 탭으로 전환
      // 여기에 통계 저장 다이얼로그를 여는 로직 추가 (필요시)
    });
    
    // 주기적으로 트레이 통계 업데이트 요청 (필요시)
    const statsUpdateInterval = setInterval(() => {
      if (isTracking && api.requestStatsUpdate) {
        api.requestStatsUpdate();
      }
    }, 30000); // 30초마다 업데이트 (부하 방지)
    
    intervalsRef.current.push(statsUpdateInterval);
    
    // 이벤트 리스너 정리
    return () => {
      unsubscribeSwitchTab();
      unsubscribeOpenSaveDialog();
      clearInterval(statsUpdateInterval);
    };
  }, [electronAPI, createDummyAPI, handleTabChange, isTracking]);

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
    if (typeof window !== 'undefined') {
      if (window.electronAPI) {
        setElectronAPI(window.electronAPI);
      }
    }
    
    // 페이지 언마운트 시 메모리 정리
    return () => {
      // 등록된 모든 이벤트 리스너 제거
      eventsCleanupRef.current.forEach(cleanup => cleanup());
      eventsCleanupRef.current = [];
      
      // 등록된 모든 인터벌 제거
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
      
      // 메모리 해제 요청
      if (window.gc) {
        try {
          window.gc();
        } catch (e) {
          console.log('GC 호출 실패');
        }
      }
    };
  }, []);

  // handleDarkModeChange 함수 수정
const handleDarkModeChange = useCallback((enabled: boolean) => {
  setDarkMode(enabled);
  
  // 즉시 전역 요소에 다크 모드 적용
  applyDarkModeToAllElements(enabled);
  
  if (electronAPI) {
    electronAPI.setDarkMode(enabled);
  }
}, [electronAPI, applyDarkModeToAllElements]);

  // 자동 숨김 모드 상태 추가
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const headerDetectionRef = useRef<HTMLDivElement>(null);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 자동 숨김 기능 처리 (윈도우 기본 헤더용)
  useEffect(() => {
    const isAutoHideMode = windowMode === 'fullscreen-auto-hide';
    
    if (!isAutoHideMode) {
      // 자동 숨김이 아닌 경우 항상 표시
      if (electronAPI && typeof electronAPI.windowControl === 'function') {
        // TypeScript 오류 해결 - 타입 단언(type assertion) 사용
        (electronAPI.windowControl as Function)('showHeader');
      }
      return;
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      const { clientY } = e;
      
      // 마우스가 화면 상단 100px 이내에 있을 때 헤더 표시 (60px에서 100px로 증가)
      if (clientY < 100) {
        setIsHeaderVisible(true);
        if (electronAPI && typeof electronAPI.windowControl === 'function') {
          // TypeScript 오류 해결 - 타입 단언 사용
          (electronAPI.windowControl as Function)('showHeader');
        }
        
        if (autoHideTimeoutRef.current) {
          clearTimeout(autoHideTimeoutRef.current);
          autoHideTimeoutRef.current = null;
        }
      } else if (clientY > 150 && isHeaderVisible) {
        // 마우스가 아래로 이동했을 때 타이머 설정 - 거리와 시간 증가
        if (!autoHideTimeoutRef.current) {
          autoHideTimeoutRef.current = setTimeout(() => {
            setIsHeaderVisible(false);
            if (electronAPI && typeof electronAPI.windowControl === 'function') {
              (electronAPI.windowControl as Function)('hideHeader');
            }
            autoHideTimeoutRef.current = null;
          }, 1500); // 1000ms에서 1500ms로 증가
        }
      }
    };
    
    // 캡처 옵션과 우선순위 높임
    window.addEventListener('mousemove', handleMouseMove, { 
      passive: true, 
      capture: true 
    });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
    };
  }, [windowMode, isHeaderVisible, electronAPI]);
  
  // window 제목 설정 (loop)
  useEffect(() => {
    // Electron API를 통해 앱 제목 설정 (window 이름을 'loop'로 변경)
    if (electronAPI && typeof electronAPI.windowControl === 'function') {
      // TypeScript 오류 해결 - 타입 단언 사용
      (electronAPI.windowControl as Function)('setTitle', 'loop');
    }
    
    // 기본 Window API로도 제목 설정
    if (typeof document !== 'undefined') {
      document.title = 'loop';
    }
  }, [electronAPI]);

  // 메모이제이션된 컴포넌트 렌더링 - 의존성 최적화
  const renderActiveTab = useMemo(() => {
    // 각 탭 렌더링별 필요한 의존성만 포함
    switch (activeTab) {
      case 'monitor':
        return (
          <TypingMonitor 
            stats={displayStats}
            isTracking={isTracking}
            onStartTracking={handleStartTracking}
            onStopTracking={handleStopTracking}
            onSaveStats={handleSaveStats}
          />
        );
      case 'history':
        return (
          <TypingHistory 
            logs={logs}
            isLoading={isLoading}
          />
        );
      case 'stats':
        return (
          <TypingStats 
            logs={logs}
          />
        );
      case 'chart':
        return (
          <TypingChart 
            logs={logs}
          />
        );
      case 'settings':
        return (
          <Settings 
            onSave={handleSaveSettings}
            initialSettings={settings}
            darkMode={darkMode}
            onDarkModeChange={handleDarkModeChange}
            onWindowModeChange={handleWindowModeChange}
          />
        );
      default:
        return null;
    }
  }, [
    activeTab, 
    displayStats, 
    isTracking, 
    handleStartTracking, 
    handleStopTracking, 
    handleSaveStats,
    logs, 
    isLoading, 
    settings, 
    darkMode, 
    handleDarkModeChange, 
    handleWindowModeChange
  ]);

  return (
    <div 
      className={`${styles.container} ${darkMode ? 'dark-mode' : ''} ${windowMode === 'fullscreen-auto-hide' ? styles.zenMode : ''}`}
      style={{ position: 'relative', zIndex: 1 }}
    >
      {/* AppHeader 컴포넌트 추가 */}
      <AppHeader api={electronAPI} />
      
      {/* 자동 숨김 모드일 때 감지 영역 추가 */}
      {windowMode === 'fullscreen-auto-hide' && (
        <div 
          ref={headerDetectionRef}
          className={styles.headerDetectionArea}
          aria-hidden="true"
          style={{ pointerEvents: 'auto' }} 
        />
      )}
      
      <main className={styles.mainContent}>
        <div className={styles.appTabs} style={{ pointerEvents: 'auto' }}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'monitor' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('monitor')}
            style={{ pointerEvents: 'auto' }}
          >
            모니터링
          </button>
          
          {/* 다른 탭 버튼들에도 동일한 style 속성 추가 */}
          <button 
            className={`${styles.tabButton} ${activeTab === 'history' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('history')}
            style={{ pointerEvents: 'auto' }}
          >
            히스토리
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'stats' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('stats')}
            style={{ pointerEvents: 'auto' }}
          >
            통계
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'chart' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('chart')}
            style={{ pointerEvents: 'auto' }}
          >
            차트
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'settings' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('settings')}
            style={{ pointerEvents: 'auto' }}
          >
            설정
          </button>
          
          {/* 디버그 모드 토글 버튼 */}
          <button 
            className={`${styles.tabButton} ${styles.debugButton} ${debugMode ? styles.debugActive : ''}`}
            onClick={toggleDebugMode}
            title="디버그 모드 토글"
            style={{ pointerEvents: 'auto' }}
          >
            🐞
          </button>
        </div>
        
        {/* 메모이제이션된 컴포넌트 사용 */}
        {renderActiveTab}
      </main>
      
      {/* 디버그 패널을 하단으로 이동 */}
      {debugMode && (
        <div className={styles.debugPanelBottom}>
          <h3>디버그 정보</h3>
          <div className={styles.debugInfo}>
            <div><strong>isTracking:</strong> {isTracking ? 'true' : 'false'}</div>
            <div><strong>Logs:</strong> {logs.length}개</div>
            <div><strong>Current keyCount:</strong> {currentStatsRef.current.keyCount}</div>
            <div><strong>Browser:</strong> {currentStatsRef.current.browserName || 'N/A'}</div>
            <div><strong>Window:</strong> {currentStatsRef.current.windowTitle || 'N/A'}</div>
            <div><strong>Window Mode:</strong> {windowMode}</div>
          </div>
        </div>
      )}
      
      <AppFooter />
    </div>
  );
});

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