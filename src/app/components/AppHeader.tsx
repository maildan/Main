'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { WindowControls } from './WindowControls';
import styles from './AppHeader.module.css';
import Image from 'next/image';

interface AppHeaderProps {
  api?: any;
}

export const AppHeader = memo(function AppHeader({ api }: AppHeaderProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const [isAutoHide, setIsAutoHide] = useState(false);
  const lastMouseY = useRef(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mouseInsideHeader = useRef(false);

  // 창 모드 및 자동 숨김 모드 확인
  useEffect(() => {
    if (!api) return;
    
    // 현재 창 모드 가져오기
    const getWindowMode = async () => {
      try {
        if (api.getWindowMode) {
          const mode = await api.getWindowMode();
          setIsAutoHide(mode === 'fullscreen-auto-hide');
          
          // 자동 숨김 모드가 아닐 경우 항상 표시
          if (mode !== 'fullscreen-auto-hide') {
            setIsVisible(true);
          }
        }
      } catch (error) {
        console.error('창 모드 확인 오류:', error);
      }
    };
    
    getWindowMode();
    
    // 창 모드 변경 이벤트 리스너 설정
    const handleWindowModeChange = (event: CustomEvent<{mode: string}>) => {
      const mode = event.detail.mode;
      const shouldAutoHide = mode === 'fullscreen-auto-hide';
      setIsAutoHide(shouldAutoHide);
      
      // 자동 숨김 모드가 아닌 경우 항상 표시
      if (!shouldAutoHide) {
        setIsVisible(true);
      }
    };
    
    window.addEventListener('window-mode-changed' as any, handleWindowModeChange);
    
    return () => {
      window.removeEventListener('window-mode-changed' as any, handleWindowModeChange);
    };
  }, [api]);
  
  // 마우스 움직임 감지 및 도구모음 표시/숨김 처리
  useEffect(() => {
    if (!isAutoHide) {
      setIsVisible(true);
      return;
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      const { clientY } = e;
      
      // 마우스가 화면 상단 20px 이내에 있으면 도구모음 표시
      if (clientY < 20) {
        setIsVisible(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else if (clientY > 100 && isVisible && !mouseInsideHeader.current) {
        // 마우스가 헤더 영역을 벗어났고, 아래로 이동한 경우 타이머 설정
        if (!timeoutRef.current) {
          timeoutRef.current = setTimeout(() => {
            if (!mouseInsideHeader.current) {
              setIsVisible(false);
            }
            timeoutRef.current = null;
          }, 800); // 더 짧은 시간으로 조정
        }
      }
      
      lastMouseY.current = clientY;
    };
    
    // 헤더 위에 마우스가 있을 때 상태 관리
    const handleMouseEnter = () => {
      mouseInsideHeader.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsVisible(true);
    };
    
    const handleMouseLeave = () => {
      mouseInsideHeader.current = false;
      // 마우스가 헤더를 떠나면 타이머 설정
      if (isAutoHide && !timeoutRef.current) {
        timeoutRef.current = setTimeout(() => {
          setIsVisible(false);
          timeoutRef.current = null;
        }, 800);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    if (headerRef.current) {
      headerRef.current.addEventListener('mouseenter', handleMouseEnter);
      headerRef.current.addEventListener('mouseleave', handleMouseLeave);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (headerRef.current) {
        headerRef.current.removeEventListener('mouseenter', handleMouseEnter);
        headerRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAutoHide, isVisible]);

  return (
    <header 
      ref={headerRef}
      className={`${styles.appHeader} ${theme === 'dark' ? styles.darkMode : ''} ${isVisible ? styles.visible : styles.hidden} ${isAutoHide ? styles.autoHide : ''}`}
    >
      <div className={styles.leftSection}>
        <div className={styles.iconOnly}>
          <Image 
            src="/app-icon.svg" 
            alt=""
            width={24} 
            height={24} 
            priority 
          />
        </div>
      </div>
      
      <div className={styles.rightSection}>
        {api && <WindowControls />}
      </div>
    </header>
  );
});