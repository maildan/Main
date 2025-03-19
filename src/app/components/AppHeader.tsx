'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';
import { WindowControls } from './WindowControls';
import styles from './AppHeader.module.css';
import Image from 'next/image';

interface AppHeaderProps {
  api: any;
  isVisible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  autoHide?: boolean;
}

export const AppHeader = memo(function AppHeader({ 
  api, 
  isVisible = true, 
  onVisibilityChange,
  autoHide = false
}: AppHeaderProps) {
  const { theme } = useTheme();
  const [visibility, setVisibility] = useState(isVisible);
  const lastMouseY = useRef(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mouseInsideHeader = useRef(false);

  // 가시성 상태가 props로 전달되면 내부 상태 업데이트
  useEffect(() => {
    setVisibility(isVisible);
  }, [isVisible]);

  // 자동 숨김 모드일 때 마우스 이벤트 처리
  useEffect(() => {
    if (!autoHide) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const currentY = e.clientY;
      
      // 마우스가 화면 상단에 가까우면 헤더 표시
      if (currentY < 20 && !visibility) {
        setVisibility(true);
        if (onVisibilityChange) onVisibilityChange(true);
      } 
      // 마우스가 헤더 영역을 벗어나고 헤더 영역 밖에서 충분히 내려가면 헤더 숨김
      else if (currentY > 80 && !mouseInsideHeader.current && visibility) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        
        timeoutRef.current = setTimeout(() => {
          setVisibility(false);
          if (onVisibilityChange) onVisibilityChange(false);
          
          timeoutRef.current = null;
        }, 1000); // 1초 후에 숨김
      }
      
      lastMouseY.current = currentY;
    };
    
    // 마우스가 헤더 영역 안에 있는지 추적
    const handleHeaderMouseEnter = () => {
      mouseInsideHeader.current = true;
      // 헤더 내에 있을 때 예약된 숨김 취소
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    
    const handleHeaderMouseLeave = () => {
      mouseInsideHeader.current = false;
    };
    
    // 이벤트 리스너 등록
    document.addEventListener('mousemove', handleMouseMove);
    
    const headerElement = headerRef.current;
    if (headerElement) {
      headerElement.addEventListener('mouseenter', handleHeaderMouseEnter);
      headerElement.addEventListener('mouseleave', handleHeaderMouseLeave);
    }
    
    // 클린업
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      
      if (headerElement) {
        headerElement.removeEventListener('mouseenter', handleHeaderMouseEnter);
        headerElement.removeEventListener('mouseleave', handleHeaderMouseLeave);
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [autoHide, visibility, onVisibilityChange]);

  // 헤더가 숨겨진 상태에서 클릭 이벤트가 발생하면 표시
  useEffect(() => {
    if (!autoHide) return;
    
    const handleClick = () => {
      if (!visibility) {
        setVisibility(true);
        if (onVisibilityChange) onVisibilityChange(true);
      }
    };
    
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [autoHide, visibility, onVisibilityChange]);

  return (
    <div 
      ref={headerRef}
      className={`${styles.header} ${visibility ? '' : styles.hidden} ${theme === 'dark' ? styles.darkMode : ''}`}
    >
      <div className={styles.titleBar}>
        <div className={styles.appIcon}>
          {/* 앱 아이콘 (선택사항) */}
          <Image 
            src="/app-icon.png" 
            alt="App Icon"
            width={24}
            height={24}
            onError={(e) => {
              // 이미지 로드 실패 시 처리
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <div className={styles.appTitle}>타이핑 통계 앱</div>
        <WindowControls api={api} />
      </div>
    </div>
  );
});