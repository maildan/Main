/**
 * 숫자 관련 유틸리티 함수들
 */

/**
 * 숫자를 일정 범위 내로 제한합니다.
 * @param num 제한할 숫자
 * @param min 최소값
 * @param max 최대값
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

/**
 * 숫자에 쉼표를 추가하여 포맷팅합니다.
 * @param num 포맷팅할 숫자
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * 숫자를 백분율 형식으로 포맷팅합니다.
 * @param num 포맷팅할 숫자 (0-1 범위)
 * @param decimals 소수점 자릿수
 */
export function formatPercent(num: number, decimals: number = 1): string {
  return `${(num * 100).toFixed(decimals)}%`;
}

/**
 * 주어진 크기(바이트)를 적절한 단위로 포맷팅합니다.
 * @param bytes 바이트 크기
 * @param decimals 소수점 자릿수
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * 두 숫자 사이의 무작위 정수를 생성합니다.
 * @param min 최소값 (포함)
 * @param max 최대값 (포함)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 숫자의 소수점 자릿수를 제한합니다.
 * @param num 제한할 숫자
 * @param decimals 소수점 자릿수
 */
export function roundToDecimals(num: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * 숫자를 지정된 단위로 변환합니다.
 * @param value 변환할 값
 * @param fromUnit 원래 단위
 * @param toUnit 대상 단위
 */
export function convertUnit(
  value: number, 
  fromUnit: 'bytes' | 'kb' | 'mb' | 'gb', 
  toUnit: 'bytes' | 'kb' | 'mb' | 'gb'
): number {
  const units = { bytes: 0, kb: 1, mb: 2, gb: 3 };
  const diff = units[toUnit] - units[fromUnit];
  
  if (diff === 0) return value;
  return diff > 0 
    ? value / Math.pow(1024, Math.abs(diff))
    : value * Math.pow(1024, Math.abs(diff));
}
