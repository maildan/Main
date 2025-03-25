/**
 * 수학 유틸리티 함수
 */

/**
 * 범위 내 난수 생성
 */
export function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 두 숫자 사이의 비율 계산
 */
export function calculateRatio(value: number, total: number): number {
  if (total === 0) return 0;
  return value / total;
}

/**
 * 백분율 계산
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * 숫자 배열의 평균값 계산
 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

/**
 * 숫자 배열의 표준편차 계산
 */
export function calculateStandardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  
  const avg = calculateAverage(values);
  const squareDiffs = values.map(value => {
    const diff = value - avg;
    return diff * diff;
  });
  
  const avgSquareDiff = calculateAverage(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}
