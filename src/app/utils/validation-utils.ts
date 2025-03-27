/**
 * 데이터 검증 유틸리티 함수들
 */

/**
 * 이메일 유효성 검증
 * @param email 검증할 이메일 주소
 */
export function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * URL 유효성 검증
 * @param url 검증할 URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 문자열 길이 검증
 * @param str 검증할 문자열
 * @param min 최소 길이
 * @param max 최대 길이
 */
export function isValidLength(str: string, min: number, max: number): boolean {
  const length = str.trim().length;
  return length >= min && length <= max;
}

/**
 * 비밀번호 강도 검증
 * @param password 검증할 비밀번호
 */
export function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  let score = 0;
  
  // 길이 점수
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // 복잡성 점수
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  // 점수에 따른 강도 반환
  if (score >= 4) return 'strong';
  if (score >= 2) return 'medium';
  return 'weak';
}

/**
 * 숫자 범위 검증
 * @param value 검증할 값
 * @param min 최소값
 * @param max 최대값
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * 필수 필드 검증
 * @param obj 검증할 객체
 * @param fields 필수 필드 배열
 */
export function hasRequiredFields(obj: Record<string, unknown>, fields: string[]): boolean {
  return fields.every(field => {
    const value = obj[field];
    
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim() !== '';
    
    return true;
  });
}

/**
 * 정규식 패턴 검증
 * @param value 검증할 값
 * @param pattern 정규식 패턴
 */
export function matchesPattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

/**
 * 한글 문자열 검증
 * @param value 검증할 문자열
 */
export function isKorean(value: string): boolean {
  const koreanRegex = /^[가-힣]+$/;
  return koreanRegex.test(value);
}

/**
 * 영문자 문자열 검증
 * @param value 검증할 문자열
 */
export function isAlphabetic(value: string): boolean {
  const alphaRegex = /^[a-zA-Z]+$/;
  return alphaRegex.test(value);
}

/**
 * 알파벳과 숫자만 포함하는 문자열 검증
 * @param value 검증할 문자열
 */
export function isAlphanumeric(value: string): boolean {
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(value);
}
