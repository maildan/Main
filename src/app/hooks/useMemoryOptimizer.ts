import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/ToastContext';

interface MemoryOptimizationOptions {
  /**
   * 메모리 사용량 임계치 (MB)
   * 이 값을 초과하면 자동 최적화가 실행됩니다.
   */
  threshold?: number;
  
  /**
   * 메모리 확인 주기 (ms)
   */
  checkInterval?: number;
  
  /**
   * 경고 메시지 표시 여부
   */
  showWarnings?: boolean;
  
  /**
   * 자동 최적화 활성화 여부
   */
  autoOptimize?: boolean;
  
  /**
   * 디버그 모드 활성화 여부
   */
  debug?: boolean;
}

/**
 * 메모리 최적화 훅
 * 
 * 앱의 메모리 사용량을 모니터링하고 최적화하는 훅입니다.
 * 
 * @param options 메모리 최적화 옵션
 * @returns 메모리 정보 및 최적화 관련 함수
 */
export function useMemoryOptimizer(options: MemoryOptimizationOptions = {}) {
  const {
    threshold = 75, // 임계치를 80MB에서 75MB로 낮춤
    checkInterval = 30000, // 기본 확인 주기 30초
    showWarnings = true,
    autoOptimize = true,
    debug = false
  } = options;
  
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { showToast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 메모리 정보 갱신
  const updateMemoryInfo = useCallback(() => {
    try {
      if (typeof window === 'undefined') return null;
      
      if (window.__memoryOptimizer?.getMemoryInfo) {
        const info = window.__memoryOptimizer.getMemoryInfo();
        setMemoryInfo(info);
        
        // 임계치 초과 시 처리
        if (info && info.heapUsedMB > threshold) {
          if (debug) {
            console.warn(`메모리 사용량 경고: ${info.heapUsedMB}MB (임계치: ${threshold}MB)`);
          }
          
          if (showWarnings) {
            showToast(`메모리 사용량이 높습니다: ${Math.round(info.heapUsedMB)}MB`, 'warning');
          }
          
          if (autoOptimize) {
            optimizeMemory();
          }
        }
        
        return info;
      }
      
      return null;
    } catch (error) {
      console.error('메모리 정보 갱신 중 오류:', error);
      return null;
    }
  }, [threshold, showWarnings, autoOptimize, debug, showToast]);
  
  // 메모리 최적화 실행
  const optimizeMemory = useCallback(async () => {
    if (isOptimizing) return;
    
    try {
      setIsOptimizing(true);
      
      if (window.__memoryOptimizer?.optimizeMemory) {
        window.__memoryOptimizer.optimizeMemory(false);
        
        if (debug) {
          console.log('메모리 최적화 실행됨');
        }
      }
      
      // 잠시 후 GC 요청 (브라우저에서 GC가 실행될 시간 제공)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 최적화 후 메모리 정보 갱신
      updateMemoryInfo();
    } catch (error) {
      console.error('메모리 최적화 중 오류:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, updateMemoryInfo, debug]);
  
  // 긴급 메모리 최적화 (적극적 모드)
  const emergencyOptimize = useCallback(async () => {
    if (isOptimizing) return;
    
    try {
      setIsOptimizing(true);
      showToast('긴급 메모리 최적화 실행 중...', 'info');
      
      if (window.__memoryOptimizer?.optimizeMemory) {
        window.__memoryOptimizer.optimizeMemory(true); // 적극적 모드
      }
      
      // 이미지 리소스도 최적화
      if (window.__memoryOptimizer?.optimizeImageResources) {
        await window.__memoryOptimizer.optimizeImageResources();
      }
      
      // GC 실행 시간 제공
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 결과 확인 및 알림
      const newInfo = updateMemoryInfo();
      
      if (newInfo && debug) {
        showToast(`메모리 최적화 완료: ${Math.round(newInfo.heapUsedMB)}MB`, 'success');
      }
    } catch (error) {
      console.error('긴급 메모리 최적화 중 오류:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, updateMemoryInfo, debug, showToast]);
  
  // 메모리 모니터링 설정
  useEffect(() => {
    // 초기 메모리 정보 확인
    updateMemoryInfo();
    
    // 주기적 메모리 확인 설정
    intervalRef.current = setInterval(updateMemoryInfo, checkInterval);
    
    // 페이지 가시성 변경 감지
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateMemoryInfo();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 클린업
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateMemoryInfo, checkInterval]);
  
  return {
    memoryInfo,
    isOptimizing,
    updateMemoryInfo,
    optimizeMemory,
    emergencyOptimize
  };
}
