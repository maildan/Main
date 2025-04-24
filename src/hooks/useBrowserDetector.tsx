import { useState, useEffect, useCallback, useRef } from 'react';
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
  
  // 현재 활성화된 애플리케이션 (브라우저 + 바로가기 앱)
  const [currentActiveApplication, setCurrentActiveApplication] = useState<BrowserInfo | null>(null);
  
  // 성능 최적화를 위한 마지막 감지 시간 참조
  const lastDetectionRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);

  /**
   * 현재 활성화된 브라우저 감지
   */
  const detectActiveBrowsers = useCallback(async () => {
    try {
      const browsers = await invoke<BrowserInfo[]>('detect_active_browsers');
      setActiveBrowsers(browsers || []);
      
      // 활성화된 웹 애플리케이션 감지
      if (browsers && browsers.length > 0) {
        setActiveApp(browsers[0].web_app);
        await invoke('log_browser_activity');
      }
      return browsers;
    } catch (err) {
      console.error('브라우저 감지 중 오류 발생:', err);
      setError('브라우저 감지에 실패했습니다.');
      return [];
    }
  }, []);

  /**
   * 모든 브라우저 창 감지
   */
  const findAllBrowserWindows = useCallback(async () => {
    try {
      const browsers = await invoke<BrowserInfo[]>('find_all_browser_windows');
      setAllBrowserWindows(browsers || []);
      return browsers;
    } catch (err) {
      console.error('브라우저 창 감지 중 오류 발생:', err);
      setError('브라우저 창 감지에 실패했습니다.');
      return [];
    }
  }, []);
  
  /**
   * 모든 애플리케이션 감지 (브라우저 + 바로가기 애플리케이션)
   */
  const findAllApplications = useCallback(async () => {
    try {
      const apps = await invoke<BrowserInfo[]>('find_all_applications');
      setAllApplications(apps || []);
      return apps || [];
    } catch (err) {
      console.error('애플리케이션 감지 중 오류 발생:', err);
      setError('애플리케이션 감지에 실패했습니다.');
      return [];
    }
  }, []);

  /**
   * 현재 활성화된 애플리케이션 감지 (브라우저 또는 바로가기 앱)
   */
  const detectActiveApplication = useCallback(async () => {
    try {
      const app = await invoke<BrowserInfo | null>('detect_active_application');
      setCurrentActiveApplication(app);
      return app;
    } catch (err) {
      console.error('활성 애플리케이션 감지 중 오류 발생:', err);
      setError('활성 애플리케이션 감지에 실패했습니다.');
      return null;
    }
  }, []);

  /**
   * 모든 감지 작업을 효율적으로 처리하는 통합 함수
   */
  const performDetection = useCallback(async () => {
    // 이미 처리 중이면 중복 실행 방지
    if (isProcessingRef.current) return;
    
    const now = Date.now();
    // 마지막 감지 이후 300ms 이내라면 건너뛰기 (디바운싱)
    if (now - lastDetectionRef.current < 300) return;
    
    isProcessingRef.current = true;
    setIsDetecting(true);
    
    try {
      // 애플리케이션 감지 먼저 수행 (가장 중요한 정보)
      await findAllApplications();
      
      // 현재 활성화된 애플리케이션 감지 (새로 추가된 부분)
      await detectActiveApplication();
      
      // 브라우저 감지도 순차적으로 수행
      await detectActiveBrowsers();
      await findAllBrowserWindows();
      
      lastDetectionRef.current = Date.now();
    } finally {
      setIsDetecting(false);
      isProcessingRef.current = false;
    }
  }, [detectActiveBrowsers, findAllBrowserWindows, findAllApplications, detectActiveApplication]);

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
      // 초기 감지 즉시 실행
      performDetection();
      
      // 자동 감지 활성화 (500ms 간격으로 단축)
      const intervalId = window.setInterval(performDetection, 500);
      
      setDetectionInterval(intervalId);
      setIsAutoDetectionEnabled(true);
    }
  }, [isAutoDetectionEnabled, detectionInterval, performDetection]);

  // 컴포넌트가 언마운트될 때 자동 감지 정리
  useEffect(() => {
    return () => {
      if (detectionInterval !== null) {
        clearInterval(detectionInterval);
      }
    };
  }, [detectionInterval]);

  // 특정 애플리케이션이 실행 중인지 확인
  const isAppRunning = useCallback((appType: AppType): boolean => {
    return allApplications.some(app => app.web_app === appType);
  }, [allApplications]);

  // 현재 활성화된 애플리케이션 이름 가져오기
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
    currentActiveApplication,
    detectActiveBrowsers,
    findAllBrowserWindows,
    findAllApplications,
    detectActiveApplication,
    toggleAutoDetection,
    isAppRunning,
    getActiveAppName
  };
}