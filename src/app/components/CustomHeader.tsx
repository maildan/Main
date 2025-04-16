'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import styles from './CustomHeader.module.css';
import { useTheme } from './ThemeProvider';

// 앱 아이콘 컴포넌트
function AppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M12 2L2 7L12 12L22 7L12 2Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M2 17L12 22L22 17" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <path 
        d="M2 12L12 17L22 12" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 아이콘 컴포넌트들
function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.5 2.5L14 7V13.5H10V9.5H6V13.5H2V7L8.5 2.5Z" 
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatisticsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 13.5H14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M4 13.5V5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8 13.5V2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 13.5V8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3.5" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 2V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M11 2V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 10.5C9.38071 10.5 10.5 9.38071 10.5 8C10.5 6.61929 9.38071 5.5 8 5.5C6.61929 5.5 5.5 6.61929 5.5 8C5.5 9.38071 6.61929 10.5 8 10.5Z" 
        stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 8C13 7.83332 13 7.66668 12.9833 7.5H14.5C14.7667 7.5 15 7.73332 15 8C15 8.26668 14.7667 8.5 14.5 8.5H12.9833C13 8.33332 13 8.16668 13 8Z" 
        stroke="currentColor" strokeWidth="1.2" />
      <path d="M12.4333 4.9C12.3333 4.76668 12.2333 4.63332 12.1167 4.51668L13.1167 3.51668C13.3 3.33332 13.3 3.03332 13.1167 2.85C12.9333 2.66668 12.6333 2.66668 12.45 2.85L11.45 3.85C11.3333 3.73332 11.2 3.63332 11.0667 3.53332C10.9333 3.43332 10.7833 3.35 10.6333 3.28332L10.9833 1.78332C11.05 1.51668 10.8833 1.26668 10.6167 1.2C10.35 1.13332 10.1 1.3 10.0333 1.56668L9.68328 3.06668C9.51662 3.03332 9.33328 3.01668 9.16662 3.01668C8.99995 3.01668 8.81662 3.03332 8.64995 3.06668L8.29995 1.56668C8.23328 1.3 7.98328 1.13332 7.71662 1.2C7.44995 1.26668 7.28328 1.51668 7.34995 1.78332L7.69995 3.28332C7.54995 3.35 7.39995 3.43332 7.26662 3.53332C7.13328 3.63332 6.99995 3.73332 6.88328 3.85L5.88328 2.85C5.69995 2.66668 5.39995 2.66668 5.21662 2.85C5.03328 3.03332 5.03328 3.33332 5.21662 3.51668L6.21662 4.51668C6.09995 4.63332 5.99995 4.76668 5.89995 4.9C5.79995 5.03332 5.71662 5.18332 5.64995 5.33332L4.14995 4.98332C3.88328 4.91668 3.63328 5.08332 3.56662 5.35C3.49995 5.61668 3.66662 5.86668 3.93328 5.93332L5.43328 6.28332C5.39995 6.45 5.38328 6.63332 5.38328 6.8C5.38328 6.96668 5.39995 7.15 5.43328 7.31668L3.93328 7.66668C3.66662 7.73332 3.49995 7.98332 3.56662 8.25C3.63328 8.51668 3.88328 8.68332 4.14995 8.61668L5.64995 8.26668C5.71662 8.41668 5.79995 8.56668 5.89995 8.7C5.99995 8.83332 6.09995 8.96668 6.21662 9.08332L5.21662 10.0833C5.03328 10.2667 5.03328 10.5667 5.21662 10.75C5.39995 10.9333 5.69995 10.9333 5.88328 10.75L6.88328 9.75C6.99995 9.86668 7.13328 9.96668 7.26662 10.0667C7.39995 10.1667 7.54995 10.25 7.69995 10.3167L7.34995 11.8167C7.28328 12.0833 7.44995 12.3333 7.71662 12.4C7.98328 12.4667 8.23328 12.3 8.29995 12.0333L8.64995 10.5333C8.81662 10.5667 8.99995 10.5833 9.16662 10.5833C9.33328 10.5833 9.51662 10.5667 9.68328 10.5333L10.0333 12.0333C10.1 12.3 10.35 12.4667 10.6167 12.4C10.8833 12.3333 11.05 12.0833 10.9833 11.8167L10.6333 10.3167C10.7833 10.25 10.9333 10.1667 11.0667 10.0667C11.2 9.96668 11.3333 9.86668 11.45 9.75L12.45 10.75C12.6333 10.9333 12.9333 10.9333 13.1167 10.75C13.3 10.5667 13.3 10.2667 13.1167 10.0833L12.1167 9.08332C12.2333 8.96668 12.3333 8.83332 12.4333 8.7C12.5333 8.56668 12.6167 8.41668 12.6833 8.26668L14.1833 8.61668C14.45 8.68332 14.7 8.51668 14.7667 8.25C14.8333 7.98332 14.6667 7.73332 14.4 7.66668L12.9 7.31668C12.9333 7.15 12.95 6.96668 12.95 6.8C12.95 6.63332 12.9333 6.45 12.9 6.28332L14.4 5.93332C14.6667 5.86668 14.8333 5.61668 14.7667 5.35C14.7 5.08332 14.45 4.91668 14.1833 4.98332L12.6833 5.33332C12.6167 5.18332 12.5333 5.03332 12.4333 4.9Z" 
        stroke="currentColor" strokeWidth="0.7" />
    </svg>
  );
}

