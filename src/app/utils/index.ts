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
