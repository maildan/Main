'use client';

import React, { useEffect, useState, useCallback } from 'react';
import styles from './MiniView.module.css';

interface MiniViewStats {
  keyCount: number;
  typingTime: number;
  totalChars?: number;
  totalWords?: number;
  speed?: number;
  accuracy?: number;
  currentWindow?: string;
}

export default function MiniView() {
  const [stats, setStats] = useState<MiniViewStats>({
    keyCount: 0,
    typingTime: 0,
    totalChars: 0,
    totalWords: 0,
    speed: 0,
    accuracy: 100
  });
  
  const [activeTab, setActiveTab] = useState<'typing' | 'document'>('typing');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  
  // 다크모드 감지
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark-mode') || 
                    document.body.classList.contains('dark-mode');
      setIsDarkMode(isDark);
    };
    
    // 초기 확인
    checkDarkMode();
    
    // DOM 변화 관찰
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true });
    observer.observe(document.body, { attributes: true });
    
    // 이벤트 리스너
    window.addEventListener('darkmode-changed', (e: any) => {
      setIsDarkMode(e.detail?.darkMode);
    });
    
    return () => {
      observer.disconnect();
      window.removeEventListener('darkmode-changed', (e: any) => {
        setIsDarkMode(e.detail?.darkMode);
      });
    };
  }, []);
  
  // 통계 업데이트 수신
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // 통계 업데이트 리스너
      const unsubscribeStats = window.electronAPI.onTypingStatsUpdate((data) => {
        setStats(prev => ({
          ...prev,
          keyCount: data.keyCount,
          typingTime: data.typingTime,
          totalChars: data.totalChars || 0,
          totalWords: data.totalWords || 0,
          speed: data.typingTime > 0 ? Math.round((data.keyCount / data.typingTime) * 60) : 0,
          accuracy: data.accuracy || 100,
          currentWindow: data.windowTitle
        }));
        setIsTracking(true);
      });
      
      // 미니뷰 전용 통계 업데이트 리스너 - 타입 명시
      const unsubscribeMiniViewStats = window.electronAPI.onMiniViewStatsUpdate?.((data: TypingStatsUpdate) => {
        setStats(prev => ({
          ...prev,
          ...data,
          keyCount: data.keyCount,
          typingTime: data.typingTime,
          speed: data.typingTime > 0 ? Math.round((data.keyCount / data.typingTime) * 60) : 0
        }));
      }) || (() => {});
      
      return () => {
        unsubscribeStats();
        unsubscribeMiniViewStats();
      };
    }
  }, []);
  
  // 창 닫기 핸들러
  const handleClose = useCallback(() => {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.toggleMiniView) {
      window.electronAPI.toggleMiniView();
    }
  }, []);
  
  // 탭 전환 핸들러
  const handleTabChange = useCallback((tab: 'typing' | 'document') => {
    setActiveTab(tab);
  }, []);
  
  // 시간 포맷팅
  const formatTime = useCallback((seconds: number): string => {
    if (seconds < 60) return `${seconds}초`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
      return `${minutes}분 ${remainingSeconds}초`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}시간 ${remainingMinutes}분`;
  }, []);
  
  return (
    <div className={`${styles.miniView} ${isDarkMode ? styles.darkMode : ''}`}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'typing' ? styles.activeTab : ''}`} 
            onClick={() => handleTabChange('typing')}
          >
            타이핑
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'document' ? styles.activeTab : ''}`} 
            onClick={() => handleTabChange('document')}
          >
            문서
          </button>
        </div>
        <div className={styles.controls}>
          <button className={styles.closeButton} onClick={handleClose} title="미니뷰 닫기">×</button>
        </div>
      </div>
      
      <div className={styles.content}>
        {activeTab === 'typing' ? (
          <div className={styles.statsContainer}>
            <div className={styles.statusIndicator}>
              <div className={`${styles.indicator} ${isTracking ? styles.active : ''}`}></div>
              <span>{isTracking ? '모니터링 중' : '비활성'}</span>
            </div>
            
            <div className={styles.statItem}>
              <span className={styles.statLabel}>타자 수</span>
              <span className={styles.statValue}>{stats.keyCount.toLocaleString()}</span>
            </div>
            
            <div className={styles.statItem}>
              <span className={styles.statLabel}>시간</span>
              <span className={styles.statValue}>{formatTime(stats.typingTime)}</span>
            </div>
            
            <div className={styles.statItem}>
              <span className={styles.statLabel}>속도</span>
              <span className={styles.statValue}>{stats.speed} 타/분</span>
            </div>
          </div>
        ) : (
          <div className={styles.statsContainer}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>단어 수</span>
              <span className={styles.statValue}>{stats.totalWords?.toLocaleString() || '0'}</span>
            </div>
            
            <div className={styles.statItem}>
              <span className={styles.statLabel}>글자 수</span>
              <span className={styles.statValue}>{stats.totalChars?.toLocaleString() || '0'}</span>
            </div>
            
            <div className={styles.statItem}>
              <span className={styles.statLabel}>정확도</span>
              <span className={styles.statValue}>{stats.accuracy}%</span>
            </div>
          </div>
        )}
        
        {stats.currentWindow && (
          <div className={styles.currentWindow} title={stats.currentWindow}>
            {stats.currentWindow.length > 40 
              ? `${stats.currentWindow.substring(0, 37)}...` 
              : stats.currentWindow}
          </div>
        )}
      </div>
    </div>
  );
}
