/**
 * 유틸리티 모듈 통합 내보내기
 */

// 공통 유틸리티 함수
export * from './common-utils';

// 메모리 관련 유틸리티
export * from './memory';

// 파일 관련 유틸리티
export * from './file-utils';

// 타입 변환 유틸리티
export * from './type-converters';

// 성능 측정 유틸리티
export * from './performance-metrics';

// GPU 가속 유틸리티
export * from './gpu-acceleration';

// 메모리 최적화 유틸리티
export * from './memory-optimizer';

// 문제가 있던 참조 - 존재하는 모듈로 수정하거나 주석 처리
// export * from './storage-utils'; // 파일이 없으면 주석 처리
// export * from './scroll-utils'; // 파일이 없으면 주석 처리

// 네이티브 모듈 클라이언트
export * from './nativeModuleClient';

// 시스템 모니터링
export * from './system-monitor';

// 추가로 필요한 모듈들이 있다면 여기에 추가

/**
 * 딥 클론 함수
 * 객체의 깊은 복사본을 생성합니다.
 * @param obj 복사할 객체
 * @returns 복사된 객체
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, deepClone(value)])
  ) as T;
}

/**
 * 디바운스 함수
 * 연속적인 함수 호출을 제한합니다.
 * @param fn 실행할 함수
 * @param delay 지연 시간 (ms)
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

/**
 * 쓰로틀 함수
 * 일정 시간 동안 함수 호출을 제한합니다.
 * @param fn 실행할 함수
 * @param limit 제한 시간 (ms)
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T, 
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return function(...args: Parameters<T>) {
    const now = Date.now();
    
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * 에러 로깅 및 처리
 * @param error 에러 객체
 * @param context 문맥 정보
 */
export function handleError(error: unknown, context = ''): string {
  const errorMessage = error instanceof Error 
    ? error.message 
    : String(error);
    
  const errorDetails = {
    message: errorMessage,
    context,
    timestamp: new Date().toISOString(),
    stack: error instanceof Error ? error.stack : undefined
  };
  
  // 콘솔 로깅
  console.error(`[Error] ${context ? `[${context}] ` : ''}${errorMessage}`, errorDetails);
  
  // 에러 모니터링 시스템 연동 가능 (예: Sentry 등)
  
  return errorMessage;
}

/**
 * 비동기 대기 함수
 * @param ms 대기 시간 (ms)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 반복 가능한 지연 실행 (메모리 최적화 버전)
 * 설정된 간격으로 콜백을 최적화된 방식으로 실행
 * @param callback 실행할 콜백 함수
 * @param delay 지연 시간 (ms)
 * @param maxIterations 최대 반복 횟수 (선택적)
 */
export async function repeatedDelay<T>(
  callback: () => Promise<T> | T,
  delay: number,
  maxIterations?: number
): Promise<T[]> {
  const results: T[] = [];
  let iterations = 0;
  
  while (maxIterations === undefined || iterations < maxIterations) {
    try {
      const result = await callback();
      results.push(result);
      
      // 메모리 압력이 있을 경우 지연 시간 동적 조정
      if (window.__memoryOptimizer?.getMemoryUsagePercentage) {
        const memUsage = await window.__memoryOptimizer.getMemoryUsagePercentage();
        if (memUsage > 80) {
          // 메모리 사용량이 높으면 지연 시간 증가
          await sleep(delay * 1.5);
        } else {
          await sleep(delay);
        }
      } else {
        await sleep(delay);
      }
      
      iterations++;
    } catch (error) {
      handleError(error, 'repeatedDelay');
      break;
    }
  }
  
  return results;
}

/**
 * 메모리 정리를 포함한 비동기 재시도 함수
 * 실패 시 백오프 전략 및 메모리 최적화를 적용하여 재시도
 * @param fn 실행할 비동기 함수
 * @param options 재시도 옵션
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    optimizeMemoryOnRetry?: boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 300,
    maxDelay = 3000,
    factor = 2,
    optimizeMemoryOnRetry = true
  } = options;
  
  let attempt = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      if (attempt >= maxRetries) {
        throw error;
      }
      
      // 메모리 최적화 시도
      if (optimizeMemoryOnRetry && window.__memoryOptimizer?.optimizeMemory) {
        try {
          await window.__memoryOptimizer.optimizeMemory(false);
        } catch (optimizeError) {
          console.warn('메모리 최적화 중 오류:', optimizeError);
        }
      }
      
      // 지수 백오프 계산
      delay = Math.min(delay * factor, maxDelay);
      
      // 약간의 무작위성 추가 (jitter)
      const jitteredDelay = delay * (0.8 + Math.random() * 0.4);
      
      await sleep(jitteredDelay);
    }
  }
}
