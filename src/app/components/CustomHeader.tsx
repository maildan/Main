'use client';

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
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
  const lastInteractionTime = useRef(Date.now());
  const promptShown = useRef(false);
  
  // 창 모드에 따른 자동 숨김 활성화 여부 설정
  useEffect(() => {
    setIsAutoHide(windowMode === 'fullscreen-auto-hide');
    if (windowMode !== 'fullscreen-auto-hide') {
      setIsVisible(true);
    }
  }, [windowMode]);
  
  // 마우스 감지 영역 이벤트 핸들러를 메모이제이션
  const handleDetectionAreaEnter = useCallback(() => {
    if (isAutoHide) {
      setIsVisible(true);
      lastInteractionTime.current = Date.now();
      promptShown.current = false;
    }
  }, [isAutoHide]);
  
  // 헤더 마우스 이벤트 핸들러를 메모이제이션
  const handleMouseEnter = useCallback(() => {
    mouseInsideHeader.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(true);
    lastInteractionTime.current = Date.now();
    promptShown.current = false;
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    mouseInsideHeader.current = false;
    // 마우스가 헤더를 떠나면 타이머 설정
    if (isAutoHide && !timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        timeoutRef.current = null;
      }, 600);
    }
  }, [isAutoHide]);

  // 마우스 움직임 감지 함수를 메모이제이션
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { clientY } = e;
    const currentTime = Date.now();
    
    // 마지막 상호작용으로부터 2초 이상 지났을 때만 처리 (반복 메시지 방지)
    if (currentTime - lastInteractionTime.current < 2000) {
      return;
    }
    
    // 마우스가 화면 상단 10px 이내에 있으면 도구모음 표시
    if (clientY < 10) {
      setIsVisible(true);
      lastInteractionTime.current = currentTime;
      promptShown.current = false;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else if (clientY > 100 && isVisible && !mouseInsideHeader.current) {
      // 마우스가 헤더 영역을 벗어났고, 아래로 이동한 경우 타이머 설정
      if (!timeoutRef.current && !promptShown.current) {
        timeoutRef.current = setTimeout(() => {
          if (!mouseInsideHeader.current) {
            setIsVisible(false);
            // 한 번만 프롬프트를 표시하기 위한 플래그 설정
            promptShown.current = true;
          }
          timeoutRef.current = null;
        }, 600);
      }
    }
  }, [isVisible]);
  
  // 마우스 움직임 감지 및 도구모음 표시/숨김 처리 최적화
  useEffect(() => {
    if (!isAutoHide) {
      setIsVisible(true);
      return;
    }
    
    // passive 옵션을 true로 설정하여 성능 향상
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
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
  }, [isAutoHide, handleMouseMove, handleMouseEnter, handleMouseLeave, handleDetectionAreaEnter]);

  return (
    <>
      {isAutoHide && (
        <div 
          ref={detectionAreaRef}
          className={styles.headerDetectionArea}
          aria-hidden="true"
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
          src="/loop-icon.svg"
          alt="Loop 아이콘"
          width={24}
          height={24}
          priority
          loading="eager"
          onError={(e) => {
            // 아이콘 로드 실패 시 대체 아이콘 사용
            const imgElement = e.target as HTMLImageElement;
            imgElement.src = '/app_icon.webp';
          }}
              />
            </div>
            <h4 className={styles.appTitle}>loop</h4>
          </div>
        </div>
        
        <div className={styles.rightSection}>
          <WindowControls api={window.electronAPI} />
        </div>
      </header>
    </>
  );
});
