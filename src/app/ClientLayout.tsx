'use client';

import { useState, useEffect } from 'react';

export function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    // 로컬 스토리지에서 다크 모드 설정 불러오기
    const loadDarkModeFromStorage = () => {
      try {
        const savedSettings = localStorage.getItem('app-settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setDarkMode(settings.darkMode || false);
        }
      } catch (e) {
        console.error('설정 파싱 오류:', e);
      }
    };
    
    loadDarkModeFromStorage();
    
    // 이벤트 리스너 설정
    const handleDarkModeChange = (e: CustomEvent) => {
      setDarkMode(e.detail.enabled);
    };
    
    window.addEventListener('darkModeChanged', handleDarkModeChange as EventListener);
    
    return () => {
      window.removeEventListener('darkModeChanged', handleDarkModeChange as EventListener);
    };
  }, []);

  return (
    <div data-theme={darkMode ? 'dark' : 'light'}>
      {children}
    </div>
  );
}