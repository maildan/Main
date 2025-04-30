'use client';

import React, { useState, useCallback, useEffect } from 'react';
import styles from './MiniView.module.css';

// 미니뷰 통계 인터페이스 추가
interface MiniViewStats {
  keyCount: number;
  typingTime: number;
  windowTitle?: string;
  browserName?: string;
  totalChars?: number;
  totalWords?: number;
  accuracy?: number;
  isTracking?: boolean;
}

export default function MiniView() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<MiniViewStats>({
    keyCount: 0,
    typingTime: 0,
    windowTitle: '',
    browserName: '',
    totalChars: 0,
    totalWords: 0,
    accuracy: 100,
    isTracking: false
  });

  // 초기화 시 webkitUserSelect를 none으로 설정
  useEffect(() => {
    document.documentElement.style.webkitUserSelect = 'none';
    document.documentElement.style.userSelect = 'none';
    
    // 전자 API를 사용하여 통계 업데이트 수신
    let unsubscribe: (() => void) | null = null;
    
    if (typeof window !== 'undefined' && window.electronAPI) {
      unsubscribe = window.electronAPI.onMiniViewStatsUpdate((data: MiniViewStats) => {
        setStats(data);
      });
    }
    
    return () => {
      document.documentElement.style.webkitUserSelect = '';
      document.documentElement.style.userSelect = '';
      
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // 드래그만 가능하게, onClick 제거
  // Collapsed state: Show only the app icon
  if (!isExpanded) {
    return (
      <div
        className={styles.miniViewCollapsed}
        aria-label="타이핑 통계 드래그"
        style={{
          WebkitAppRegion: 'drag',
          cursor: 'move',
          border: 'none',
          outline: 'none',
          boxShadow: 'none'
        }}
      >
        <img
          src="/app-icon.svg"
          alt="앱 아이콘"
          className={styles.appIcon}
          style={{ 
            pointerEvents: 'none',
            WebkitAppRegion: 'drag',
            border: 'none',
            outline: 'none'
          }}
        />
      </div>
    );
  }

  // Expanded state: Show the full mini-view with statistics
  return (
    <div className={styles.miniView}>
      <div className={styles.appIconWrapper}>
        <img
          src="/app-icon.svg"
          alt="앱 아이콘"
          className={styles.appIcon}
          onClick={() => setIsExpanded(false)}
        />
      </div>
      <div className={styles.content}>
        <div className={styles.statsContainer}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>타자 수</span>
            <span className={styles.statValue}>{stats.keyCount.toLocaleString()}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>타이핑 시간</span>
            <span className={styles.statValue}>{stats.typingTime}초</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>평균 속도</span>
            <span className={styles.statValue}>
              {stats.typingTime > 0 ? Math.round((stats.keyCount / stats.typingTime) * 60) : 0} 타/분
            </span>
          </div>
          {stats.accuracy && (
            <div className={styles.statItem}>
              <span className={styles.statLabel}>정확도</span>
              <span className={styles.statValue}>{stats.accuracy}%</span>
            </div>
          )}
        </div>
        {stats.windowTitle && (
          <div className={styles.currentWindow}>
            {stats.windowTitle}
          </div>
        )}
      </div>
    </div>
  );
}
