'use client';

import React, { useState, useEffect } from 'react';
import { AppHeader } from './AppHeader';
import ClientSideControls from './ClientSideControls';
import { ToastProvider } from './ToastContext';
import { ThemeProvider } from './ThemeProvider';

interface MainLayoutProps {
  children: React.ReactNode;
  darkMode: boolean;
  windowMode: 'windowed' | 'fullscreen' | 'fullscreen-auto-hide';
  electronAPI: any;
  isHeaderVisible: boolean;
}

export function MainLayout({ 
  children, 
  darkMode, 
  windowMode, 
  electronAPI, 
  isHeaderVisible 
}: MainLayoutProps) {
  // 다크모드 설정
  const [isDarkMode, setIsDarkMode] = useState(false);
  // 윈도우 모드 설정
  const [currentWindowMode, setCurrentWindowMode] = useState<'windowed' | 'fullscreen' | 'fullscreen-auto-hide'>('windowed');

  // 초기 설정 로드
  useEffect(() => {
    // 로컬 스토리지에서 설정 로드
    try {
      const savedSettings = localStorage.getItem('app_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setIsDarkMode(parsedSettings.darkMode || false);
        setCurrentWindowMode(parsedSettings.windowMode || 'windowed');
        
        // 다크모드 클래스 적용
        if (parsedSettings.darkMode) {
          document.documentElement.classList.add('dark-mode');
        } else {
          document.documentElement.classList.remove('dark-mode');
        }
        
        // 전체화면 모드 설정 적용
        if (window.electronAPI && typeof window.electronAPI.setWindowMode === 'function') {
          window.electronAPI.setWindowMode(parsedSettings.windowMode || 'windowed');
        }
      }
    } catch (error) {
      console.error('설정 로드 중 오류:', error);
    }
  }, []);
  
  // 다크모드 변경 핸들러
  const handleDarkModeChange = (enabled: boolean) => {
    setIsDarkMode(enabled);
    
    if (enabled) {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
    
    // Electron API를 통해 네이티브 테마 설정 전달
    if (window.electronAPI && typeof window.electronAPI.setDarkMode === 'function') {
      window.electronAPI.setDarkMode(enabled);
    }
  };
  
  // 윈도우 모드 변경 핸들러
  const handleWindowModeChange = (mode: 'windowed' | 'fullscreen' | 'fullscreen-auto-hide') => {
    setCurrentWindowMode(mode);
    
    // Electron API를 통해 창 모드 설정
    if (window.electronAPI && typeof window.electronAPI.setWindowMode === 'function') {
      window.electronAPI.setWindowMode(mode);
    }
  };
  
  return (
    <ThemeProvider>
      <ToastProvider>
        <div 
          className={`app-layout ${isDarkMode ? 'dark-theme' : 'light-theme'}`}
          data-window-mode={currentWindowMode}
        >
          {/* OS 네이티브 도구모음을 사용하도록 커스텀 헤더는 조건부 렌더링 */}
          {windowMode === 'fullscreen-auto-hide' && (
            <AppHeader 
              api={electronAPI}
              isVisible={isHeaderVisible}
              autoHide={true}
            />
          )}
          
          <main className="content-area" style={{ 
            paddingTop: windowMode === 'fullscreen-auto-hide' ? '0' : '10px', // 네이티브 타이틀바 사용 시 패딩 조정 
            height: '100%',
            overflow: 'auto'
          }}>
            <ClientSideControls
              darkMode={isDarkMode}
              onDarkModeChange={handleDarkModeChange}
              windowMode={currentWindowMode}
              onWindowModeChange={handleWindowModeChange}
            >
              {children}
            </ClientSideControls>
          </main>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default MainLayout;
