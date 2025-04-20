'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
// import { TypingMonitor, TypingMonitorProps } from './TypingMonitor'; // 사용하지 않음
// import { TypingChart } from './TypingChart'; // 사용하지 않음
// import { TabNavigation, TabNavigationProps } from './TabNavigation'; // 사용하지 않음
import MainLayout from './MainLayout'; // Default import
import DebugPanel, { DebugPanelProps } from './DebugPanel'; // Default import로 변경 (가정)
import Settings, { SettingsState, WindowModeType } from './Settings'; // SettingsState, WindowModeType named import
import RestartLoading from './RestartLoading'; // Default import
import { useElectronApi } from '@/app/hooks/useElectronApi'; // 경로 복원
import { useSettings } from '@/app/hooks/useSettings'; // 경로 복원
import { useTypingStats } from '@/app/hooks/useTypingStats'; // 경로 복원
import { useTabNavigation } from '@/app/hooks/useTabNavigation'; // 경로 복원
import { useMemoryManagement } from '@/app/hooks/useMemoryManagement'; // 경로 복원
import { useAutoHideHeader } from '@/app/hooks/useAutoHideHeader'; // 경로 복원
import { optimizeImageResources } from '@/app/utils/memory/image-optimizer'; // 경로 복원
// import { useTheme } from './ThemeProvider'; // 사용하지 않음
import styles from './HomeContent.module.css';
// import TypingBox from './TypingBox'; // 사용하지 않음
// import TypingStats from './TypingStats'; // 사용하지 않음
// --- Shadcn UI Imports (경로 확인 필요, 주석 처리) ---
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Button } from '@/components/ui/button';
// --- Hooks Imports --- 
import { useToast } from '@/app/hooks/useToast'; // 경로 복원, addToast 사용
import RestartPrompt from './RestartPrompt'; // Default import로 변경 (가정)
import { useSystemStatus } from '@/app/hooks/useSystemStatus'; // 경로 복원, 훅 존재 가정
// --- Utils Imports --- 
import { logInfo, logError } from '@/app/utils/log-utils'; // 경로 복원
// import { useTypingSession } from '@/app/hooks/useTypingSession'; // useTypingStats 사용으로 대체?
// --- Component Imports --- 
import MemoryMonitor from './MemoryMonitor'; // Default import로 변경 (가정)
import PerformanceMonitor from './PerformanceMonitor'; // Default import로 변경 (가정)
import NativeModuleStatus from './NativeModuleStatus'; // Default import로 변경 (가정)
// import { SettingsForm } from './SettingsForm'; // Settings 컴포넌트 사용으로 대체?
import ActivityLogPanel from './ActivityLogPanel'; // Default import로 변경 (가정)
import HistoryPanel from './HistoryPanel'; // Default import로 변경 (가정)
// --- Icon Imports (lucide-react 설치 필요, 주석 처리) ---
// import { SettingsIcon, MemoryStickIcon, CpuIcon, ActivityIcon, HistoryIcon } from 'lucide-react';
// --- Next Imports --- 
import dynamic from 'next/dynamic';
// --- Type Imports --- 
import type { MemorySettings, WindowMode, ProcessingMode } from '@/types'; // MemorySettings는 일단 유지, 필요시 제거

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

// Dynamic imports for components (경로 및 export 확인 필요)
const SettingsPanel = dynamic(() => import('./SettingsPanel'), { // Default import 가정
  loading: () => <p>Loading Settings...</p>,
});
const ActivityLogPanel = dynamic(() => import('./ActivityLogPanel'), { // Default import 가정
  loading: () => <p>Loading Logs...</p>,
});
const HistoryPanel = dynamic(() => import('./HistoryPanel'), { // Default import 가정
  loading: () => <p>Loading History...</p>,
});

