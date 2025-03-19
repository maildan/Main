'use client';

import React, { memo } from 'react';
import styles from '../page.module.css';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onDebugToggle: () => void;
  debugMode: boolean;
}

export const TabNavigation = memo(function TabNavigation({
  activeTab,
  onTabChange,
  onDebugToggle,
  debugMode
}: TabNavigationProps) {
  return (
    <div className={styles.appTabs} style={{ pointerEvents: 'auto' }}>
      <button 
        className={`${styles.tabButton} ${activeTab === 'monitor' ? styles.activeTab : ''}`}
        onClick={() => onTabChange('monitor')}
        style={{ pointerEvents: 'auto' }}
      >
        모니터링
      </button>
      
      <button 
        className={`${styles.tabButton} ${activeTab === 'history' ? styles.activeTab : ''}`}
        onClick={() => onTabChange('history')}
        style={{ pointerEvents: 'auto' }}
      >
        히스토리
      </button>
      
      <button 
        className={`${styles.tabButton} ${activeTab === 'stats' ? styles.activeTab : ''}`}
        onClick={() => onTabChange('stats')}
        style={{ pointerEvents: 'auto' }}
      >
        통계
      </button>
      
      <button 
        className={`${styles.tabButton} ${activeTab === 'chart' ? styles.activeTab : ''}`}
        onClick={() => onTabChange('chart')}
        style={{ pointerEvents: 'auto' }}
      >
        차트
      </button>
      
      <button 
        className={`${styles.tabButton} ${activeTab === 'settings' ? styles.activeTab : ''}`}
        onClick={() => onTabChange('settings')}
        style={{ pointerEvents: 'auto' }}
      >
        설정
      </button>
      
      {/* 디버그 모드 토글 버튼 */}
      <button 
        className={`${styles.tabButton} ${styles.debugButton} ${debugMode ? styles.debugActive : ''}`}
        onClick={onDebugToggle}
        title="디버그 모드 토글"
        style={{ pointerEvents: 'auto' }}
      >
        🐞
      </button>
    </div>
  );
});

export default TabNavigation;
