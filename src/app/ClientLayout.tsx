'use client';

import { useEffect, useState } from 'react';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    // 컴포넌트가 마운트된 후에만 실행 (하이드레이션 불일치 방지)
    setMounted(true);
    
    // 다크 모드 감지
    try {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(prefersDark.matches);
      
      // 다크 모드 변경 감지
      const darkModeListener = (e: MediaQueryListEvent) => {
        setIsDarkMode(e.matches);
      };
      prefersDark.addEventListener('change', darkModeListener);
      
      // 저장된 다크 모드 설정 불러오기
      try {
        const settings = localStorage.getItem('app-settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          if (parsed.darkMode !== undefined) {
            setIsDarkMode(parsed.darkMode);
          }
        }
      } catch (err) {
        console.warn('설정 로드 실패:', err);
      }
      
      return () => {
        prefersDark.removeEventListener('change', darkModeListener);
      };
    } catch (error) {
      console.error('클라이언트 레이아웃 초기화 오류:', error);
    }
  }, []);
  
  // 하이드레이션 불일치를 방지하기 위해 마운트 전에는 단순 렌더링
  if (!mounted) {
    return <>{children}</>;
  }
  
  // 마운트 후 다크 모드 클래스 설정
  if (isDarkMode) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
  
  return <>{children}</>;
}