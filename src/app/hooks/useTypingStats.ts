import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '../components/ToastContext';

const MAX_LOGS_TO_LOAD = 100; // 최대 로그 수 제한

export interface TypingStatsState {
  keyCount: number;
  typingTime: number;
  windowTitle: string;
  browserName: string;
  totalChars: number;
  totalCharsNoSpace: number;
  totalWords: number;
  pages: number;
  accuracy: number;
}

export function useTypingStats(electronAPI: ElectronAPI | null) {
  // API에서 가져온 로그 데이터
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  
  // 메모리 관리를 위한 ref 사용
  const eventsCleanupRef = useRef<(() => void)[]>([]);
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  
  // 현재 통계 상태 - useRef로 관리하여 불필요한 렌더링 방지
  const currentStatsRef = useRef<TypingStatsState>({
    keyCount: 0,
    typingTime: 0,
    windowTitle: '',
    browserName: '',
    totalChars: 0,
    totalCharsNoSpace: 0,
    totalWords: 0,
    pages: 0,
    accuracy: 100
  });
  
  // 화면에 표시할 통계만 useState로 관리
  const [displayStats, setDisplayStats] = useState({...currentStatsRef.current});
  const { showToast } = useToast();
  
  // 주기적으로 표시 통계 업데이트 (불필요한 렌더링 방지)
  useEffect(() => {
    const updateInterval = setInterval(() => {
      // 변경사항이 있는 경우에만 상태 업데이트
      if (JSON.stringify(currentStatsRef.current) !== JSON.stringify(displayStats)) {
        setDisplayStats({...currentStatsRef.current});
      }
    }, 2000); // 2초마다 업데이트
    
    intervalsRef.current.push(updateInterval);
    
    return () => clearInterval(updateInterval);
  }, [displayStats]);

  // 통계 시작 핸들러
  const handleStartTracking = useCallback(() => {
    try {
      if (electronAPI) {
        electronAPI.startTracking();
        setIsTracking(true);
      } else {
        console.warn('electronAPI가 없습니다.');
        setIsTracking(true); // API가 없어도 UI는 tracking 상태 표시
      }
    } catch (error) {
      console.error('startTracking 호출 오류:', error);
      setIsTracking(true);
    }
  }, [electronAPI]);

  // 통계 중지 핸들러
  const handleStopTracking = useCallback(() => {
    try {
      if (electronAPI) {
        electronAPI.stopTracking();
        setIsTracking(false);
      } else {
        console.warn('electronAPI가 없습니다.');
        setIsTracking(false);
      }
    } catch (error) {
      console.error('stopTracking 호출 오류:', error);
      setIsTracking(false);
    }
  }, [electronAPI]);

  // 로그 데이터 로드 함수
  const fetchLogs = useCallback(async (limit = MAX_LOGS_TO_LOAD) => {
    try {
      setIsLoading(true);
      const endpoint = `/api/getLogs?limit=${limit}`;
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('서버에서 잘못된 응답 형식 반환');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // 필요한 필드만 추출하여 메모리 최적화
        const optimizedLogs = data.logs.map((log: any) => ({
          id: log.id,
          content: log.content,
          key_count: log.key_count,
          typing_time: log.typing_time,
          timestamp: log.timestamp,
          created_at: log.created_at,
          window_title: log.window_title,
          browser_name: log.browser_name,
          total_chars: log.total_chars,
          total_words: log.total_words,
          pages: log.pages,
          accuracy: log.accuracy
        }));
        
        setLogs(optimizedLogs);
      } else {
        console.error('로그 불러오기 실패:', data.error);
        setLogs([]);
      }
    } catch (error) {
      console.error('로그 API 요청 오류:', error);
      setLogs([]);
      showToast?.('데이터 로드 중 오류가 발생했습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // 데이터베이스 저장 함수
  const saveToDatabase = useCallback(async (record: RecordData) => {
    try {
      const response = await fetch('/api/saveLogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });

      const result = await response.json();
      
      if (response.ok) {
        await fetchLogs(); // 로그 다시 불러오기
      } else {
        console.error('저장 실패:', result.error);
      }
    } catch (error) {
      console.error('저장 API 요청 오류:', error);
    }
  }, [fetchLogs]);

  // 통계 저장 핸들러
  const handleSaveStats = useCallback((content: string) => {
    try {
      if (electronAPI) {
        electronAPI.saveStats(content);
      }
      
      // DB에도 저장
      const recordData: RecordData = {
        content,
        keyCount: currentStatsRef.current.keyCount,
        typingTime: currentStatsRef.current.typingTime,
        timestamp: new Date().toISOString(),
        windowTitle: currentStatsRef.current.windowTitle,
        browserName: currentStatsRef.current.browserName,
        totalChars: currentStatsRef.current.totalChars,
        totalWords: currentStatsRef.current.totalWords,
        pages: currentStatsRef.current.pages,
        accuracy: currentStatsRef.current.accuracy
      };
      
      saveToDatabase(recordData);
    } catch (error) {
      console.error('saveStats 호출 오류:', error);
      // API 호출 실패해도 데이터베이스에는 저장 시도
      const recordData: RecordData = {
        content,
        keyCount: currentStatsRef.current.keyCount,
        typingTime: currentStatsRef.current.typingTime,
        timestamp: new Date().toISOString(),
        windowTitle: currentStatsRef.current.windowTitle,
        browserName: currentStatsRef.current.browserName || 'Unknown',
        totalChars: currentStatsRef.current.totalChars,
        totalWords: currentStatsRef.current.totalWords,
        pages: currentStatsRef.current.pages,
        accuracy: currentStatsRef.current.accuracy
      };
      saveToDatabase(recordData);
    }
  }, [electronAPI, saveToDatabase]);

  // 모니터링 이벤트 처리
  useEffect(() => {
    if (!electronAPI) return;
    
    const cleanupFunctions: (() => void)[] = [];
    
    try {
      // 실시간 타이핑 통계 업데이트 이벤트
      const unsubscribeStats = electronAPI.onTypingStatsUpdate((data: TypingStatsUpdate) => {
        // ref로 상태 관리하여 불필요한 렌더링 방지
        currentStatsRef.current = {
          ...currentStatsRef.current,
          keyCount: data.keyCount,
          typingTime: data.typingTime,
          windowTitle: data.windowTitle || currentStatsRef.current.windowTitle,
          browserName: data.browserName || currentStatsRef.current.browserName,
          totalChars: data.totalChars || 0,
          totalCharsNoSpace: data.totalCharsNoSpace || 0,
          totalWords: data.totalWords || 0,
          pages: data.pages || 0,
          accuracy: data.accuracy || 100
        };
        
        if (!isTracking) {
          setIsTracking(true);
        }
      });
      
      cleanupFunctions.push(unsubscribeStats);
      
      // 통계 저장 완료 이벤트
      const unsubscribeSaved = electronAPI.onStatsSaved(() => {
        // 저장 완료 시 로그 업데이트
        fetchLogs();
      });
      
      cleanupFunctions.push(unsubscribeSaved);
      
      eventsCleanupRef.current = cleanupFunctions;
    } catch (error) {
      console.error('Electron API 이벤트 구독 오류:', error);
    }
    
    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.error('이벤트 리스너 정리 오류:', error);
        }
      });
    };
  }, [electronAPI, isTracking, fetchLogs]);

  // 메모리 관리를 위한 정리 함수
  useEffect(() => {
    return () => {
      // 등록된 모든 이벤트 리스너 제거
      eventsCleanupRef.current.forEach(cleanup => cleanup());
      eventsCleanupRef.current = [];
      
      // 등록된 모든 인터벌 제거
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
      
      // 대용량 객체 참조 끊기
      setLogs([]);
      currentStatsRef.current = {
        keyCount: 0,
        typingTime: 0,
        windowTitle: '',
        browserName: '',
        totalChars: 0,
        totalCharsNoSpace: 0,
        totalWords: 0,
        pages: 0,
        accuracy: 100
      };
      
      // 메모리 해제 요청
      if (window.gc) {
        try {
          window.gc();
        } catch (e) {
          console.log('GC 호출 실패');
        }
      }
    };
  }, []);

  // 초기 로딩시 로그 데이터 가져오기
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    isLoading, 
    isTracking,
    displayStats,
    handleStartTracking,
    handleStopTracking,
    handleSaveStats,
    fetchLogs,
    currentStatsRef
  };
}
