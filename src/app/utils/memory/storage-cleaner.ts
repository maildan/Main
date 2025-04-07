/**
 * 스토리지 정리 유틸리티
 * 
 * 로컬 및 세션 스토리지의 불필요한 데이터를 정리하는 기능 제공
 */

/**
 * 로컬 스토리지에서 임시 항목 정리
 * @returns 정리된 항목 수
 */
export function cleanLocalStorage(): number {
  if (typeof localStorage === 'undefined') {
    return 0;
  }

  let cleanedItems = 0;

  try {
    // 임시 데이터로 간주할 키 패턴
    const tempPatterns = [
      /^temp_/,
      /^cache_/,
      /^tmp_/,
      /_cache$/,
      /_temp$/
    ];

    // 만료 시간 정보 키
    const EXPIRY_PREFIX = 'expiry_';

    // 현재 시간
    const now = Date.now();

    // 모든 키를 배열로 가져오기
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }

    // 만료된 항목 및 임시 항목 정리
    for (const key of allKeys) {
      // 1. 만료 시간 확인
      if (key.startsWith(EXPIRY_PREFIX)) {
        // 실제 데이터 키
        const dataKey = key.substring(EXPIRY_PREFIX.length);

        // 만료 시간 가져오기
        const expiryTimeStr = localStorage.getItem(key);
        if (expiryTimeStr) {
          const expiryTime = parseInt(expiryTimeStr, 10);

          // 만료 확인
          if (now > expiryTime) {
            // 만료된 경우 데이터와 만료 시간 모두 삭제
            localStorage.removeItem(dataKey);
            localStorage.removeItem(key);
            cleanedItems += 2;
          }
        }
        continue;
      }

      // 2. 임시 항목 패턴 확인
      const isTempItem = tempPatterns.some(pattern => pattern.test(key));
      if (isTempItem) {
        localStorage.removeItem(key);
        cleanedItems++;
      }
    }

    return cleanedItems;
  } catch (error) {
    console.error('로컬 스토리지 정리 오류:', error);
    return cleanedItems;
  }
}

/**
 * 세션 스토리지에서 임시 항목 정리
 * @returns 정리된 항목 수
 */
export function cleanSessionStorage(): number {
  if (typeof sessionStorage === 'undefined') {
    return 0;
  }

  let cleanedItems = 0;

  try {
    // 임시 데이터로 간주할 키 패턴
    const tempPatterns = [
      /^temp_/,
      /^cache_/,
      /^tmp_/,
      /_cache$/,
      /_temp$/
    ];

    // 모든 키를 배열로 가져오기
    const allKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }

    // 임시 항목 정리
    for (const key of allKeys) {
      const isTempItem = tempPatterns.some(pattern => pattern.test(key));
      if (isTempItem) {
        sessionStorage.removeItem(key);
        cleanedItems++;
      }
    }

    return cleanedItems;
  } catch (error) {
    console.error('세션 스토리지 정리 오류:', error);
    return cleanedItems;
  }
}

/**
 * 큰 객체와 캐시 정리
 * @returns 정리된 항목 수
 */
export function clearLargeObjectsAndCaches(): number {
  if (typeof localStorage === 'undefined') {
    return 0;
  }

  let cleanedItems = 0;
  const MAX_ITEM_SIZE = 100 * 1024; // 100KB

  try {
    // 모든 키를 배열로 가져오기
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }

    // 큰 항목 찾기 및 정리
    for (const key of allKeys) {
      const value = localStorage.getItem(key);
      if (value && value.length > MAX_ITEM_SIZE) {
        // 중요 데이터가 아닌지 확인 (중요 데이터는 접두사로 표시)
        if (!key.startsWith('important_') && !key.startsWith('settings_')) {
          localStorage.removeItem(key);
          cleanedItems++;
        }
      }
    }

    // IndexedDB 캐시 정리
    if (typeof window !== 'undefined' && window.indexedDB) {
      // IndexedDB 정리는 비동기적으로 수행됨
      cleanUpIndexedDBCaches().catch(err =>
        console.error('IndexedDB 캐시 정리 오류:', err)
      );
    }

    return cleanedItems;
  } catch (error) {
    console.error('대용량 객체 정리 오류:', error);
    return cleanedItems;
  }
}

/**
 * IndexedDB 캐시 정리
 */
async function cleanUpIndexedDBCaches(): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return;
  }

  try {
    // 모든 데이터베이스 이름 가져오기
    const databases = await window.indexedDB.databases();

    for (const db of databases) {
      if (!db.name) continue;

      // 캐시 관련 데이터베이스 정리
      if (db.name.includes('cache') || db.name.includes('temp')) {
        await new Promise<void>((resolve, reject) => {
          const request = window.indexedDB.deleteDatabase(db.name!);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    }
  } catch (error) {
    console.error('IndexedDB 캐시 정리 오류:', error);
  }
}

/**
 * 모든 스토리지 캐시 정리
 * @returns 정리된 총 항목 수
 */
export function clearAllStorageCaches(): number {
  let total = 0;

  total += cleanLocalStorage();
  total += cleanSessionStorage();
  total += clearLargeObjectsAndCaches();

  return total;
}
