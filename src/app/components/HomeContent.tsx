'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { TypingMonitor } from './TypingMonitor';
import { TypingChart } from './TypingChart';
import { TabNavigation } from './TabNavigation';
import { MainLayout } from './MainLayout';
import { DebugPanel } from './DebugPanel';
import { Settings } from './Settings'; 
import RestartLoading from './RestartLoading';
import { useElectronApi } from '../hooks/useElectronApi';
import { useSettings } from '../hooks/useSettings';
import { useTypingStats } from '../hooks/useTypingStats';
import { useTabNavigation } from '../hooks/useTabNavigation';
import { useMemoryManagement } from '../hooks/useMemoryManagement';
import { useAutoHideHeader } from '../hooks/useAutoHideHeader';
import { optimizeImageResources } from '../utils/memory/image-optimizer';

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
  
  // 사용하지 않는 함수에 _ 추가
  const _loadSettings = async () => {
    try {
      if (electronAPI && electronAPI.loadSettings) {
        const settings = await electronAPI.loadSettings();
        
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
          useHardwareAcceleration: settings.useHardwareAcceleration ?? false,
          processingMode: settings.processingMode ?? 'auto',
          maxMemoryThreshold: settings.maxMemoryThreshold ?? 100
        };
        
        handleSaveSettings(completeSettings);
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
  
  // 타이핑 통계 관리 - 사용하지 않는 변수에 대한 구조 분해 할당 수정
  const { 
    logs: typingLogs, 
    isLoading: _isLoading,  // _isLoading 속성이 아닌 isLoading에서 이름 변경
    isTracking,
    displayStats,
    handleStartTracking,
    handleStopTracking,
    handleSaveStats,
    currentStatsRef,
    fetchLogs: _fetchLogs  // _fetchLogs 속성이 아닌 fetchLogs에서 이름 변경
  } = useTypingStats(electronAPI);
  
  // 현재 표시할 로그 관리
  const [currentLogs, setCurrentLogs] = useState<LogEntry[]>([]);
  
  // 메모리 관리 훅 사용 개선
  const memoryManager = useMemoryManagement({
    debugMode,
    activeTab,
    memoryThreshold: 100, 
    checkInterval: 30000, 
    onClearLogs: () => {
      if (activeTab !== 'history' && activeTab !== 'stats' && activeTab !== 'chart') {
        setCurrentLogs([]);
        
        try {
          optimizeImageResources().catch((err: Error) => {
            console.error('이미지 리소스 최적화 중 오류:', err);
          });
        } catch (err) {
          console.error('이미지 최적화 실행 오류:', err);
        }
      }
    }
  });

  // 컴포넌트 첫 로드 시 메모리 최적화 실행
  useEffect(() => {
    try {
      if (window.__memoryOptimizer?.requestGC) {
        window.__memoryOptimizer.requestGC(false).catch(err => {
          console.error('메모리 최적화 오류:', err);
        });
      }
    } catch (err) {
      console.error('GC 요청 오류:', err);
    }
    
    const imageOptimizationInterval = setInterval(() => {
      optimizeImageResources().catch((err: Error) => {
        console.error('이미지 리소스 최적화 주기 작업 중 오류:', err);
      });
    }, 300000);
    
    memoryManager.addInterval(imageOptimizationInterval);
    
    return () => {
      memoryManager.clearIntervals();
    };
  }, [memoryManager]);

  React.useEffect(() => {
    if (typingLogs && typingLogs.length > 0) {
      setCurrentLogs(typingLogs);
    }
  }, [typingLogs]);

  const [isRestarting, setIsRestarting] = useState(false);

  useEffect(() => {
    if (!electronAPI) return;
    
    const unsubscribe = electronAPI.onShowRestartLoading?.((data: RestartLoadingData) => {
      setIsRestarting(true);
      
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
      <RestartLoading 
        isVisible={isRestarting}
        message="앱을 재시작하는 중입니다"
      />
      
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onDebugToggle={toggleDebugMode}
        debugMode={debugMode}
      />
      
      {renderContent()}
      
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

export default HomeContent;
