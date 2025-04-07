/**
 * 로컬 스토리지 관련 유틸리티 함수
 */

/**
 * 로컬 스토리지에서 값 가져오기
 * @param key 스토리지 키
 * @returns 저장된 값 또는 null
 */
export function getLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`로컬 스토리지에서 '${key}' 읽기 오류:`, error);
    return null;
  }
}

/**
 * 로컬 스토리지에 값 저장하기
 * @param key 스토리지 키
 * @param value 저장할 값
 * @returns 저장 성공 여부
 */
export function setLocalStorage(key: string, value: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`로컬 스토리지에 '${key}' 저장 오류:`, error);
    return false;
  }
}

/**
 * 로컬 스토리지에서 값 삭제하기
 * @param key 스토리지 키
 * @returns 삭제 성공 여부
 */
export function removeLocalStorage(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`로컬 스토리지에서 '${key}' 삭제 오류:`, error);
    return false;
  }
}

/**
 * 로컬 스토리지에서 JSON 형식 값 가져오기
 * @param key 스토리지 키
 * @returns 파싱된 JSON 값 또는 null
 */
export function getLocalStorageJson<T>(key: string): T | null {
  const value = getLocalStorage(key);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`로컬 스토리지에서 JSON 파싱 오류 (${key}):`, error);
    return null;
  }
}

/**
 * 로컬 스토리지에 JSON 형식 값 저장하기
 * @param key 스토리지 키
 * @param value 저장할 객체
 * @returns 저장 성공 여부
 */
export function setLocalStorageJson<T>(key: string, value: T): boolean {
  try {
    const jsonValue = JSON.stringify(value);
    return setLocalStorage(key, jsonValue);
  } catch (error) {
    console.error(`객체를 JSON으로 변환 중 오류 (${key}):`, error);
    return false;
  }
}