const HomeContent: React.FC = (): React.ReactNode => {
  const { electronAPI } = useElectronApi();
  // useSettings 훅이 SettingsState | null 반환 가정
  const { settings, isLoading: settingsLoading, error: settingsError, updateSetting, saveSettings: saveSettingsHook } = useSettings(electronAPI);
  const { logs, isLoading: statsLoading, isTracking, displayStats, processKeyInput, saveCurrentSession, resetSession, loadHistory, handleStartTracking, handleStopTracking, error: statsError } = useTypingStats(electronAPI);
  const { activeTab, debugMode, handleTabChange, toggleDebugMode } = useTabNavigation({ initialTab: 'monitor', electronAPI: electronAPI });
  const { isHeaderVisible } = useAutoHideHeader({ windowMode: settings?.windowMode, electronAPI: electronAPI });
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
  const { addToast } = useToast(); // showToast -> addToast
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);
  const [pendingSettings, setPendingSettings] = useState<Partial<SettingsState> | null>(null); // SettingsState 사용
  const { systemStatus, loading: statusLoading, error: statusError } = useSystemStatus();
  const [currentLogs, setCurrentLogs] = useState<LogEntry[]>([]);

  React.useEffect(() => {
    if (logs && logs.length > 0) {
      setCurrentLogs(logs);
    }
  }, [logs]);

  // currentSettings 정의 (SettingsState 기준)
  const currentSettings: SettingsState = settings || { // settings가 null일 경우 기본값 사용
    enabledCategories: { docs: true, office: true, coding: true, sns: true },
    autoStartMonitoring: true,
    resumeAfterIdle: true,
    darkMode: false,
    windowMode: 'windowed',
    minimizeToTray: true,
    showTrayNotifications: true,
    reduceMemoryInBackground: true,
    enableMiniView: true,
    useHardwareAcceleration: false,
    useTypingAnalysisGpuAcceleration: false,
    processingMode: 'auto',
    maxMemoryThreshold: 150,
    colorScheme: 'default',
    useSystemTheme: false,
    showKeyCountInHeader: true,
    showRealtimeWPM: true,
    enableSoundEffects: false,
    enableAnimations: true,
    useCompactUI: false,
  };

  // checkRequiresRestart 함수 (SettingsState 기준)
  const checkRequiresRestart = (oldSettings: SettingsState, newSettings: Partial<SettingsState>): boolean => {
    if (oldSettings.useHardwareAcceleration !== newSettings.useHardwareAcceleration && newSettings.useHardwareAcceleration !== undefined) {
      return true;
    }
    if (oldSettings.useTypingAnalysisGpuAcceleration !== newSettings.useTypingAnalysisGpuAcceleration && newSettings.useTypingAnalysisGpuAcceleration !== undefined) {
      return true;
    }
    // processingMode 변경 시 재시작 필요 여부 추가 (예시)
    if (oldSettings.processingMode !== newSettings.processingMode && newSettings.processingMode !== undefined) {
      return true;
    }
    return false;
  };

  // handleSettingsSave (SettingsState 기준)
  const handleSettingsSave = useCallback(async (newSettings: Partial<SettingsState>) => {
    logInfo('Saving settings:', newSettings);
    const requiresRestart = checkRequiresRestart(currentSettings, newSettings);
    try {
      // saveSettingsHook이 Partial<SettingsState>를 받는지 확인 필요
      await saveSettingsHook(newSettings);
      addToast('Settings saved successfully!', { type: 'success' }); // addToast 사용
      if (requiresRestart) {
        setPendingSettings(newSettings); // SettingsState 타입 할당
        setShowRestartPrompt(true);
      }
    } catch (error) {
      logError('Failed to save settings:', error);
      addToast('Failed to save settings.', { type: 'error' }); // addToast 사용
    }
  }, [saveSettingsHook, currentSettings, addToast]); // currentSettings, addToast 의존성 추가

  // handleDarkModeChangeLocal (SettingsState 기준)
  const handleDarkModeChangeLocal = useCallback((isDark: boolean) => {
    handleSettingsSave({ darkMode: isDark });
  }, [handleSettingsSave]);

  // handleWindowModeChangeLocal (SettingsState 기준)
  const handleWindowModeChangeLocal = useCallback((mode: WindowModeType) => {
    handleSettingsSave({ windowMode: mode });
    if (electronAPI) {
      electronAPI.setWindowMode(mode);
    }
  }, [handleSettingsSave, electronAPI]);

  // handleRestartConfirm, handleRestartCancel (동일)
  const handleRestartConfirm = useCallback(() => { /* ... */ }, []);
  const handleRestartCancel = useCallback(() => { /* ... */ }, []);

  // Error Toast useEffect (addToast 사용)
  useEffect(() => {
    if (settingsError) {
      addToast(`Error loading settings: ${settingsError}`, { type: 'error' });
    }
    if (statusError) {
      addToast(`Error fetching system status: ${statusError}`, { type: 'error' });
    }
    if (statsError) {
      addToast(`Typing stats error: ${statsError}`, { type: 'error' });
    }
  }, [settingsError, statusError, statsError, addToast]); // addToast 의존성 추가

  // Memoized components (SettingsState 전달)
  const memoizedSettingsPanel = useMemo(() => (
    <SettingsPanel
      initialSettings={currentSettings} // SettingsState 전달
      onSave={handleSettingsSave}       // SettingsState 받는 함수 전달
      loading={settingsLoading}
    // _darkMode, onDarkModeChange 등 SettingsPanel이 받는 props 확인 필요
    />
  ), [currentSettings, handleSettingsSave, settingsLoading]);

  // ... (다른 memoized 컴포넌트 동일)
  const memoizedHistoryPanel = useMemo(() => <HistoryPanel />, []);
  const memoizedActivityLogPanel = useMemo(() => <ActivityLogPanel />, []);
  const memoizedPerformanceMonitor = useMemo(() => <PerformanceMonitor systemStatus={systemStatus} loading={statusLoading} />, [systemStatus, statusLoading]);
  const memoizedMemoryMonitor = useMemo(() => <MemoryMonitor />, []);
  // TypingMonitor 관련 코드 제거 (사용 안 함)

  // --- Rendering --- 
  // renderContent 함수 및 UI 컴포넌트 임시 대체 유지
  // MainLayout에 전달하는 props는 SettingsState 기준으로 수정
  return (
    <MainLayout
      _darkMode={currentSettings.darkMode}
      toggleDarkMode={() => handleDarkModeChangeLocal(!currentSettings.darkMode)}
      windowMode={currentSettings.windowMode}
      electronAPI={electronAPI}
      isHeaderVisible={isHeaderVisible}
    >
      <RestartLoading
        isVisible={showRestartPrompt}
        message="설정 적용을 위해 재시작이 필요합니다."
        _onClose={handleRestartCancel} // handleCloseRestartLoading -> handleRestartCancel
      />

      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        debugMode={debugMode}
        onToggleDebug={toggleDebugMode}
      />

      <div className={`${styles.homeContent} ${currentSettings.darkMode ? styles.darkMode : ''}`}>
        {/* {renderContent()} */}
        {/* 임시로 활성 탭 컨텐츠 표시 로직 추가 */}
        {activeTab === 'monitor' && <p>Monitor Tab Content</p>} {/* TypingMonitor 대신 */}
        {activeTab === 'memory' && memoizedMemoryMonitor}
        {activeTab === 'settings' && memoizedSettingsPanel}
        {activeTab === 'history' && memoizedHistoryPanel}
        {activeTab === 'logs' && memoizedActivityLogPanel}
        {activeTab === 'debug' && <DebugPanel isVisible={debugMode} stats={displayStats} logsCount={currentLogs.length} isTracking={isTracking} windowMode={currentSettings.windowMode} />}
      </div>
    </MainLayout>
  );
};

export default HomeContent;
