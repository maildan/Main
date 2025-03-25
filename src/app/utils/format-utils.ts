/**
 * 포맷팅 유틸리티 함수
 */

/**
 * 바이트 크기를 사람이 읽기 쉬운 형태로 변환
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * 숫자를 천 단위 구분자가 있는 문자열로 변환
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * 시간(밀리초)을 읽기 쉬운 형태로 변환
 */
export function formatTime(milliseconds: number): string {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * WPM(분당 단어 수) 포맷팅
 */
export function formatWPM(wpm: number): string {
  return `${Math.round(wpm)} WPM`;
}
