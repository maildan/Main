import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BrowserInfo, WebAppType } from '../types';

/**
 * 브라우저 감지 기능과 관련된 상태와 함수들을 제공하는 커스텀 훅
 * @returns 브라우저 감지 관련 상태와 함수들
 */
export function useBrowserDetector() {
  // 상태
  const [activeBrowsers, setActiveBrowsers] = useState<BrowserInfo[]>([]);
  const [allBrowserWindows, setAllBrowserWindows] = useState<BrowserInfo[]>([]);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoDetectionEnabled, setIsAutoDetectionEnabled] = useState<boolean>(false);
  const [detectionInterval, setDetectionInterval] = useState<number | null>(null);
  const [activeWebApp, setActiveWebApp] = useState<WebAppType>(WebAppType.None);

  /**
   * 현재 활성화된 브라우저 감지
   */
  const detectActiveBrowsers = useCallback(async () => {
    try {
      setIsDetecting(true);
      setError(null);
      
      const browsers = await invoke<BrowserInfo[]>('detect_active_browsers');
      setActiveBrowsers(browsers || []);
      
      // 활성화된 웹 애플리케이션 감지
      if (browsers && browsers.length > 0) {
        setActiveWebApp(browsers[0].web_app);
        await invoke('log_browser_activity');
      }
    } catch (err) {
      console.error('브라우저 감지 중 오류 발생:', err);
      setError('브라우저 감지에 실패했습니다.');
    } finally {
      setIsDetecting(false);
    }
  }, []);

  /**
   * 모든 브라우저 창 감지
   */
  const findAllBrowserWindows = useCallback(async () => {
    try {
      setIsDetecting(true);
      setError(null);
      
      const browsers = await invoke<BrowserInfo[]>('find_all_browser_windows');
      setAllBrowserWindows(browsers || []);
    } catch (err) {
      console.error('브라우저 창 감지 중 오류 발생:', err);
      setError('브라우저 창 감지에 실패했습니다.');
    } finally {
      setIsDetecting(false);
    }
  }, []);

  /**
   * 자동 감지 활성화/비활성화 토글
   */
  const toggleAutoDetection = useCallback(() => {
    if (isAutoDetectionEnabled) {
      // 자동 감지 비활성화
      if (detectionInterval !== null) {
        clearInterval(detectionInterval);
        setDetectionInterval(null);
      }
      setIsAutoDetectionEnabled(false);
    } else {
      // 자동 감지 활성화
      const intervalId = window.setInterval(() => {
        detectActiveBrowsers();
        findAllBrowserWindows();
      }, 3000); // 3초마다 감지
      
      setDetectionInterval(intervalId);
      setIsAutoDetectionEnabled(true);
    }
  }, [isAutoDetectionEnabled, detectionInterval, detectActiveBrowsers, findAllBrowserWindows]);

  // 컴포넌트가 언마운트될 때 자동 감지 정리
  useEffect(() => {
    return () => {
      if (detectionInterval !== null) {
        clearInterval(detectionInterval);
      }
    };
  }, [detectionInterval]);

  /**
   * 특정 웹 애플리케이션이 활성화되어 있는지 확인
   */
  const isWebAppActive = useCallback((appType: WebAppType): boolean => {
    return activeWebApp === appType;
  }, [activeWebApp]);

  /**
   * 현재 활성화된 웹 애플리케이션 이름 가져오기
   */
  const getActiveWebAppName = useCallback((): string => {
    switch (activeWebApp) {
      case WebAppType.GoogleDocs:
        return "Google 문서";
      case WebAppType.GoogleSheets:
        return "Google 스프레드시트";
      case WebAppType.GoogleSlides:
        return "Google 프레젠테이션";
      case WebAppType.Notion:
        return "Notion";
      case WebAppType.Trello:
        return "Trello";
      case WebAppType.GitHub:
        return "GitHub";
      case WebAppType.Gmail:
        return "Gmail";
      case WebAppType.YouTube:
        return "YouTube";
      case WebAppType.Other:
        return "기타 웹사이트";
      case WebAppType.None:
      default:
        return "없음";
    }
  }, [activeWebApp]);

  return {
    activeBrowsers,
    allBrowserWindows,
    isDetecting,
    error,
    isAutoDetectionEnabled,
    activeWebApp,
    detectActiveBrowsers,
    findAllBrowserWindows,
    toggleAutoDetection,
    isWebAppActive,
    getActiveWebAppName
  };
}