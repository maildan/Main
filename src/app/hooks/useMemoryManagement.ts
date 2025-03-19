import { useEffect, useRef } from 'react';

export interface MemoryManagementOptions {
  debugMode?: boolean;
  checkInterval?: number;
  memoryThreshold?: number;
  activeTab?: string;
  onClearLogs?: () => void;
}

export function useMemoryManagement({ 
  debugMode = false,
  checkInterval = 30000, // 기본 30초
  memoryThreshold = 100, // 기본 100MB
  activeTab = 'monitor',
  onClearLogs = () => {}
}: MemoryManagementOptions = {}) {
  const intervalsRef = useRef<NodeJS.Timeout[]>([]);
  
  // 메모리 관리를 위한 효과
  useEffect(() => {
    // 브라우저에서 실행 중인지 확인
    if (typeof window === 'undefined') return;
    
    // 메모리 사용량 모니터링 함수
    const checkMemoryUsage = () => {
      // 메모리 정보가 있는 경우 (Chrome/Chromium 환경)
      if (window.performance && (window.performance as any).memory) {
        const memoryInfo = (window.performance as any).memory;
        const usedHeapSize = memoryInfo.usedJSHeapSize / (1024 * 1024);
        
        if (debugMode) {
          console.log(`메모리 사용량: ${Math.round(usedHeapSize)}MB`);
        }
        
        // 임계치 이상이면 불필요한 데이터 해제
        if (usedHeapSize > memoryThreshold) {
          // 필요하지 않은 큰 객체 참조 해제
          if (activeTab !== 'history' && activeTab !== 'stats') {
            // 로그 데이터가 필요 없는 탭에서는 메모리에서 해제
            onClearLogs();
          }
          
          // 브라우저에 GC 권장
          if (window.gc) {
            window.gc();
          }
        }
      }
    };
    
    // 주기적으로 메모리 사용량 체크
    const memoryCheckInterval = setInterval(checkMemoryUsage, checkInterval);
    intervalsRef.current.push(memoryCheckInterval);
    
    // 페이지 언마운트 시 메모리 정리
    return () => {
      clearInterval(memoryCheckInterval);
      
      // 등록된 모든 인터벌 제거
      intervalsRef.current.forEach(clearInterval);
      intervalsRef.current = [];
      
      // 메모리 해제 요청
      if (window.gc) {
        try {
          window.gc();
        } catch (e) {
          console.log('GC 호출 실패');
        }
      }
    };
  }, [activeTab, debugMode, checkInterval, memoryThreshold, onClearLogs]);

  // 수동으로 메모리 정리 실행
  const cleanupMemory = () => {
    // 브라우저에 GC 권장
    if (window.gc) {
      try {
        window.gc();
        if (debugMode) {
          console.log('메모리 정리 실행됨');
        }
        return true;
      } catch (e) {
        console.log('GC 호출 실패');
        return false;
      }
    }
    return false;
  };

  return {
    cleanupMemory,
    addInterval: (interval: NodeJS.Timeout) => {
      intervalsRef.current.push(interval);
    }
  };
}
