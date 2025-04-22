import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BrowserInfo, AppType } from '../types';

/**
 * 브라우저 및 애플리케이션 감지 기능과 관련된 상태와 함수들을 제공하는 커스텀 훅
 * @returns 브라우저 및 애플리케이션 감지 관련 상태와 함수들
 */
export function useBrowserDetector() {
  // 상태
  const [activeBrowsers, setActiveBrowsers] = useState<BrowserInfo[]>([]);
  const [allBrowserWindows, setAllBrowserWindows] = useState<BrowserInfo[]>([]);
  const [allApplications, setAllApplications] = useState<BrowserInfo[]>([]);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoDetectionEnabled, setIsAutoDetectionEnabled] = useState<boolean>(false);
  const [detectionInterval, setDetectionInterval] = useState<number | null>(null);
  const [activeApp, setActiveApp] = useState<AppType>(AppType.None);

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
        setActiveApp(browsers[0].web_app);
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
   * 모든 애플리케이션 감지 (브라우저 + 바로가기 애플리케이션)
   */
  const findAllApplications = useCallback(async () => {
    try {
      setIsDetecting(true);
      setError(null);
      
      const apps = await invoke<BrowserInfo[]>('find_all_applications');
      setAllApplications(apps || []);
      
      // 전체 실행 중인 애플리케이션 목록 업데이트
      return apps || [];
    } catch (err) {
      console.error('애플리케이션 감지 중 오류 발생:', err);
      setError('애플리케이션 감지에 실패했습니다.');
      return [];
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
        findAllApplications(); // 모든 애플리케이션도 감지
      }, 3000); // 3초마다 감지
      
      setDetectionInterval(intervalId);
      setIsAutoDetectionEnabled(true);
    }
  }, [isAutoDetectionEnabled, detectionInterval, detectActiveBrowsers, findAllBrowserWindows, findAllApplications]);

  // 컴포넌트가 언마운트될 때 자동 감지 정리
  useEffect(() => {
    return () => {
      if (detectionInterval !== null) {
        clearInterval(detectionInterval);
      }
    };
  }, [detectionInterval]);

  /**
   * 특정 애플리케이션이 실행 중인지 확인
   * @param appType 검사할 애플리케이션 유형
   * @returns 해당 애플리케이션이 실행 중인지 여부
   */
  const isAppRunning = useCallback((appType: AppType): boolean => {
    return allApplications.some(app => app.web_app === appType);
  }, [allApplications]);

  /**
   * 현재 활성화된 애플리케이션 이름 가져오기
   */
  const getActiveAppName = useCallback((): string => {
    switch (activeApp) {
      // 웹 애플리케이션
      case AppType.GoogleDocs:
        return "Google 문서";
      case AppType.GoogleSheets:
        return "Google 스프레드시트";
      case AppType.GoogleSlides:
        return "Google 프레젠테이션";
      case AppType.Notion:
        return "Notion";
      case AppType.Trello:
        return "Trello";
      case AppType.GitHub:
        return "GitHub";
      case AppType.Gmail:
        return "Gmail";
      case AppType.YouTube:
        return "YouTube";
      
      // 오피스 애플리케이션
      case AppType.MicrosoftWord:
        return "Microsoft Word";
      case AppType.MicrosoftExcel:
        return "Microsoft Excel";
      case AppType.MicrosoftPowerPoint:
        return "Microsoft PowerPoint";
      case AppType.MicrosoftOneNote:
        return "Microsoft OneNote";
      
      // 코딩 애플리케이션
      case AppType.VSCode:
        return "Visual Studio Code";
      case AppType.IntelliJ:
        return "IntelliJ IDEA";
      case AppType.Eclipse:
        return "Eclipse";
      case AppType.AndroidStudio:
        return "Android Studio";
      
      // SNS 애플리케이션
      case AppType.KakaoTalk:
        return "카카오톡";
      case AppType.Discord:
        return "Discord";
      case AppType.Slack:
        return "Slack";
      case AppType.Telegram:
        return "Telegram";
      
      // 기타
      case AppType.Other:
        return "기타 앱";
      case AppType.None:
      default:
        return "없음";
    }
  }, [activeApp]);

  return {
    activeBrowsers,
    allBrowserWindows,
    allApplications,
    isDetecting,
    error,
    isAutoDetectionEnabled,
    activeApp,
    detectActiveBrowsers,
    findAllBrowserWindows,
    findAllApplications,
    toggleAutoDetection,
    isAppRunning,
    getActiveAppName
  };
}