'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { WindowControls } from './WindowControls';
import styles from './CustomHeader.module.css';
import Image from 'next/image';

interface CustomHeaderProps {
  darkMode: boolean;
  windowMode: string;
}

export const CustomHeader = memo(function CustomHeader({ 
  darkMode, 
  windowMode 
}: CustomHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAutoHide, setIsAutoHide] = useState(windowMode === 'fullscreen-auto-hide');
  const headerRef = useRef<HTMLDivElement>(null);
  const detectionAreaRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mouseInsideHeader = useRef(false);
  
  // 창 모드에 따른 자동 숨김 활성화 여부 설정
  useEffect(() => {
    setIsAutoHide(windowMode === 'fullscreen-auto-hide');
    if (windowMode !== 'fullscreen-auto-hide') {
      setIsVisible(true);
    }
  }, [windowMode]);
  
  // 마우스 움직임 감지 및 도구모음 표시/숨김 처리
  useEffect(() => {
    if (!isAutoHide) {
      setIsVisible(true);
      return;
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      const { clientY } = e;
      
      // 마우스가 화면 상단 10px 이내에 있으면 도구모음 표시
      if (clientY < 10) {
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
          }, 600); // 더 짧은 시간으로 조정
        }
      }
    };
    
    // 감지 영역에 마우스가 들어올 때 헤더 표시
    const handleDetectionAreaEnter = () => {
      if (isAutoHide) {
        setIsVisible(true);
      }
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
        }, 600);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    if (headerRef.current) {
      headerRef.current.addEventListener('mouseenter', handleMouseEnter);
      headerRef.current.addEventListener('mouseleave', handleMouseLeave);
    }
    
    if (detectionAreaRef.current) {
      detectionAreaRef.current.addEventListener('mouseenter', handleDetectionAreaEnter);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (headerRef.current) {
        headerRef.current.removeEventListener('mouseenter', handleMouseEnter);
        headerRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
      
      if (detectionAreaRef.current) {
        detectionAreaRef.current.removeEventListener('mouseenter', handleDetectionAreaEnter);
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isAutoHide, isVisible]);

  // 감지 영역은 항상 렌더링
  return (
    <>
      {isAutoHide && (
        <div 
          ref={detectionAreaRef}
          className={styles.headerDetectionArea}
        />
      )}
      <header 
        ref={headerRef}
        className={`${styles.customHeader} ${darkMode ? styles.darkMode : ''} ${isVisible ? styles.visible : styles.hidden}`}
      >
        <div className={styles.dragArea}>
          <div className={styles.leftSection}>
            <div className={styles.iconOnly}>
              <Image 
                src="/app-icon.svg" 
                alt=""
                width={32}
                height={32}
                priority 
              />
            </div>
            <h4 className={styles.appTitle}>타이핑 통계</h4>
          </div>
        </div>
        
        <div className={styles.rightSection}>
          <WindowControls />
        </div>
      </header>
    </>
  );
});
