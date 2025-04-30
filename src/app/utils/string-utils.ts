/**
 * 문자열 유틸리티 함수
 */

/**
 * 문자열 잘라내기 (긴 문자열 표시용)
 */
export function truncate(str: string, maxLength: number = 30): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * 문자열에서 HTML 태그 제거
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, '');
}

/**
 * 문자열이 비어있는지 확인 (null, undefined, 빈 문자열)
 */
export function isEmpty(str: string | null | undefined): boolean {
  return str === null || str === undefined || str.trim() === '';
}

/**
 * 문자열 좌우 공백 제거 (null, undefined 안전)
 */
export function safeTrim(str: string | null | undefined): string {
  if (str === null || str === undefined) return '';
  return str.trim();
}