// Rust 테스트 아이콘
function TestIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8.5H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 4.5H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 12.5H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="5.5" cy="4.5" r="1" fill="currentColor" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
      <circle cx="7.5" cy="12.5" r="1" fill="currentColor" />
    </svg>
  );
}

interface CustomHeaderProps {
  api: any;
  isVisible?: boolean;
  autoHide?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export function CustomHeader({ api, isVisible = true, autoHide = false, onVisibilityChange }: CustomHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useTheme();
  
  const [activeTab, setActiveTab] = useState('monitor'); // 기본값은 'monitor' 탭
  const [showAppMenu, setShowAppMenu] = useState(false);
  
  // 탭 변경 핸들러
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (api && typeof api.onSwitchTab === 'function') {
      api.onSwitchTab(tab);
    }
  };

  // 앱 아이콘 클릭 핸들러
  const handleAppIconClick = useCallback(() => {
    setShowAppMenu(!showAppMenu);
  }, [showAppMenu]);

  // 외부 클릭 시 앱 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showAppMenu && headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setShowAppMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showAppMenu]);

  // Rust 네이티브 모듈 테스트 핸들러
  const handleOpenRustTest = useCallback(() => {
    if (api && api.onSwitchTab) {
      api.onSwitchTab('rustTest');
      setShowAppMenu(false);
    }
  }, [api, setShowAppMenu]);

  return (
    <div 
      className={`${styles.toolbarContainer} ${isDarkMode ? styles.darkMode : ''}`}
      data-testid="custom-toolbar"
        ref={headerRef}
    >
      <div className={styles.innerToolbar}>
        <div className={styles.iconBar}>
          {/* 앱 아이콘 버튼 추가 */}
          <button 
            className={`${styles.toolbarIcon} ${styles.appIconButton}`}
            onClick={handleAppIconClick}
            title="앱 메뉴"
            data-no-drag="true"
            aria-label="앱 메뉴"
          >
            <AppIcon />
          </button>
          
          <button 
            className={`${styles.toolbarIcon} ${activeTab === 'monitor' ? styles.active : ''}`}
            onClick={() => handleTabChange('monitor')}
            title="홈"
            data-no-drag="true"
          >
            <HomeIcon />
          </button>
          <button 
            className={`${styles.toolbarIcon} ${activeTab === 'stats' ? styles.active : ''}`}
            onClick={() => handleTabChange('stats')}
            title="분석"
            data-no-drag="true"
          >
            <StatisticsIcon />
          </button>
          <button 
            className={`${styles.toolbarIcon} ${activeTab === 'history' ? styles.active : ''}`}
            onClick={() => handleTabChange('history')}
            title="차트"
            data-no-drag="true"
          >
            <HistoryIcon />
          </button>
          <button 
            className={`${styles.toolbarIcon} ${activeTab === 'rustTest' ? styles.active : ''}`}
            onClick={() => handleTabChange('rustTest')}
            title="Rust 테스트"
            data-no-drag="true"
          >
            <TestIcon />
          </button>
          <button 
            className={`${styles.toolbarIcon} ${activeTab === 'settings' ? styles.active : ''}`}
            onClick={() => handleTabChange('settings')}
            title="설정"
            data-no-drag="true"
          >
            <SettingsIcon />
          </button>
        </div>
        
        {/* 앱 메뉴 팝업 */}
        {showAppMenu && (
          <div className={styles.appMenu}>
            <div className={styles.appMenuHeader}>
              <span className={styles.appMenuTitle}></span>
            </div>
            <div className={styles.appMenuItem} onClick={() => {
              if (api && api.onSwitchTab) {
                api.onSwitchTab('settings');
                setShowAppMenu(false);
              }
            }}>
              <span>설정</span>
            </div>
            <div className={styles.appMenuItem} onClick={handleOpenRustTest}>
              <span>테스트</span>
            </div>
            <div className={styles.appMenuItem} onClick={() => {
              if (api && api.restartApp) {
                api.restartApp();
              }
            }}>
              <span>앱 재시작</span>
            </div>
            <div className={styles.appMenuSeparator} />
            <div className={styles.appMenuItem} onClick={() => {
              alert('앱을 종료하려면 창의 닫기 버튼을 사용하세요.');
              setShowAppMenu(false);
            }}>
              <span>종료</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
