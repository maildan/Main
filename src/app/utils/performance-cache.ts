/**
 * 성능 최적화를 위한 캐시 유틸리티
 * 
 * 초기 렌더링 및 실행 시간 개선을 위한 다양한 캐싱 기법을 제공합니다.
 */

// 전역 메모이제이션 캐시
interface MemoCache<T> {
  [key: string]: {
    value: T;
    expires: number;
  };
}

const memoCache: MemoCache<any> = {};

/**
 * 함수 결과를 메모이제이션하는 고차 함수
 * @param fn 캐싱할 함수
 * @param ttl 캐시 유효시간 (밀리초)
 * @param keyFn 캐시 키 생성 함수 (기본값: 인자를 JSON으로 변환)
 */
export function memoize<T, A extends any[]>(
  fn: (...args: A) => T, 
  ttl: number = 60_000, // 기본값: 1분
  keyFn: (...args: A) => string = (...args) => JSON.stringify(args)
): (...args: A) => T {
  return (...args: A): T => {
    const key = keyFn(...args);
    const now = Date.now();
    
    if (memoCache[key] && memoCache[key].expires > now) {
      return memoCache[key].value;
    }
    
    const result = fn(...args);
    memoCache[key] = {
      value: result,
      expires: now + ttl
    };
    
    return result;
  };
}

/**
 * 캐시 정리 (정기적으로 호출하여 메모리 최적화)
 */
export function cleanupCache(): void {
  const now = Date.now();
  const keys = Object.keys(memoCache);
  
  for (const key of keys) {
    if (memoCache[key].expires < now) {
      delete memoCache[key];
    }
  }
}

// 캐시 정리를 위한 인터벌 설정 (5분마다)
export function setupAutomaticCacheCleanup(intervalMs: number = 300_000): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const intervalId = setInterval(cleanupCache, intervalMs);
  
  // 클린업 함수 반환
  return () => clearInterval(intervalId);
}

// 컴포넌트 렌더링 최적화를 위한 코드 분할 헬퍼
export function setupEagerLoading(): void {
  if (typeof window === 'undefined') return;
  
  // 브라우저 유휴 시간에 주요 컴포넌트 미리 로드
  const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  
  idleCallback(() => {
    // 필요한 모듈 미리 로드
    import('../components/MemoryUsageMonitor')
      .catch(e => console.warn('Preload failed:', e));
      
    import('../components/NativeModuleTestPanel')
      .catch(e => console.warn('Preload failed:', e));
  });
}

// 렌더링 성능 측정 유틸리티
export function measureRenderTime(componentName: string): () => void {
  if (process.env.NODE_ENV !== 'development') return () => {};
  
  const startTime = performance.now();
  return () => {
    const endTime = performance.now();
    console.log(`[Render] ${componentName}: ${(endTime - startTime).toFixed(2)}ms`);
  };
}
