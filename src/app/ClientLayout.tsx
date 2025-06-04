'use client';

import { useEffect, useState } from 'react';
import { ToastProvider } from './components/ToastContext';
import HydrationFix from './components/HydrationFix';
import { DynamicPermissionBanner } from './components/dynamic-components';

type ClientLayoutProps = {
  children: React.ReactNode;
};

export default function ClientLayout({ children }: ClientLayoutProps) {
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // 로컬 스토리지에서 다크 모드 설정을 가져오는 함수
  function getStoredDarkModeSetting(): boolean | null {
    try {
      const settings = localStorage.getItem('app-settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.darkMode !== undefined) {
          return parsed.darkMode;
        }
      }
      return null; // 설정이 없음
    } catch (err) {
      console.warn('설정 로드 실패:', err);
      return null;
    }
  }
  
  useEffect(() => {
    // 컴포넌트가 마운트된 후에만 실행 (하이드레이션 불일치 방지)
    setMounted(true);
    
    // 다크 모드 감지
    try {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      const savedDarkMode = getStoredDarkModeSetting();
      
      // 로컬 스토리지 설정이 있으면 그 값 사용, 없으면 시스템 설정 사용
      const shouldUseDarkMode = savedDarkMode !== null ? savedDarkMode : prefersDark.matches;
      setIsDarkMode(shouldUseDarkMode);
      
      // 다크 모드 설정을 HTML에 적용
      if (shouldUseDarkMode) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
      
      // 시스템 다크 모드 변경 감지
      const darkModeListener = (e: MediaQueryListEvent) => {
        // 저장된 설정이 없을 때만 시스템 설정 따름
        if (getStoredDarkModeSetting() === null) {
          setIsDarkMode(e.matches);
          
          if (e.matches) {
            document.documentElement.classList.add('dark-mode');
          } else {
            document.documentElement.classList.remove('dark-mode');
          }
        }
      };
      
      prefersDark.addEventListener('change', darkModeListener);
      return () => prefersDark.removeEventListener('change', darkModeListener);
    } catch (e) {
      console.warn('다크 모드 감지 실패:', e);
    }
  }, []);
  
  // isDarkMode 상태 변경에 따른 다크 모드 클래스 설정
  useEffect(() => {
    // mounted 상태일 때만 DOM을 조작합니다
    if (mounted) {
      if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    }
  }, [isDarkMode, mounted]);
  
  // 하이드레이션 불일치를 방지하기 위한 조건부 렌더링
  return (
    <div className={`app-layout ${isDarkMode ? 'dark' : 'light'}`}>
      {mounted && <DynamicPermissionBanner />}
      <HydrationFix />
      <ToastProvider>
        {children}
      </ToastProvider>
    </div>
  );
}