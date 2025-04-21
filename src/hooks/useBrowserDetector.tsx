import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { BrowserInfo } from '../types';

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

  /**
   * 현재 활성화된 브라우저 감지
   */
  const detectActiveBrowsers = useCallback(async () => {
    try {
      setIsDetecting(true);
      setError(null);
      
      const browsers = await invoke<BrowserInfo[]>('detect_active_browsers');
      setActiveBrowsers(browsers || []);
      
      // 브라우저 정보 로깅 (선택적)
      if (browsers && browsers.length > 0) {
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

  return {
    activeBrowsers,
    allBrowserWindows,
    isDetecting,
    error,
    isAutoDetectionEnabled,
    detectActiveBrowsers,
    findAllBrowserWindows,
    toggleAutoDetection
  };
}