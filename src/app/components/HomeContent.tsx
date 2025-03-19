'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { TypingStats } from './TypingStats';
import { TypingMonitor } from './TypingMonitor';
import { TypingHistory } from './TypingHistory';
import { TypingChart } from './TypingChart';
import { TabNavigation } from './TabNavigation';
import { MainLayout } from './MainLayout';
import { DebugPanel } from './DebugPanel';
import { Settings } from './Settings'; 
// useToast를 사용하지 않는다면 임포트 제거
// import { useToast } from './ToastContext';
import { useElectronApi } from '../hooks/useElectronApi';
import { useSettings } from '../hooks/useSettings';
import { useTypingStats } from '../hooks/useTypingStats';
import { useTabNavigation } from '../hooks/useTabNavigation';
import { useMemoryManagement } from '../hooks/useMemoryManagement';
import { useAutoHideHeader } from '../hooks/useAutoHideHeader';

// LogEntry 타입 정의 추가
interface LogEntry {
  id: number;
  content: string;
  key_count: number;
  typing_time: number;
  timestamp: string;
  created_at: string;
  is_saved?: boolean;
  window_title?: string;
  browser_name?: string;
  total_chars?: number;
  total_chars_no_space?: number;
  total_words?: number;
  pages?: number;
  accuracy?: number;
}

export const HomeContent = React.memo(function HomeContent() {
  // Electron API 초기화
  const { electronAPI, api } = useElectronApi();
  
  // 설정 상태 관리
  const { 
    settings, 
    darkMode, 
    windowMode,
    handleSaveSettings, 
    handleDarkModeChange, 
    handleWindowModeChange 
  } = useSettings(electronAPI);
  
  // 설정 로드 함수 내에서 기본값 설정
  const loadSettings = async () => {
    try {
      if (electronAPI) {
        const settings = await electronAPI.loadSettings();
        
        // GPU 가속 관련 속성이 없는 경우 기본값 설정
        const completeSettings: SettingsState = {
          ...settings,
          // 필수 속성이지만 값이 undefined인 경우를 방지하기 위한 기본값 설정
          useHardwareAcceleration: settings.useHardwareAcceleration ?? false,
          processingMode: settings.processingMode ?? 'auto',
          maxMemoryThreshold: settings.maxMemoryThreshold ?? 100
        };
        
        // setSettings 대신 handleSaveSettings 사용
        handleSaveSettings(completeSettings);
        // setDarkMode 대신 handleDarkModeChange 사용
        handleDarkModeChange(settings.darkMode);
      }
    } catch (error) {
      console.error('설정 로드 중 오류:', error);
    }
  };

  // 탭 관리
  const { 
    activeTab, 
    debugMode, 
    handleTabChange, 
    toggleDebugMode 
  } = useTabNavigation({ 
    initialTab: 'monitor',
    electronAPI: api 
  });
  
  // 자동 숨김 헤더 관리
  const { isHeaderVisible } = useAutoHideHeader({
    windowMode, 
    electronAPI
  });
  
  // 타이핑 통계 관리 - 'typingLogs'로 이름 변경하여 중복 방지
  const { 
    logs: typingLogs, // 이름 변경
    isLoading, 
    isTracking,
    displayStats,
    handleStartTracking,
    handleStopTracking,
    handleSaveStats,
    currentStatsRef,
    fetchLogs
  } = useTypingStats(electronAPI);
  
  // 현재 표시할 로그 관리
  const [currentLogs, setCurrentLogs] = useState<LogEntry[]>([]); // 이름 변경
  
  // 메모리 관리
  useMemoryManagement({
    debugMode,
    activeTab,
    onClearLogs: () => {
      // 로그 데이터가 필요 없는 탭에서는 메모리에서 해제
      if (activeTab !== 'history' && activeTab !== 'stats' && activeTab !== 'chart') {
        setCurrentLogs([]); // 수정된 변수명으로 변경
      }
    }
  });

  // 로그 데이터 업데이트 - 타이핑 로그가 변경될 때마다 실행
  React.useEffect(() => {
    if (typingLogs && typingLogs.length > 0) {
      setCurrentLogs(typingLogs);
    }
  }, [typingLogs]);

  // 메모이제이션된 컴포넌트 렌더링
  const renderActiveTab = useMemo(() => {
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
          <React.Suspense fallback={<div>Loading history...</div>}>
            <TypingHistory 
              logs={currentLogs} // 변수명 수정
              isLoading={isLoading}
            />
          </React.Suspense>
        );
      case 'stats':
        return (
          <React.Suspense fallback={<div>Loading stats...</div>}>
            <TypingStats 
              logs={currentLogs} // 변수명 수정
            />
          </React.Suspense>
        );
      case 'chart':
        return (
          <React.Suspense fallback={<div>Loading chart...</div>}>
            <TypingChart 
              logs={currentLogs} // 변수명 수정
            />
          </React.Suspense>
        );
      case 'settings':
        return (
          <Settings  // 이제 정상적으로 임포트된 Settings 컴포넌트 사용
            onSave={handleSaveSettings}
            initialSettings={settings} // 이제 완전한 설정을 전달
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
    currentLogs, // 변수명 수정
    isLoading, 
    settings, 
    darkMode, 
    handleDarkModeChange, 
    handleWindowModeChange
  ]);

  return (
    <MainLayout 
      darkMode={darkMode}
      windowMode={windowMode} 
      electronAPI={electronAPI}
      isHeaderVisible={isHeaderVisible}
    >
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onDebugToggle={toggleDebugMode}
        debugMode={debugMode}
      />
      
      {/* 메모이제이션된 컴포넌트 사용 */}
      {renderActiveTab}
      
      {/* 디버그 패널 */}
      <DebugPanel
        isVisible={debugMode}
        stats={{
          keyCount: currentStatsRef.current.keyCount,
          windowTitle: currentStatsRef.current.windowTitle,
          browserName: currentStatsRef.current.browserName
        }}
        logsCount={currentLogs.length} // 변수명 수정
        isTracking={isTracking}
        windowMode={windowMode}
      />
    </MainLayout>
  );
});

export default HomeContent;
