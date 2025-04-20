import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/ToastContext';

// MemoryOptimizer 인터페이스 추가
interface MemoryOptimizer {
  suggestGarbageCollection: () => void;
  requestGC: (emergency?: boolean) => Promise<any>;
  clearBrowserCaches: () => Promise<boolean>;
  clearStorageCaches: () => boolean;
  checkMemoryUsage: () => Record<string, any> | null;
  forceGC: () => boolean;
  getMemoryInfo?: () => any;
  optimizeMemory?: (aggressive?: boolean) => Promise<any>;
  optimizeImageResources?: () => Promise<any>;
}

// Window 인터페이스 확장
declare global {
  interface Window {
    gc?: () => void;
  }
}

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
    threshold = 100, // 기본 100MB
    checkInterval = 30000, // 기본 30초
    showWarnings = true,
    autoOptimize = false,
    debug = false
  } = options;

  const { addToast } = useToast();
  const [memoryInfo, setMemoryInfo] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const optimizeMemoryRef = useRef<(() => void) | null>(null);

  // updateMemoryInfo 함수 선언을 먼저 수행
  const updateMemoryInfo = useCallback(() => {
    try {
      if (typeof window === 'undefined') return null;

      if (window.__memoryOptimizer?.getMemoryInfo) {
        const info = window.__memoryOptimizer.getMemoryInfo();
        setMemoryInfo(info);

        // 임계치 초과 시 처리
        if (info && info.heapUsedMB > threshold) {
          if (debug) {
            console.warn(`메모s리 사용량 경고: ${info.heapUsedMB}MB (임계치: ${threshold}MB)`);
          }

          if (showWarnings) {
            addToast(`메모리 사용량이 높습니다: ${Math.round(info.heapUsedMB)}MB`, 'warning');
          }

          if (autoOptimize && optimizeMemoryRef.current) {
            optimizeMemoryRef.current();
          }
        }

        return info;
      }

      return null;
    } catch (error) {
      console.error('메모리 정보 가져오기 오류:', error);
      return null;
    }
  }, [threshold, debug, showWarnings, autoOptimize, addToast]);

  // 메모리 최적화 함수를 updateMemoryInfo 선언 이후에 정의
  const optimizeMemory = useCallback(async () => {
    if (isOptimizing) return;

    try {
      setIsOptimizing(true);

      if (typeof window !== 'undefined' && window.__memoryOptimizer?.optimizeMemory) {
        const result = await window.__memoryOptimizer.optimizeMemory(true); // aggressive 모드로 최적화
        if (result.success) {
          addToast('메모리 최적화 완료.', 'success');
        } else {
          addToast(`메모리 최적화 실패: ${result.error || 'Unknown error'}`, 'error');
        }
      } else {
        // 기본 최적화 구현
        if (typeof window !== 'undefined' && window.gc) {
          window.gc();
        }
      }

      // 잠시 후 GC 요청 (브라우저에서 GC가 실행될 시간 제공)
      await new Promise(resolve => setTimeout(resolve, 500));

      // 최적화 후 메모리 정보 갱신
      updateMemoryInfo();
    } catch (error) {
      addToast('메모리 최적화 중 오류 발생', 'error');
    } finally {
      setIsOptimizing(false);
    }
  }, [isOptimizing, updateMemoryInfo, addToast]);

  // ref에 최신 함수 유지
  optimizeMemoryRef.current = optimizeMemory;

  // 이미지 리소스 최적화
  const optimizeImageResources = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.__memoryOptimizer?.optimizeImageResources) {
        return await window.__memoryOptimizer.optimizeImageResources();
      }
      return false;
    } catch (error) {
      console.error('이미지 리소스 최적화 오류:', error);
      return false;
    }
  }, []);

  // 주기적 메모리 체크 설정
  useEffect(() => {
    // 초기 메모리 정보 가져오기
    updateMemoryInfo();

    // 주기적 체크 설정
    if (checkInterval > 0) {
      intervalRef.current = setInterval(updateMemoryInfo, checkInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkInterval, updateMemoryInfo]);

  return {
    memoryInfo,
    isOptimizing,
    optimizeMemory,
    optimizeImageResources,
    updateMemoryInfo
  };
}
