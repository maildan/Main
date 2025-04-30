import { useEffect, useRef, useState, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { diagnoseAndOptimizePerformance } from '../utils/performance-optimizer';

// 타입 정의를 위한 인터페이스
interface PerformanceState {
  isOptimizing: boolean;
  lastCheck: number;
  optimizationCount: number;
}

/**
 * 컴포넌트 렌더링 성능 최적화 훅
 * @param threshold 최적화 임계값 (0-1 사이, 기본값 0.7)
 * @returns 성능 관련 데이터 및 최적화 함수
 */
export function usePerformanceOptimization(threshold: number = 0.7) {
  const [isOptimizationNeeded, setIsOptimizationNeeded] = useState(false);
  const [lastOptimization, setLastOptimization] = useState<Date | null>(null);

  // 최적화 상태 참조
  const optimizationRef = useRef<PerformanceState>({
    isOptimizing: false,
    lastCheck: Date.now(),
    optimizationCount: 0
  });

  // 성능 체크 함수
  const checkPerformance = useCallback(async () => {
    if (optimizationRef.current.isOptimizing) return;

    // 마지막 체크 후 1초 이내면 스킵
    if (Date.now() - optimizationRef.current.lastCheck < 1000) return;

    optimizationRef.current.lastCheck = Date.now();

    // 메모리 사용량 체크 (브라우저 환경 확인)
    if (typeof window !== 'undefined' && window.performance &&
      'memory' in window.performance &&
      (window.performance.memory as any)?.usedJSHeapSize) {
      const memory = window.performance.memory as {
        usedJSHeapSize: number;
        jsHeapSizeLimit: number;
        totalJSHeapSize: number;
      };
      const usedRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

      // 임계값 초과 시 최적화 필요 상태로 변경
      if (usedRatio > threshold) {
        setIsOptimizationNeeded(true);
      }
    }
  }, [threshold]);

  // useCallback 내에서 debounce를 직접 사용하지 않고 useRef로 memoize
  // 수정: undefined 대신 빈 함수로 초기화
  const debouncedCheckRef = useRef<(() => void) | undefined>(() => { });

  // 최초 렌더링 시 debounce 함수 생성
  useEffect(() => {
    debouncedCheckRef.current = debounce(() => {
      checkPerformance();
    }, 2000, { maxWait: 5000 });

    return () => {
      if (debouncedCheckRef.current) {
        // @ts-ignore - lodash debounce의 cancel 메서드 호출
        debouncedCheckRef.current.cancel();
      }
    };
  }, [checkPerformance]);

  // 성능 최적화 실행 함수
  const optimizePerformance = useCallback(async () => {
    if (optimizationRef.current.isOptimizing) return;

    try {
      optimizationRef.current.isOptimizing = true;

      const result = await diagnoseAndOptimizePerformance();

      if (result.optimized) {
        optimizationRef.current.optimizationCount += 1;
        setLastOptimization(new Date());
        setIsOptimizationNeeded(false);
      }
    } finally {
      optimizationRef.current.isOptimizing = false;
    }
  }, []);

  // 성능 체크 주기 설정
  useEffect(() => {
    // 첫 로드 시 한 번 체크
    checkPerformance();

    // 상호작용 이벤트에 성능 체크 연결
    const events = ['scroll', 'resize', 'mousemove', 'keydown'];

    const handler = () => {
      if (debouncedCheckRef.current) {
        debouncedCheckRef.current();
      }
    };

    events.forEach(event => window.addEventListener(event, handler, { passive: true }));

    // 주기적 성능 체크 (15초마다)
    const intervalId = setInterval(checkPerformance, 15000);

    return () => {
      events.forEach(event => window.removeEventListener(event, handler));
      clearInterval(intervalId);
    };
  }, [checkPerformance]);

  // 최적화 필요시 자동 최적화 실행
  useEffect(() => {
    if (isOptimizationNeeded) {
      optimizePerformance();
    }
  }, [isOptimizationNeeded, optimizePerformance]);

  return {
    isOptimizationNeeded,
    lastOptimization,
    optimizationCount: optimizationRef.current.optimizationCount,
    checkPerformance,
    optimizePerformance
  };
}
