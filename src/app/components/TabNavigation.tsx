'use client';

import React, { useCallback } from 'react';
import styles from './TabNavigation.module.css';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onDebugToggle?: () => void;
  debugMode?: boolean;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ 
  activeTab, 
  onTabChange, 
  onDebugToggle, 
  debugMode = false
}) => {
  const handleTabChange = useCallback((tab: string) => {
    if (tab !== activeTab) {
      onTabChange(tab);
    }
  }, [activeTab, onTabChange]);

  return (
    <div className={styles.tabContainer}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tabButton} ${activeTab === 'chatlog' ? styles.active : ''}`}
          onClick={() => handleTabChange('chatlog')}
          aria-selected={activeTab === 'chatlog'}
        >
          채팅 로그
        </button>
        
        <button
          className={`${styles.tabButton} ${activeTab === 'stats' ? styles.active : ''}`}
          onClick={() => handleTabChange('stats')}
          aria-selected={activeTab === 'stats'}
        >
          통계 분석
        </button>
        
        <button
          className={`${styles.tabButton} ${activeTab === 'apps' ? styles.active : ''}`}
          onClick={() => handleTabChange('apps')}
          aria-selected={activeTab === 'apps'}
        >
          앱 연결
        </button>
        
        <button
          className={`${styles.tabButton} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => handleTabChange('settings')}
          aria-selected={activeTab === 'settings'}
        >
          설정
        </button>
      </div>

      {onDebugToggle && (
        <button
          className={`${styles.debugButton} ${debugMode ? styles.debugActive : ''}`}
          onClick={onDebugToggle}
          aria-pressed={debugMode}
        >
          디버그 모드
        </button>
      )}
    </div>
  );
};

export default TabNavigation;
