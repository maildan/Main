import React, { memo, useRef, ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';
import styles from '../page.module.css';

interface MainLayoutProps {
  children: ReactNode;
  darkMode: boolean;
  windowMode: string;
  electronAPI: ElectronAPI | null;
  isHeaderVisible?: boolean;
}

export const MainLayout = memo(function MainLayout({ 
  children,
  darkMode,
  windowMode,
  electronAPI,
  isHeaderVisible = true
}: MainLayoutProps) {
  const headerDetectionRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      className={`${styles.container} ${darkMode ? 'dark-mode' : ''} ${windowMode === 'fullscreen-auto-hide' ? styles.zenMode : ''}`}
      style={{ position: 'relative', zIndex: 1 }}
    >
      {/* AppHeader 컴포넌트 추가 */}
      <AppHeader api={electronAPI} />
      
      {/* 자동 숨김 모드일 때 감지 영역 추가 */}
      {windowMode === 'fullscreen-auto-hide' && (
        <div 
          ref={headerDetectionRef}
          className={styles.headerDetectionArea}
          aria-hidden="true"
          style={{ pointerEvents: 'auto' }} 
        />
      )}
      
      <main className={styles.mainContent}>
        {children}
      </main>
      
      <AppFooter />
    </div>
  );
});

export default MainLayout;
