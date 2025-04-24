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
  
  // 마지막으로 활성화된 애플리케이션이 변경된 타임스탬프
  const [lastActiveAppUpdateTime, setLastActiveAppUpdateTime] = useState<number>(0);
  
  // 애플리케이션의 상태를 표시하기 위한 인디케이터
  const [appActiveState, setAppActiveState] = useState<'active' | 'cached' | 'none'>('none');
  
  // 성능 최적화를 위한 마지막 감지 시간 참조
  const lastDetectionRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  
  // 마지막으로 감지된 앱의 실행 상태를 확인하는 타이머 ID
  const appCheckTimerRef = useRef<number | null>(null);
  
  // 앱 상태 체크 간격 (밀리초)
  const APP_CHECK_INTERVAL = 2000; // 2초마다 확인 (이전의 5초보다 더 자주 확인)
  
  // 감지된 앱의 프로세스 ID를 저장하는 ref
  const lastProcessIdRef = useRef<number | null>(null);

  // 앱 감지 상태 변경 시 로깅
  useEffect(() => {
    if (currentActiveApplication) {
      lastProcessIdRef.current = currentActiveApplication.process_id;
      console.log(`[App Detection] ${currentActiveApplication.name} (PID: ${currentActiveApplication.process_id}) - ${appActiveState}`);
    } else {
      console.log('[App Detection] No active application detected');
      lastProcessIdRef.current = null;
    }
  }, [currentActiveApplication, appActiveState]);

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
   * 특정 프로세스 ID의 앱이 여전히 실행중인지 확인
   */
  const checkAppStillRunning = useCallback(async (processId: number): Promise<boolean> => {
    if (!processId) return false;
    
    try {
      return await invoke<boolean>('is_process_running', { processId });
    } catch (err) {
      console.error('프로세스 상태 확인 중 오류 발생:', err);
      return false;  // 오류 발생 시 실행 중이 아닌 것으로 간주
    }
  }, []);

  /**
   * 현재 활성화된 애플리케이션 감지 (브라우저 또는 바로가기 앱)
   */
  const detectActiveApplication = useCallback(async () => {
    try {
      const app = await invoke<BrowserInfo | null>('detect_active_application');
      
      // 앱이 감지된 경우
      if (app) {
        // 새로운 앱 정보 업데이트
        setCurrentActiveApplication(app);
        setLastActiveAppUpdateTime(Date.now());
        setAppActiveState('active');
        return app;
      }
      // 앱이 감지되지 않은 경우
      else {
        // 이전에 캐시된 앱 정보가 있는지 확인
        if (currentActiveApplication) {
          // 명시적으로 프로세스 상태 재확인
          const isStillRunning = await checkAppStillRunning(currentActiveApplication.process_id);
          
          if (isStillRunning) {
            // 여전히 실행 중이면 'cached' 상태 유지
            setAppActiveState('cached');
            return currentActiveApplication;
          } else {
            // 앱이 종료된 경우 정보 초기화
            console.log(`[App Detection] App terminated: ${currentActiveApplication.name} (PID: ${currentActiveApplication.process_id})`);
            setCurrentActiveApplication(null);
            setAppActiveState('none');
          }
        }
      }
      
      return null;
    } catch (err) {
      console.error('활성 애플리케이션 감지 중 오류 발생:', err);
      setError('활성 애플리케이션 감지에 실패했습니다.');
      
      // 오류 발생 시 현재 캐시된 앱이 여전히 실행 중인지 확인
      if (currentActiveApplication) {
        const isStillRunning = await checkAppStillRunning(currentActiveApplication.process_id);
        if (!isStillRunning) {
          setCurrentActiveApplication(null);
          setAppActiveState('none');
        }
      }
      
      return null;
    }
  }, [currentActiveApplication, checkAppStillRunning]);

  /**
   * 마지막으로 감지된 앱 프로세스 상태를 주기적으로 확인
   */
  const checkCurrentAppStatus = useCallback(async () => {
    if (!currentActiveApplication) return;
    
    const processId = currentActiveApplication.process_id;
    if (!processId) return;
    
    try {
      const isRunning = await checkAppStillRunning(processId);
      
      if (!isRunning) {
        console.log(`[App Status Check] App terminated: ${currentActiveApplication.name} (PID: ${processId})`);
        setCurrentActiveApplication(null);
        setAppActiveState('none');
      }
    } catch (err) {
      console.error('앱 상태 확인 중 오류 발생:', err);
    }
  }, [currentActiveApplication, checkAppStillRunning]);

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
      // 현재 캐시된 앱이 있으면 먼저 상태 확인
      if (currentActiveApplication) {
        const isStillRunning = await checkAppStillRunning(currentActiveApplication.process_id);
        if (!isStillRunning) {
          setCurrentActiveApplication(null);
          setAppActiveState('none');
        }
      }
      
      // 애플리케이션 감지 먼저 수행 (가장 중요한 정보)
      await findAllApplications();
      
      // 현재 활성화된 애플리케이션 감지
      await detectActiveApplication();
      
      // 브라우저 감지도 순차적으로 수행
      await detectActiveBrowsers();
      await findAllBrowserWindows();
      
      lastDetectionRef.current = Date.now();
    } finally {
      setIsDetecting(false);
      isProcessingRef.current = false;
    }
  }, [detectActiveBrowsers, findAllBrowserWindows, findAllApplications, detectActiveApplication, currentActiveApplication, checkAppStillRunning]);

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
      
      // 앱 상태 확인 타이머 정리
      if (appCheckTimerRef.current !== null) {
        clearInterval(appCheckTimerRef.current);
        appCheckTimerRef.current = null;
      }
      
      setIsAutoDetectionEnabled(false);
    } else {
      // 초기 감지 즉시 실행
      performDetection();
      
      // 자동 감지 활성화 (500ms 간격으로 단축)
      const intervalId = window.setInterval(performDetection, 500);
      
      // 앱 상태 확인 타이머 시작
      appCheckTimerRef.current = window.setInterval(checkCurrentAppStatus, APP_CHECK_INTERVAL);
      
      setDetectionInterval(intervalId);
      setIsAutoDetectionEnabled(true);
    }
  }, [isAutoDetectionEnabled, detectionInterval, performDetection, checkCurrentAppStatus]);

  // 컴포넌트가 언마운트될 때 자동 감지 정리
  useEffect(() => {
    return () => {
      if (detectionInterval !== null) {
        clearInterval(detectionInterval);
      }
      if (appCheckTimerRef.current !== null) {
        clearInterval(appCheckTimerRef.current);
      }
    };
  }, [detectionInterval]);

  // 모니터링이 활성화될 때 앱 상태 확인 타이머 설정
  useEffect(() => {
    if (isAutoDetectionEnabled) {
      // 이미 타이머가 있으면 제거
      if (appCheckTimerRef.current !== null) {
        clearInterval(appCheckTimerRef.current);
      }
      
      // 새 타이머 설정
      appCheckTimerRef.current = window.setInterval(checkCurrentAppStatus, APP_CHECK_INTERVAL);
      
      // 초기 감지 즉시 실행
      performDetection();
    }
    
    return () => {
      if (appCheckTimerRef.current !== null) {
        clearInterval(appCheckTimerRef.current);
        appCheckTimerRef.current = null;
      }
    };
  }, [isAutoDetectionEnabled, checkCurrentAppStatus, performDetection]);

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
    appActiveState,
    lastActiveAppUpdateTime,
    detectActiveBrowsers,
    findAllBrowserWindows,
    findAllApplications,
    detectActiveApplication,
    toggleAutoDetection,
    isAppRunning,
    getActiveAppName
  };
}