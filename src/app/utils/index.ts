/**
 * 유틸리티 함수 통합 모듈
 * 
 * 자주 사용되는 유틸리티 함수들을 중앙 집중화하여 내보냅니다.
 */

// 메모리 관리 관련 함수 재내보내기
export * from './memory-management';

// 메모리 최적화 관련 함수 재내보내기
export * from './memory-optimizer';

// 네이티브 모듈 브릿지 함수 재내보내기
export * from './native-memory-bridge';

// GPU 가속화 관련 함수 재내보내기
export * from './gpu-acceleration';

// 메모리 관련 훅 재내보내기
export { 
  useMemory, 
  useMemorySettings,
  useAutoMemoryOptimization 
} from './memory/hooks';

// 메모리 포맷팅 유틸리티 재내보내기
export * from './memory/format-utils';

// GC 유틸리티 재내보내기
export {
  suggestGarbageCollection,
  cleanAllCaches,
  clearBrowserCaches,
  clearStorageCaches
} from './memory/gc-utils';

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
  const message = error instanceof Error 
    ? error.message 
    : String(error);
  
  console.error(`[${context}]`, error);
  
  return message;
}

/**
 * 비동기 대기 함수
 * @param ms 대기 시간 (ms)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
