/**
 * 에러 처리를 위한 유틸리티 함수 모음
 */

/**
 * 에러 객체를 사용자 친화적인 메시지로 변환
 * @param error - 에러 객체 또는 문자열
 * @returns 사용자 친화적인 에러 메시지
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  
  return '알 수 없는 오류가 발생했습니다.';
};

/**
 * 에러 객체를 콘솔에 출력하고 사용자 친화적인 메시지 반환
 * @param error - 에러 객체
 * @param context - 에러가 발생한 컨텍스트 정보
 * @returns 사용자 친화적인 에러 메시지
 */
export const logErrorAndReturn = (error: unknown, context: string = ''): string => {
  const errorMessage = getErrorMessage(error);
  const errorObject = error instanceof Error ? error : new Error(errorMessage);
  
  console.error(`Error${context ? ` in ${context}` : ''}: `, errorObject);
  
  return errorMessage;
};

/**
 * 비동기 함수를 try-catch로 래핑하여 에러 처리
 * @param asyncFn - 래핑할 비동기 함수
 * @param errorHandler - 에러 처리 함수
 * @returns 래핑된 함수
 */
export const withErrorHandling = <T, Args extends any[]>(
  asyncFn: (...args: Args) => Promise<T>,
  errorHandler: (error: unknown) => void
) => {
  return async (...args: Args): Promise<T | null> => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      errorHandler(error);
      return null;
    }
  };
};

/**
 * 에러 발생 시 기본값을 반환하는 비동기 함수 래퍼
 * @param asyncFn - 래핑할 비동기 함수
 * @param defaultValue - 에러 발생 시 반환할 기본값
 * @returns 래핑된 함수
 */
export const withDefaultOnError = <T, Args extends any[]>(
  asyncFn: (...args: Args) => Promise<T>,
  defaultValue: T
) => {
  return async (...args: Args): Promise<T> => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      console.error('Error in async function: ', error);
      return defaultValue;
    }
  };
};

/**
 * API 호출 결과를 검증하고 에러 처리
 * @param response - API 응답 객체
 * @returns 검증된 응답 데이터
 */
export const validateApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage = errorData?.message || `API 요청 실패: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }
  
  return await response.json() as T;
};

/**
 * 사용자 정의 에러 클래스
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;
  
  constructor(message: string, code: string = 'UNKNOWN_ERROR', context?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.context = context;
    
    // Error 객체의 prototype 체인 유지
    Object.setPrototypeOf(this, AppError.prototype);
  }
  
  /**
   * 에러를 사용자 친화적인 메시지로 변환
   */
  public toUserMessage(): string {
    const errorMessages: Record<string, string> = {
      'NETWORK_ERROR': '네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인해주세요.',
      'AUTH_ERROR': '인증에 실패했습니다. 다시 로그인해주세요.',
      'PERMISSION_ERROR': '권한이 없습니다.',
      'NOT_FOUND': '요청한 정보를 찾을 수 없습니다.',
      'VALIDATION_ERROR': '입력 정보가 올바르지 않습니다.',
      'SERVER_ERROR': '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      'UNKNOWN_ERROR': '알 수 없는 오류가 발생했습니다.'
    };
    
    return errorMessages[this.code] || this.message;
  }
}
