/**
 * 요청 관련 유틸리티 함수들
 */

// 기본 요청 타임아웃 (30초)
const DEFAULT_TIMEOUT = 30000;

// 요청 상태 유형
type RequestState = 'idle' | 'loading' | 'success' | 'error';

/**
 * 요청 상태 클래스
 */
export class RequestStateManager<T> {
  state: RequestState = 'idle';
  data: T | null = null;
  error: Error | null = null;
  timestamp: number | null = null;
  
  constructor(initialData: T | null = null) {
    this.data = initialData;
  }
  
  setLoading(): void {
    this.state = 'loading';
    this.error = null;
  }
  
  setSuccess(data: T): void {
    this.state = 'success';
    this.data = data;
    this.error = null;
    this.timestamp = Date.now();
  }
  
  setError(error: Error): void {
    this.state = 'error';
    this.error = error;
    this.timestamp = Date.now();
  }
  
  isLoading(): boolean {
    return this.state === 'loading';
  }
  
  isSuccess(): boolean {
    return this.state === 'success';
  }
  
  isError(): boolean {
    return this.state === 'error';
  }
  
  reset(): void {
    this.state = 'idle';
    this.error = null;
  }
}

/**
 * 타임아웃 프로미스 생성 함수
 * @param ms 타임아웃 시간(ms)
 */
export function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
}

/**
 * 타임아웃이 있는 fetch 요청 함수
 * @param url 요청 URL
 * @param options fetch 옵션
 * @param timeout 타임아웃 시간(ms)
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    timeoutPromise(timeout)
  ]);
}

/**
 * 에러 응답 처리 함수
 * @param response fetch 응답 객체
 */
export async function handleErrorResponse(response: Response): Promise<Response> {
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    
    try {
      const data = await response.json();
      if (data.message || data.error) {
        errorMessage = data.message || data.error;
      }
    } catch (e) {
      // JSON 파싱 오류 무시
    }
    
    throw new Error(errorMessage);
  }
  
  return response;
}

/**
 * JSON 데이터를 가져오는 함수
 * @param url 요청 URL
 * @param options fetch 옵션
 * @param timeout 타임아웃 시간(ms)
 */
export async function fetchJson<T = any>(
  url: string,
  options: RequestInit = {},
  timeout: number = DEFAULT_TIMEOUT
): Promise<T> {
  const response = await fetchWithTimeout(url, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }, timeout);
  
  await handleErrorResponse(response);
  return response.json();
}

/**
 * 요청 디바운스 함수
 * @param key 요청 식별자
 * @param callback 실행할 콜백 함수
 * @param delay 디바운스 지연 시간(ms)
 */
export function debounceRequest<T>(
  key: string,
  callback: () => Promise<T>,
  delay: number = 300
): Promise<T> {
  const requestTimers: Record<string, NodeJS.Timeout> = {};
  
  return new Promise((resolve, reject) => {
    if (requestTimers[key]) {
      clearTimeout(requestTimers[key]);
    }
    
    requestTimers[key] = setTimeout(async () => {
      try {
        const result = await callback();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        delete requestTimers[key];
      }
    }, delay);
  });
}
