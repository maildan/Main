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

  useEffect(() => {
    setVisibility(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (!autoHide) return;
    const handleMouseMove = (e: MouseEvent) => {
      const currentY = e.clientY;
      if (currentY < 20 && !visibility) {
        setVisibility(true);
        onVisibilityChange && onVisibilityChange(true);
      } else if (currentY > 80 && !mouseInsideHeader.current && visibility) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setVisibility(false);
          onVisibilityChange && onVisibilityChange(false);
          timeoutRef.current = null;
        }, 1000);
      }
      lastMouseY.current = currentY;
    };
    
    const handleHeaderMouseEnter = () => {
      mouseInsideHeader.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    const handleHeaderMouseLeave = () => {
      mouseInsideHeader.current = false;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    const headerElement = headerRef.current;
    if (headerElement) {
      headerElement.addEventListener('mouseenter', handleHeaderMouseEnter);
      headerElement.addEventListener('mouseleave', handleHeaderMouseLeave);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (headerElement) {
        headerElement.removeEventListener('mouseenter', handleHeaderMouseEnter);
        headerElement.removeEventListener('mouseleave', handleHeaderMouseLeave);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [autoHide, visibility, onVisibilityChange]);
  
  useEffect(() => {
    if (!autoHide) return;
    const handleClick = () => {
      if (!visibility) {
        setVisibility(true);
        onVisibilityChange && onVisibilityChange(true);
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
      className={`${styles.header} ${!visibility ? styles.hidden : ''} ${theme === 'dark' ? styles.darkMode : ''}`}
      aria-hidden={!visibility}
    >
      <div className={styles.titleBar}>
        <div className={styles.appIcon}>
          <Image 
            src="/app-icon.png" 
            alt="App Icon"
            width={24}
            height={24}
            onError={(e) => {
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