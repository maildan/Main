import { useState, useEffect, useRef, useCallback } from 'react';

export interface AutoHideHeaderOptions {
  windowMode: string; 
  electronAPI: ElectronAPI | null;
}

export function useAutoHideHeader({ windowMode, electronAPI }: AutoHideHeaderOptions) {
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 자동 숨김 기능 처리 (윈도우 기본 헤더용)
  useEffect(() => {
    const isAutoHideMode = windowMode === 'fullscreen-auto-hide';
    
    if (!isAutoHideMode) {
      // 자동 숨김이 아닌 경우 항상 표시
      if (electronAPI && typeof electronAPI.windowControl === 'function') {
        // TypeScript 오류 해결 - 타입 단언 사용
        (electronAPI.windowControl as Function)('showHeader');
      }
      return;
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      const { clientY } = e;
      
      // 마우스가 화면 상단 100px 이내에 있을 때 헤더 표시
      if (clientY < 100) {
        setIsHeaderVisible(true);
        if (electronAPI && typeof electronAPI.windowControl === 'function') {
          (electronAPI.windowControl as Function)('showHeader');
        }
        
        if (autoHideTimeoutRef.current) {
          clearTimeout(autoHideTimeoutRef.current);
          autoHideTimeoutRef.current = null;
        }
      } else if (clientY > 150 && isHeaderVisible) {
        // 마우스가 아래로 이동했을 때 타이머 설정
        if (!autoHideTimeoutRef.current) {
          autoHideTimeoutRef.current = setTimeout(() => {
            setIsHeaderVisible(false);
            if (electronAPI && typeof electronAPI.windowControl === 'function') {
              (electronAPI.windowControl as Function)('hideHeader');
            }
            autoHideTimeoutRef.current = null;
          }, 1500);
        }
      }
    };
    
    // 캡처 옵션과 우선순위 높임
    window.addEventListener('mousemove', handleMouseMove, { 
      passive: true, 
      capture: true 
    });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove, { capture: true });
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
    };
  }, [windowMode, isHeaderVisible, electronAPI]);
  
  // 헤더 표시/숨김 설정을 위한 함수
  const setHeaderVisibility = useCallback((isVisible: boolean) => {
    setIsHeaderVisible(isVisible);
    if (electronAPI && typeof electronAPI.windowControl === 'function') {
      (electronAPI.windowControl as Function)(isVisible ? 'showHeader' : 'hideHeader');
    }
  }, [electronAPI]);

  return {
    isHeaderVisible,
    setHeaderVisibility
  };
}
