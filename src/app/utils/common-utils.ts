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
