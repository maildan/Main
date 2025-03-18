'use client';

import { memo } from 'react';
import { useTheme } from './ThemeProvider';
import { WindowControls } from './WindowControls';
import styles from './AppHeader.module.css';

// AppHeader props 타입 정의
interface AppHeaderProps {
  api?: any; // ElectronAPI 타입 대신 any 사용하여 타입 충돌 해결
}

// AppHeader 컴포넌트
export const AppHeader = memo(function AppHeader({ api }: AppHeaderProps) {
  const { theme } = useTheme();
  
  return (
    <header className={`${styles.appHeader} ${theme === 'dark' ? styles.darkMode : ''}`}>
      <div className={styles.leftSection}>
        <div className={styles.appTitle}>
          <h1>타이핑 통계 앱</h1>
        </div>
      </div>
      
      <div className={styles.rightSection}>
        {/* API가 있을 때만 WindowControls 표시 */}
        {api && <WindowControls />}
      </div>
    </header>
  );
});