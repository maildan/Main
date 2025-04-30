/**
 * 로컬 스토리지 유틸리티 함수
 */

/**
 * 로컬 스토리지에서 값 가져오기
 */
export async function getLocalStorage<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined') return null;

  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`로컬 스토리지에서 ${key} 가져오기 오류:`, error);
    return null;
  }
}

/**
 * 로컬 스토리지에 값 저장하기
 */
export async function setLocalStorage<T>(key: string, value: T): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`로컬 스토리지에 ${key} 저장 오류:`, error);
    return false;
  }
}

/**
 * 로컬 스토리지에서 값 삭제하기
 */
export async function removeLocalStorage(key: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`로컬 스토리지에서 ${key} 삭제 오류:`, error);
    return false;
  }
}
