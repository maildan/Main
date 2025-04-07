/**
 * 공통 유틸리티 함수 모음
 * 여러 모듈에서 사용되는 유틸리티 함수를 중앙화하여 중복 코드 제거
 */

/**
 * 바이트 단위의 크기를 사람이 읽기 쉬운 형태로 변환합니다.
 * @param bytes - 포맷팅할 바이트 수
 * @param decimals - 소수점 자릿수 (기본값: 2)
 * @returns 포맷팅된 문자열 (예: "1.5 KB", "2.34 MB")
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 두 숫자 사이의 비율을 계산합니다.
 * @param value - 현재 값
 * @param total - 전체 값
 * @param decimals - 소수점 자릿수 (기본값: 2)
 * @returns 백분율 값
 */
export function calculatePercentage(value: number, total: number, decimals: number = 2): number {
  if (total === 0) return 0;
  return parseFloat(((value / total) * 100).toFixed(decimals));
}

/**
 * 숫자를 제한된 범위 내에 유지합니다.
 * @param value - 검사할 값
 * @param min - 최소값
 * @param max - 최대값
 * @returns 제한된 범위 내의 값
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * 현재 타임스탬프를 반환합니다.
 * @returns 현재 시간의 밀리초 타임스탬프
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * 지연 함수 (Promise 기반)
 * @param ms 지연 시간 (밀리초)
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * UUID 생성
 * @returns 생성된 UUID 문자열
 */
export function generateUUID(): string {
  // UUID v4 생성
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 객체 깊은 복사
 * @param obj 복사할 객체
 * @returns 복사된 객체
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 날짜 객체 처리
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  // 배열 처리
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }

  // 일반 객체 처리
  const clonedObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone((obj as any)[key]);
    }
  }

  return clonedObj as T;
}

/**
 * 두 객체 비교
 * @param obj1 첫 번째 객체
 * @param obj2 두 번째 객체
 * @returns 같으면 true, 다르면 false
 */
export function isEqual(obj1: any, obj2: any): boolean {
  // 기본 타입 또는 참조가 같을 경우
  if (obj1 === obj2) {
    return true;
  }

  // 둘 중 하나만 null이거나 객체가 아닌 경우
  if (obj1 === null || obj2 === null || typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return false;
  }

  // 날짜 객체 비교
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }

  // 배열 비교
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    if (obj1.length !== obj2.length) {
      return false;
    }

    return obj1.every((item, index) => isEqual(item, obj2[index]));
  }

  // 객체 키 개수가 다른 경우
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  // 각 키의 값 비교
  return keys1.every(key =>
    Object.prototype.hasOwnProperty.call(obj2, key) &&
    isEqual(obj1[key], obj2[key])
  );
}

/**
 * 디바운스 함수
 * @param func 실행할 함수
 * @param wait 지연 시간 (밀리초)
 * @returns 디바운스 처리된 함수
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>): void {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * 쓰로틀 함수
 * @param func 실행할 함수
 * @param limit 제한 시간 (밀리초)
 * @returns 쓰로틀 처리된 함수
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return function (...args: Parameters<T>): void {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
