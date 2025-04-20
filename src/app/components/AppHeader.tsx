'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './AppHeader.module.css';
import { useTheme } from './ThemeProvider';
import ThemeToggle from './ThemeToggle';

interface AppHeaderProps {
  title?: string;
  isVisible?: boolean;
  autoHide?: boolean;
  electronAPI?: any;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export function AppHeader({
  title = 'loop',
  isVisible = true,
  autoHide = false,
  electronAPI,
  onMinimize,
  onMaximize,
  onClose
}: AppHeaderProps) {
  const { isDarkMode } = useTheme(); // ThemeProvider에서 다크모드 상태 가져오기
  const [showMenu, setShowMenu] = useState('');
  const [headerVisible, setHeaderVisible] = useState(isVisible);
  const [hoverDetected, setHoverDetected] = useState(false);
  const [isOSWindows, setIsOSWindows] = useState(false);

  // OS 타입 감지
  useEffect(() => {
    // Electron 환경에서는 process.platform 사용
    if (typeof window !== 'undefined') {
      if (window.navigator.platform.indexOf('Win') > -1) {
        setIsOSWindows(true);
      } else if (electronAPI && electronAPI.getPlatform) {
        electronAPI.getPlatform().then((platform: string) => {
          setIsOSWindows(platform === 'win32');
        }).catch((error: any) => {
          console.error('플랫폼 정보 가져오기 실패:', error);
          // 브라우저 정보로 대체
          setIsOSWindows(window.navigator.platform.indexOf('Win') > -1);
        });
      }
    }
  }, [electronAPI]);

  // 메뉴 토글 핸들러
  const toggleMenu = (menu: string) => {
    if (showMenu === menu) {
      setShowMenu('');
    } else {
      setShowMenu(menu);
    }
  };

  // 헤더 숨기기 타이머
  useEffect(() => {
    let hideTimer: NodeJS.Timeout | null = null;

    if (autoHide && !hoverDetected && headerVisible) {
      hideTimer = setTimeout(() => {
        setHeaderVisible(false);
      }, 3000);
    }

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [autoHide, hoverDetected, headerVisible]);

  // 마우스 감지 영역에 대한 처리
  const handleMouseEnter = useCallback(() => {
    setHoverDetected(true);
    setHeaderVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverDetected(false);
  }, []);

  // 클릭 이벤트 핸들러
  const handleMinimize = useCallback(() => {
    if (electronAPI && electronAPI.windowControl) {
      try {
        electronAPI.windowControl('minimize');
      } catch (error) {
        console.error('최소화 중 오류:', error);
      }
    } else if (onMinimize) {
      onMinimize();
    }
  }, [electronAPI, onMinimize]);

  const handleMaximize = useCallback(() => {
    if (electronAPI && electronAPI.windowControl) {
      try {
        electronAPI.windowControl('maximize');
      } catch (error) {
        console.error('최대화 중 오류:', error);
      }
    } else if (onMaximize) {
      onMaximize();
    }
  }, [electronAPI, onMaximize]);

  const handleClose = useCallback(() => {
    if (electronAPI && electronAPI.windowControl) {
      try {
        electronAPI.windowControl('close');
      } catch (error) {
        console.error('닫기 중 오류:', error);
      }
    } else if (onClose) {
      onClose();
    }
  }, [electronAPI, onClose]);

  // 설정 메뉴 핸들러
  const handleSettings = useCallback(() => {
    // 설정 페이지로 이동 또는 설정 모달 열기
    setShowMenu(''); // 메뉴 닫기

    // Electron API로 설정 열기 (있는 경우)
    if (electronAPI && electronAPI.onSwitchTab) {
      electronAPI.onSwitchTab('settings');
    } else {
      // 브라우저 환경에서는 설정 페이지로 이동
      window.location.href = '/settings';
    }
  }, [electronAPI]);

  // 앱 다시 시작 핸들러
  const handleRestart = useCallback(() => {
    setShowMenu('');
    if (electronAPI && electronAPI.restartApp) {
      electronAPI.restartApp();
    } else {
      // 브라우저 환경이라면 새로고침
      window.location.reload();
    }
  }, [electronAPI]);

  // 문서화된 키보드 단축키 핸들러
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+F4 종료 감지
      if (e.key === 'F4' && e.altKey) {
        if (electronAPI && electronAPI.windowControl) {
          electronAPI.windowControl('close');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [electronAPI]);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMenu && !(e.target as HTMLElement).closest(`.${styles.menuItem}`)) {
        setShowMenu('');
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  // 다크 모드 클래스 계산
  const headerClass = `${styles.appHeader} ${isDarkMode ? styles.darkMode : ''} ${headerVisible ? styles.visible : styles.hidden} ${autoHide ? styles.autoHide : ''}`;

  return (
    <>
      {autoHide && !headerVisible && (
        <div
          className={styles.headerDetectionArea}
          onMouseEnter={handleMouseEnter}
        />
      )}
      <header
        className={headerClass}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 좌측: 메뉴 */}
        <div className={styles.leftControls}>
          <nav className={styles.menuBar}>
            <div className={styles.menuItem}>
              <div
                className={`${styles.menuLabel} ${showMenu === 'file' ? styles.activeMenu : ''}`}
                onClick={() => toggleMenu('file')}
              >
                파일
              </div>
              {showMenu === 'file' && (
                <div className={styles.menuDropdown}>
                  <div className={styles.menuDropdownItem} onClick={handleSettings}>
                    <span>설정</span>
                    <span className={styles.shortcut}>Ctrl+,</span>
                  </div>
                  <div className={styles.menuSeparator} />
                  <div className={styles.menuDropdownItem} onClick={handleClose}>
                    <span>종료</span>
                    <span className={styles.shortcut}>Alt+F4</span>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.menuItem}>
              <div
                className={`${styles.menuLabel} ${showMenu === 'edit' ? styles.activeMenu : ''}`}
                onClick={() => toggleMenu('edit')}
              >
                편집
              </div>
              {showMenu === 'edit' && (
                <div className={styles.menuDropdown}>
                  <div className={styles.menuDropdownItem}>
                    <span>실행 취소</span>
                    <span className={styles.shortcut}>Ctrl+Z</span>
                  </div>
                  <div className={styles.menuDropdownItem}>
                    <span>다시 실행</span>
                    <span className={styles.shortcut}>Ctrl+Y</span>
                  </div>
                  <div className={styles.menuSeparator} />
                  <div className={styles.menuDropdownItem}>
                    <span>복사</span>
                    <span className={styles.shortcut}>Ctrl+C</span>
                  </div>
                  <div className={styles.menuDropdownItem}>
                    <span>붙여넣기</span>
                    <span className={styles.shortcut}>Ctrl+V</span>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.menuItem}>
              <div
                className={`${styles.menuLabel} ${showMenu === 'help' ? styles.activeMenu : ''}`}
                onClick={() => toggleMenu('help')}
              >
                도움말
              </div>
              {showMenu === 'help' && (
                <div className={styles.menuDropdown}>
                  <div className={styles.menuDropdownItem}>
                    <span>도움말 보기</span>
                    <span className={styles.shortcut}>F1</span>
                  </div>
                  <div className={styles.menuSeparator} />
                  <div className={styles.menuDropdownItem} onClick={handleRestart}>
                    <span>앱 다시 시작</span>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* 중앙: 타이틀 */}
        <div className={styles.titleBar}>
          <div className={styles.title}>{title}</div>
        </div>

        {/* 우측: 윈도우 컨트롤 버튼 - 윈도우 OS에서는 네이티브 컨트롤 사용하지 않음 */}
        <div className={styles.rightControls}>
          <div className={styles.themeToggleWrapper}>
            <ThemeToggle compact={true} />
          </div>
          {!isOSWindows && (
            <div className={styles.windowControls}>
              <button
                className={styles.controlButton}
                onClick={handleMinimize}
                aria-label="최소화"
              >
                &#x2212;
              </button>
              <button
                className={styles.controlButton}
                onClick={handleMaximize}
                aria-label="최대화"
              >
                &#x25A1;
              </button>
              <button
                className={`${styles.controlButton} ${styles.closeButton}`}
                onClick={handleClose}
                aria-label="닫기"
              >
                &#x2715;
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}