'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { TypingMonitor } from './TypingMonitor';
import { TypingChart } from './TypingChart';
import { TabNavigation } from './TabNavigation';
import { MainLayout } from './MainLayout';
import { DebugPanel } from './DebugPanel';
import { Settings } from './Settings'; 
import RestartLoading from './RestartLoading';
import { Badge } from './ui/badge';
import { useElectronApi } from '../hooks/useElectronApi';
import { useSettings } from '../hooks/useSettings';
import { useTypingStats } from '../hooks/useTypingStats';
import { useTabNavigation } from '../hooks/useTabNavigation';
import { useMemoryManagement } from '../hooks/useMemoryManagement';
import { useAutoHideHeader } from '../hooks/useAutoHideHeader';
import { optimizeImageResources } from '../utils/memory/image-optimizer';
import MemoryMonitor from './MemoryMonitor';
import _TypingStats from './TypingStats';
import styles from './HomeContent.module.css';

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

// App 필터 타입 정의
interface AppFilter {
  id: string;
  color: string;
  label: string;
  enabled: boolean;
}

// LogItem 타입 정의
interface LogItem {
  id: string;
  icon: string;
  time: string;
  text: string;
  app: string;
}

// RestartLoadingData 인터페이스 추가
interface RestartLoadingData {
  message?: string;
  timeout?: number;
}

