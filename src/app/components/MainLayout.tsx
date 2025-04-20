'use client';

import React from 'react';
import ClientSideControls from './ClientSideControls';
import { ToastProvider } from './ToastContext';
import { ThemeProvider } from './ThemeProvider';
import CustomHeader from './CustomHeader';
import { useTheme } from './ThemeProvider';
import { useAutoHideHeader } from '../hooks/useAutoHideHeader';

interface MainLayoutProps {
  children: React.ReactNode;
  _darkMode: boolean;
  toggleDarkMode: () => void;
  windowMode?: 'windowed' | 'fullscreen' | 'fullscreen-auto-hide';
  electronAPI?: any;
  isHeaderVisible?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  _darkMode,
  toggleDarkMode,
  windowMode = 'windowed',
  electronAPI = null,
  // isHeaderVisible = true // useAutoHideHeader 훅에서 관리
}): React.ReactNode => {
  // const api = electronAPI || window.electronAPI || {}; // window.electronAPI 사용 방식 변경 (훅 사용 권장)
  const { theme } = useTheme(); // useTheme 훅 사용
  const { isHeaderVisible, setHeaderVisibility } = useAutoHideHeader({ windowMode, electronAPI }); // 훅 사용 방식 변경 및 타입 제거

  // electronAPI는 Context 또는 props로 주입받는 것이 좋음
  const api = electronAPI;

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className={`layout-container ${theme}`}>
          <CustomHeader api={api} isVisible={isHeaderVisible} _onVisibilityChange={setHeaderVisibility} />
          <main className="main-content">{children}</main>
          {/* Footer 등 다른 공통 요소 추가 가능 */}
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default MainLayout;
