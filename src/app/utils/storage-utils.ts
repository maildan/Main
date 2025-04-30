/**
 * 로컬 스토리지 유틸리티 함수
 * 비동기 인터페이스를 제공하여 일관성 있는 사용을 지원합니다.
 */

/**
 * 로컬 스토리지에서 데이터 가져오기
 * @param key 스토리지 키
 * @returns Promise<T | null> 저장된 데이터 또는 null
 */
export async function getLocalStorage<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`로컬 스토리지에서 ${key} 가져오기 오류:`, error);
    return null;
  }
}

/**
 * 로컬 스토리지에 데이터 저장
 * @param key 스토리지 키
 * @param value 저장할 데이터
 * @returns Promise<boolean> 저장 성공 여부
 */
export async function setLocalStorage(key: string, value: any): Promise<boolean> {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`로컬 스토리지에 ${key} 저장 오류:`, error);
    return false;
  }
}

/**
 * 로컬 스토리지에서 데이터 삭제
 * @param key 스토리지 키
 * @returns Promise<boolean> 삭제 성공 여부
 */
export async function removeLocalStorage(key: string): Promise<boolean> {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`로컬 스토리지에서 ${key} 삭제 오류:`, error);
    return false;
  }
}

/**
 * 로컬 스토리지 비우기
 * @returns Promise<boolean> 성공 여부
 */
export async function clearLocalStorage(): Promise<boolean> {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('로컬 스토리지 비우기 오류:', error);
    return false;
  }
}
