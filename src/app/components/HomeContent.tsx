'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import TypingStats from './TypingStats'; // default import로 변경
import { TypingMonitor } from './TypingMonitor';
import { TypingHistory } from './TypingHistory';
import { TypingChart } from './TypingChart';
import { TabNavigation } from './TabNavigation';
import { MainLayout } from './MainLayout';
import { DebugPanel } from './DebugPanel';
import { Settings } from './Settings'; 
import RestartLoading from './RestartLoading';
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

// RestartLoadingData 인터페이스 추가
interface RestartLoadingData {
  message?: string;
  timeout?: number;
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
      if (electronAPI && electronAPI.loadSettings) {
        const settings = await electronAPI.loadSettings();
        
        // GPU 가속 관련 속성이 없는 경우 기본값 설정
        const completeSettings = {
          enabledCategories: settings.enabledCategories || {
            docs: true,
            office: true,
            coding: true,
            sns: true
          },
          autoStartMonitoring: settings.autoStartMonitoring ?? true,
          resumeAfterIdle: settings.resumeAfterIdle ?? true,
          darkMode: settings.darkMode ?? false,
          windowMode: settings.windowMode ?? 'windowed',
          minimizeToTray: settings.minimizeToTray ?? true,
          showTrayNotifications: settings.showTrayNotifications ?? true,
          reduceMemoryInBackground: settings.reduceMemoryInBackground ?? true,
          enableMiniView: settings.enableMiniView ?? true,
          // 기존 값 유지
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
    electronAPI: api // api는 이제 TabNavigationAPI와 호환됩니다
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
  const [currentLogs, setCurrentLogs] = useState<LogEntry[]>([]);
  
  // 메모리 관리 훅 사용 개선
  const memoryManager = useMemoryManagement({
    debugMode,
    activeTab,
    memoryThreshold: 100, // 100MB 기준
    checkInterval: 30000, // 30초마다 체크
    onClearLogs: () => {
      // 현재 활성 탭이 로그를 사용하지 않는 경우에만 해제
      if (activeTab !== 'history' && activeTab !== 'stats' && activeTab !== 'chart') {
        setCurrentLogs([]);
        
        // 대용량 데이터 참조 해제를 통한 추가 최적화
        if (window.__memoryOptimizer?.optimizeImageResources) {
          window.__memoryOptimizer.optimizeImageResources().catch((err: Error) => {
            console.error('이미지 리소스 최적화 중 오류:', err);
          });
        }
      }
    }
  });

  // 컴포넌트 첫 로드 시 메모리 최적화 실행
  useEffect(() => {
    // 초기 메모리 최적화
    if (window.__memoryOptimizer?.optimizeMemory) {
      window.__memoryOptimizer.optimizeMemory(false);
    }
    
    // 주기적으로 이미지 리소스 최적화 (페이지가 오래 열려있을 때)
    const imageOptimizationInterval = setInterval(() => {
      if (window.__memoryOptimizer?.optimizeImageResources) {
        window.__memoryOptimizer.optimizeImageResources().catch((err: Error) => {
          console.error('이미지 리소스 최적화 주기 작업 중 오류:', err);
        });
      }
    }, 300000); // 5분마다
    
    // 인터벌 등록 및 언마운트 시 정리
    memoryManager.addInterval(imageOptimizationInterval);
    
    return () => {
      memoryManager.clearIntervals();
    };
  }, [memoryManager]);

  // 로그 데이터 업데이트 - 타이핑 로그가 변경될 때마다 실행
  React.useEffect(() => {
    if (typingLogs && typingLogs.length > 0) {
      setCurrentLogs(typingLogs);
    }
  }, [typingLogs]);

  const [isRestarting, setIsRestarting] = useState(false);

  // 재시작 로딩 리스너 추가
  useEffect(() => {
    // 전자캅에 접근할 수 있는지 확인
    if (!electronAPI) return;
    
    const unsubscribe = electronAPI.onShowRestartLoading?.((data: RestartLoadingData) => {
      setIsRestarting(true);
      
      // 타임아웃이 있으면 자동으로 숨김
      if (data.timeout) {
        setTimeout(() => {
          setIsRestarting(false);
        }, data.timeout);
      }
    }) || (() => {});
    
    return () => {
      unsubscribe();
    };
  }, [electronAPI]);

  // 컴포넌트 렌더링 로직
  const renderContent = useCallback(() => {
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
      case 'stats':
        return (
          <React.Suspense fallback={<div>Loading chart...</div>}>
            <TypingChart 
              logs={typingLogs}
            />
          </React.Suspense>
        );
      case 'settings':
        return (
          <div className="settings-tab-wrapper" style={{
            maxWidth: '800px',
            margin: '0 auto',
            width: '100%'
          }}>
            <Settings
              onSave={handleSaveSettings}
              initialSettings={settings}
              darkMode={darkMode}
              onDarkModeChange={handleDarkModeChange}
              onWindowModeChange={handleWindowModeChange}
            />
          </div>
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
    typingLogs,
    settings, 
    darkMode, 
    handleDarkModeChange, 
    handleWindowModeChange,
    handleSaveSettings
  ]);

  return (
    <MainLayout 
      darkMode={darkMode}
      windowMode={windowMode} 
      electronAPI={electronAPI}
      isHeaderVisible={isHeaderVisible}
    >
      {/* 재시작 로딩 오버레이 */}
      <RestartLoading 
        isVisible={isRestarting}
        message="앱을 재시작하는 중입니다"
      />
      
      {/* 나머지 내용 */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onDebugToggle={toggleDebugMode}
        debugMode={debugMode}
      />
      
      {/* 메모이제이션된 컴포넌트 사용 */}
      {renderContent()}
      
      {/* 디버그 패널 */}
      <DebugPanel
        isVisible={debugMode}
        stats={currentStatsRef.current}
        logsCount={currentLogs.length}
        isTracking={isTracking}
        windowMode={windowMode}
      />
    </MainLayout>
  );
});

// 전역 window 타입 확장 - 참고용 주석으로 남겨둠
// Window.__memoryOptimizer는 이미 다른 파일(types-declarations.d.ts)에 정의되어 있음

export default HomeContent;