export const HomeContent = React.memo(function HomeContent() {
  // Electron API 초기화
  const { electronAPI, _api } = useElectronApi();
  
  // 설정 상태 관리
  const { 
    settings, 
    darkMode, 
    windowMode,
    handleSaveSettings, 
    handleDarkModeChange, 
    handleWindowModeChange 
  } = useSettings(electronAPI);
  
  // 앱 필터 상태
  const [appFilters, setAppFilters] = useState<AppFilter[]>([
    { id: 'discord', color: '#5865F2', label: 'Discord', enabled: true },
    { id: 'notion', color: '#0F9D58', label: 'Notion', enabled: true },
    { id: 'chrome', color: '#4285F4', label: 'Chrome', enabled: true },
    { id: 'kakaoTalk', color: '#FFEB3B', label: 'Kakao Talk', enabled: true },
  ]);
  
  // 검색 상태 관리
  const [searchQuery, setSearchQuery] = useState('');
  
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
  // 탭 관리 - 초기 탭을 'chatlog'로 변경
  const { 
    activeTab, 
    debugMode, 
    handleTabChange, 
    toggleDebugMode 
  } = useTabNavigation({ 
    initialTab: 'chatlog',
    electronAPI
  });
  // 자동 숨김 헤더 관리
  const { isHeaderVisible } = useAutoHideHeader({
    windowMode, 
    electronAPI
  });
  
  // 타이핑 통계 관리 - 사용하지 않는 변수에 대한 구조 분해 할당 수정
  const { 
    logs: typingLogs, 
    isLoading: _isLoading,
    isTracking,
    displayStats,
    handleStartTracking,
    handleStopTracking,
    handleSaveStats,
    currentStatsRef,
    fetchLogs: _fetchLogs
  } = useTypingStats(electronAPI);
  
  // 현재 표시할 로그 관리
  const [currentLogs, setCurrentLogs] = useState<LogEntry[]>([]);
  
  // 로그 아이템 관리
  const [logItems, setLogItems] = useState<LogItem[]>([]);
  
  // 분석 통계 관리
  const [_analysisStats, _setAnalysisStats] = useState<any>({});
  
  // 메모리 관리 훅 사용 개선
  const memoryManager = useMemoryManagement({
    debugMode,
    activeTab,
    memoryThreshold: 100, 
    checkInterval: 30000, 
    onClearLogs: () => {
      if (activeTab !== 'stats' && activeTab !== 'apps') {
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

  // 로그 데이터를 로그 아이템으로 변환
  useEffect(() => {
    if (typingLogs && typingLogs.length > 0) {
      const newLogItems = typingLogs.map(log => {
        // 앱별 색상 결정
        let iconColor = '#909090'; // 기본 색상
        const appName = log.browser_name?.toLowerCase() || '';
        
        if (appName.includes('discord')) {
          iconColor = '#5865F2';
        } else if (appName.includes('notion')) {
          iconColor = '#0F9D58';
        } else if (appName.includes('chrome') || appName.includes('google')) {
          iconColor = '#4285F4';
        } else if (appName.includes('kakao')) {
          iconColor = '#FFEB3B';
        }
        
        // 시간 포맷팅
        const date = new Date(log.timestamp);
        const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        return {
          id: log.id.toString(),
          icon: iconColor,
          time: timeString,
          text: log.content || log.window_title || '내용 없음',
          app: log.browser_name || '알 수 없음'
        };
      });
      
      setLogItems(newLogItems);
      setCurrentLogs(typingLogs);
    }
  }, [typingLogs]);

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

  // 앱 필터 토글 핸들러
  const toggleAppFilter = useCallback((filterId: string) => {
    setAppFilters(prev => prev.map(filter => 
      filter.id === filterId 
        ? { ...filter, enabled: !filter.enabled } 
        : filter
    ));
  }, []);

  // 검색어 변경 핸들러
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // 필터링된 로그 항목
  const filteredLogs = React.useMemo(() => {
    // 1. 먼저 활성화된 앱 필터로 필터링
    const enabledApps = appFilters
      .filter(f => f.enabled)
      .map(f => f.label.toLowerCase());
    
    let filtered = logItems.filter(item => 
      enabledApps.some(app => item.app.toLowerCase().includes(app))
    );
    
    // 2. 검색어로 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.text.toLowerCase().includes(query) ||
        item.app.toLowerCase().includes(query) ||
        item.time.includes(query)
      );
    }
    
    return filtered;
  }, [logItems, appFilters, searchQuery]);

  // 통계 계산 함수
  const calculateStats = useCallback(() => {
    if (!typingLogs || typingLogs.length === 0) {
      return [
        { id: 'keyCount', label: '총 타자 수', value: '0' },
        { id: 'typingTime', label: '총 시간', value: '0분' },
        { id: 'avgSpeed', label: '평균 속도', value: '0타/분' }
      ];
    }
    
    const today = new Date().toDateString();
    const todayLogs = typingLogs.filter(log => new Date(log.timestamp).toDateString() === today);
    
    const totalKeyCount = todayLogs.reduce((sum, log) => sum + log.key_count, 0);
    const totalTypingTime = todayLogs.reduce((sum, log) => sum + log.typing_time, 0);
    const avgSpeed = totalTypingTime > 0 ? Math.round((totalKeyCount / totalTypingTime) * 60) : 0;
    
    return [
      { id: 'keyCount', label: '총 타자 수', value: totalKeyCount.toLocaleString() },
      { id: 'typingTime', label: '총 시간', value: `${Math.round(totalTypingTime / 60)}분` },
      { id: 'avgSpeed', label: '평균 속도', value: `${avgSpeed}타/분` }
    ];
  }, [typingLogs]);

  // 채팅 로그 렌더링
  const renderChatLog = useCallback(() => {
    return (
      <div className={styles.chatLogContainer}>
        {/* 좌측 패널: 앱 필터 */}
        <div className={styles.sidePanel}>
          <h3>앱 필터</h3>
          {appFilters.map(({ id, color, label, enabled }) => (
            <div
              key={id}
              className={`${styles.appItem} ${!enabled ? styles.disabled : ''}`}
              onClick={() => toggleAppFilter(id)}
            >
              <span
                className={styles.appIcon}
                style={{ backgroundColor: color }}
              />
              <span className={styles.appLabel}>{label}</span>
            </div>
          ))}

          {/* 통계 요약 */}
          <div className={styles.statsBox}>
            <h4>오늘의 통계</h4>
            {calculateStats().map((stat) => (
              <div key={stat.id} className={styles.statRow}>
                <span className={styles.statLabel}>{stat.label}</span>
                <span className={styles.statValue}>{stat.value}</span>
              </div>
            ))}
          </div>
          
          {/* 메모리 모니터 */}
          <div className={styles.memorySection}>
            <h4>메모리 상태</h4>
            <MemoryMonitor 
              pollInterval={15000}
              historyLength={10}
              showControls={false}
              height={150}
              detailed={false}
              darkMode={darkMode}
            />
          </div>
        </div>

        {/* 메인 컨텐츠: 로그 목록 */}
        <div className={styles.mainContent}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="검색어를 입력하세요..."
              value={searchQuery}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
            <Badge 
              variant={isTracking ? 'default' : 'secondary'}
              className={`${styles.statusBadge} ${isTracking ? styles.active : styles.inactive}`}
            >
              {isTracking ? '추적 중' : '비활성화'}
            </Badge>
          </div>

          {/* 테이블 헤더 */}
          <div className={styles.tableHeader}>
            <div className={styles.tableCellHeader}>앱</div>
            <div className={styles.tableCellHeader}>시간</div>
            <div className={styles.tableCellHeader}>내용</div>
            <div className={styles.tableCellHeader}>작업</div>
          </div>

          {/* 로그 리스트 */}
          <div className={styles.logList}>
            {filteredLogs.length > 0 ? filteredLogs.map((log) => (
              <div key={log.id} className={styles.logRow}>
                <div className={styles.tableCell}>
                  <span className={styles.logIcon} style={{ backgroundColor: log.icon }} />
                  <span className={styles.logApp}>{log.app}</span>
                </div>
                <div className={styles.tableCell}>
                  <span className={styles.logTime}>{log.time}</span>
                </div>
                <div className={`${styles.tableCell} ${styles.logTextCell}`}>
                  <span className={styles.logText}>{log.text}</span>
                </div>
                <div className={styles.tableCell}>
                  <button className={styles.openButton}>열기</button>
                </div>
              </div>
            )) : (
              <div className={styles.emptyState}>
                표시할 로그가 없습니다
              </div>
            )}
          </div>

          {/* 바닥글 & AI 버튼 */}
          <div className={styles.footer}>
            <span className={styles.version}>Loop Pro v1.2.0</span>
            <div className={styles.controls}>
              <button 
                className={styles.actionButton}
                onClick={isTracking ? handleStopTracking : handleStartTracking}
                style={{ backgroundColor: isTracking ? '#F44336' : '#2E7D32' }}
              >
                {isTracking ? '추적 중지' : '추적 시작'}
              </button>
              <button className={styles.aiButton}>AI 도우미</button>
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    appFilters, 
    toggleAppFilter, 
    searchQuery, 
    handleSearchChange, 
    isTracking, 
    filteredLogs, 
    handleStartTracking, 
    handleStopTracking,
    calculateStats,
    darkMode
  ]);

  // 주요 콘텐츠 렌더링 함수 업데이트
  const renderContent = useCallback(() => {
    switch (activeTab) {
      case 'chatlog':
        return renderChatLog();
      case 'stats':
        return (
          <React.Suspense fallback={<div>로딩 중...</div>}>
            <TypingChart 
              logs={typingLogs}
            />
          </React.Suspense>
        );
      case 'apps':
        return (
          <TypingMonitor
            stats={displayStats}
            isTracking={isTracking}
            onStartTracking={handleStartTracking}
            onStopTracking={handleStopTracking}
            onSaveStats={handleSaveStats}
          />
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
    renderChatLog,
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
