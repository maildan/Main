/**
 * 날짜 유틸리티 함수
 */

/**
 * 현재 타임스탬프 가져오기
 */
export function getCurrentTimestamp(): number {
  return Date.now();
}

/**
 * 날짜를 포맷팅된 문자열로 변환
 */
export function formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 두 날짜 사이의 차이를 밀리초로 계산
 */
export function getDateDiff(date1: Date, date2: Date): number {
  return Math.abs(date1.getTime() - date2.getTime());
}

/**
 * 특정 시간이 경과했는지 확인
 */
export function hasElapsed(timestamp: number, milliseconds: number): boolean {
  return Date.now() - timestamp > milliseconds;
}
