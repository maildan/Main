import { useEffect, useRef, useCallback } from 'react';

// Define MemoryInfo interface locally
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface MemoryManagementOptions {
  debugMode?: boolean;
  checkInterval?: number;
  memoryThreshold?: number;
  activeTab?: string;
  onClearLogs?: () => void;
}

/**
 * 메모리 관리를 위한 커스텀 훅
 * 주기적으로 메모리 상태를 확인하고 필요시 정리 작업을 수행합니다.
 */
export function useMemoryManagement({ 
  debugMode = false,
  checkInterval = 30000, // 기본 30초
  memoryThreshold = 100, // 기본 100MB
  activeTab = 'monitor',
  onClearLogs = () => {}
}: MemoryManagementOptions = {}) {
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  const memoryWarningShownRef = useRef<boolean>(false);
  const lastCleanupTimeRef = useRef<number>(0);
  const CLEANUP_COOLDOWN = 60000; // 정리 작업 간 최소 시간 간격 (1분)
  
  // 메모리 사용량 확인 및 정리 함수
  const checkMemoryUsage = useCallback(() => {
    // 브라우저에서 실행 중인지 확인
    if (typeof window === 'undefined') return;

    // 성능 API를 통한 메모리 정보 수집
    if (window.performance && (window.performance as any).memory) {
      const memoryInfo = (window.performance as any).memory;
      const usedHeapSize = memoryInfo.usedJSHeapSize / (1024 * 1024);
      const totalHeapSize = memoryInfo.totalJSHeapSize / (1024 * 1024);
      const percentUsed = (usedHeapSize / totalHeapSize) * 100;
      
      if (debugMode) {
        console.log(`메모리 사용량: ${Math.round(usedHeapSize)}MB (${Math.round(percentUsed)}%)`);
      }
      
      // 임계치 이상이면 불필요한 데이터 해제 (쿨다운 시간 체크)
      const now = Date.now();
      if (usedHeapSize > memoryThreshold && (now - lastCleanupTimeRef.current > CLEANUP_COOLDOWN)) {
        lastCleanupTimeRef.current = now;
        
        // 경고 로그 (한 번만 표시)
        if (!memoryWarningShownRef.current && debugMode) {
          console.warn(`메모리 사용량 경고: ${Math.round(usedHeapSize)}MB (임계치: ${memoryThreshold}MB)`);
          memoryWarningShownRef.current = true;
        }
        
        // 필요하지 않은 큰 객체 참조 해제
        if (activeTab !== 'history' && activeTab !== 'stats' && activeTab !== 'chart') {
          // 로그 데이터가 필요 없는 탭에서는 메모리에서 해제
          onClearLogs();
          
          // 자동 최적화 수행
          if (typeof window.__memoryOptimizer?.optimizeMemory === 'function') {
            window.__memoryOptimizer.optimizeMemory(usedHeapSize > memoryThreshold * 1.5);
            if (debugMode) {
              console.log('메모리 자동 최적화 수행됨');
            }
          }
          
          // GC 힌트 제공
          if (window.gc) {
            window.gc();
            if (debugMode) {
              console.log('GC 호출됨');
            }
          }
        }
      }
      
      // 메모리 사용량이 임계치 아래로 내려가면 경고 상태 초기화
      if (usedHeapSize < memoryThreshold * 0.8) {
        memoryWarningShownRef.current = false;
      }
    }
  }, [activeTab, debugMode, memoryThreshold, onClearLogs]);
  
  // 컴포넌트 마운트 시 타이머 설정
  useEffect(() => {
    // 초기 메모리 체크
    checkMemoryUsage();
    
    // 주기적으로 메모리 사용량 체크
    const memoryCheckInterval = setInterval(checkMemoryUsage, checkInterval);
    intervalsRef.current.push(memoryCheckInterval);
    
    // 페이지 가시성 변경 이벤트 핸들러
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 탭이 다시 보이게 되면 메모리 체크 실행
        checkMemoryUsage();
      }
    };
    
    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 페이지 언마운트 시 정리
    return () => {
      clearInterval(memoryCheckInterval);
      
      // 등록된 모든 인터벌 제거
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
      
      // 이벤트 리스너 제거
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // 메모리 해제 요청
      if (window.gc) {
        try {
          window.gc();
        } catch (e) {
          console.warn('GC 호출 실패');
        }
      }
    };
  }, [checkMemoryUsage, checkInterval]);
  
  // 수동으로 메모리 정리 실행 함수
  const cleanupMemory = useCallback(() => {
    // 브라우저 환경 확인
    if (typeof window === 'undefined') return false;
    
    // 최적화 유틸리티 사용 시도
    if (typeof window.__memoryOptimizer?.optimizeMemory === 'function') {
      window.__memoryOptimizer.optimizeMemory(true);
      if (debugMode) {
        console.log('수동 메모리 최적화 실행됨');
      }
      return true;
    }
    
    // 브라우저에 GC 권장
    if (window.gc) {
      try {
        window.gc();
        if (debugMode) {
          console.log('GC 호출 성공');
        }
        return true;
      } catch (e) {
        console.warn('GC 호출 실패');
        return false;
      }
    }
    
    return false;
  }, [debugMode]);

  // 인터벌 관리를 위한 추가 함수
  const addInterval = useCallback((interval: NodeJS.Timeout) => {
    intervalsRef.current.push(interval);
  }, []);
  
  const clearIntervals = useCallback(() => {
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [];
  }, []);

  return {
    cleanupMemory,
    addInterval,
    clearIntervals,
    checkMemoryUsage
  };
}
