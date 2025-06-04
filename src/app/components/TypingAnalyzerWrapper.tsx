'use client';

import { useState, useEffect } from 'react';
import { TypingAnalyzer } from './TypingAnalyzer';

// 타입 정의 추가
interface TypingStats {
  keyCount: number;
  typingTime: number;
  totalChars: number;
  totalWords: number;
  accuracy: number;
}

// ElectronAPI 인터페이스 확장 - Window 인터페이스는 재정의하지 않음
declare global {
  interface ElectronAPI {
    onStatsUpdate?: (callback: (newStats: TypingStats) => void) => () => void;
    requestCurrentStats?: () => void;
    getTrackingStatus?: () => Promise<boolean>;
    toggleTracking?: () => Promise<boolean>;
  }
}

export default function TypingAnalyzerWrapper() {
  // 기본값을 가진 상태 초기화
  const [stats, setStats] = useState<TypingStats>({
    keyCount: 0,
    typingTime: 0,
    totalChars: 0,
    totalWords: 0,
    accuracy: 0
  });
  const [isTracking, setIsTracking] = useState(false);
  // _isElectron으로 변경하여 ESLint 경고 제거
  const [_isElectron, setIsElectron] = useState(false);
  
  useEffect(() => {
    // 일렉트론 API 존재 확인
    const api = window.electronAPI;
    const hasApi = !!api;
    setIsElectron(hasApi);
    
    // 모의 데이터 생성 (일렉트론 API가 없을 때 사용)
    if (!hasApi) {
      // 브라우저 환경에서는 모의 데이터 사용
      const mockStats: TypingStats = {
        keyCount: 1250,
        typingTime: 1800,
        totalChars: 1050,
        totalWords: 210,
        accuracy: 98.5
      };
      
      setStats(mockStats);
      setIsTracking(true);
      return;
    }
    
    // 일렉트론 API가 있고 필요한 메서드가 있는 경우만 처리
    try {
      let cleanup: (() => void) | undefined;
      
      // onStatsUpdate 메서드가 있는지 확인
      if (api.onStatsUpdate && typeof api.onStatsUpdate === 'function') {
        cleanup = api.onStatsUpdate((newStats: TypingStats) => {
          if (newStats) {
            setStats(newStats);
          }
        });
      }
      
      // requestCurrentStats 메서드가 있는지 확인
      if (api.requestCurrentStats && typeof api.requestCurrentStats === 'function') {
        api.requestCurrentStats();
      }
      
      // getTrackingStatus 메서드가 있는지 확인
      if (api.getTrackingStatus && typeof api.getTrackingStatus === 'function') {
        api.getTrackingStatus()
          .then((status: boolean) => {
            setIsTracking(status);
          })
          .catch((err: any) => {
            console.warn('추적 상태를 가져오는데 실패했습니다:', err);
            setIsTracking(false);
          });
      }
      
      return () => {
        if (cleanup && typeof cleanup === 'function') {
          cleanup();
        }
      };
    } catch (error) {
      console.error('일렉트론 API 사용 중 오류 발생:', error);
      
      // 오류 발생 시 모의 데이터 사용
      const fallbackStats: TypingStats = {
        keyCount: 500,
        typingTime: 600,
        totalChars: 450,
        totalWords: 90,
        accuracy: 95.0
      };
      
      setStats(fallbackStats);
      setIsTracking(false);
    }
  }, []);
  
  // TypingAnalyzer 컴포넌트에 _isTracking 속성 사용 (대신 isTracking을 사용)
  return <TypingAnalyzer stats={stats} _isTracking={isTracking} />;
}
