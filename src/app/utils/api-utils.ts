/**
 * API 관련 유틸리티 함수들
 */

/**
 * API 요청에 사용할 기본 헤더
 */
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

/**
 * API 요청에 적용할 타임아웃(ms)
 */
export const API_TIMEOUT = 30000; // 30초

/**
 * API 요청을 위한 기본 옵션
 */
export const API_DEFAULT_OPTIONS = {
  headers: DEFAULT_HEADERS,
  credentials: 'same-origin' as RequestCredentials,
};

/**
 * API 요청에 타임아웃을 적용하는 래퍼 함수
 * @param promise API 요청 Promise
 * @param timeout 타임아웃(ms)
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeout: number = API_TIMEOUT
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), timeout);
    }),
  ]);
}

/**
 * API 요청 에러 처리 함수
 * @param error API 요청 중 발생한 에러
 */
export function handleApiError(error: unknown): { message: string; status?: number } {
  if (error instanceof Error) {
    return { message: error.message };
  }
  
  if (typeof error === 'string') {
    return { message: error };
  }
  
  return { message: 'Unknown API error' };
}

/**
 * 요청 재시도 함수
 * @param fn 실행할 함수
 * @param retries 재시도 횟수
 * @param delay 재시도 간격(ms)
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 1) throw error;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay);
  }
}

/**
 * API 엔드포인트 URL 생성 함수
 * @param path API 경로
 * @param params 쿼리 파라미터
 */
export function createApiUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path, window.location.origin);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  return url.toString();
}
