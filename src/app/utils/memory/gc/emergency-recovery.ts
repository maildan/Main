/**
 * 비상 메모리 복구 유틸리티
 */

/**
 * 비상 복구 모드
 * 메모리 부족 상황에서 적극적으로 리소스 정리
 * @returns {boolean} 성공 여부
 */
export function emergencyRecovery(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    console.warn('비상 메모리 복구 모드 활성화');
    
    // 강제 가비지 컬렉션
    forcedGarbageCollection();
    
    // 모든 캐시 정리
    clearAllCaches();
    
    // 비필수 DOM 요소 정리
    releaseNonEssentialDOM();
    
    // 이미지 다운샘플링
    downsampleImages();
    
    return true;
  } catch (error) {
    console.error('비상 복구 중 오류:', error);
    return false;
  }
}

/**
 * 강제 가비지 컬렉션
 */
function forcedGarbageCollection(): void {
  if (global.gc) {
    global.gc();
  }
  
  // 메모리 압력 생성
  createEmergencyPressure();
}

/**
 * 메모리 압력 상황에서 비상 조치 수행
 */
function createEmergencyPressure() {
  try {
    const buffers = [];
    // TypeScript 타입 오류 해결을 위해 문자열 키 사용
    const bufferKeys: Record<string, boolean> = {};
    
    // 임시 버퍼 할당으로 메모리 압력 생성
    for (let i = 0; i < 10; i++) {
      const key = `buffer_${i}`;
      buffers.push(new ArrayBuffer(1024 * 1024)); // 1MB
      bufferKeys[key] = true; // 문자열 키로 접근
    }
    
    // 참조 해제로 GC 유도
    for (let i = 0; i < buffers.length; i++) {
      // null 대신 undefined 사용 (타입 안전성 향상)
      buffers[i] = undefined as unknown as ArrayBuffer;
    }
    buffers.length = 0;
    
    // 명시적으로 객체 키 삭제
    Object.keys(bufferKeys).forEach(key => {
      delete bufferKeys[key];
    });
    
  } catch (error) {
    // 메모리 부족 오류는 무시 (의도된 효과)
    console.debug('비상 메모리 압력 생성 중 오류 발생');
  }
}

// 캐시 이름 타입 정의 - 타입 안전성 향상
type CacheName = '__memoryCache' | '__styleCache' | '__widgetCache' | '__imageResizeCache';

/**
 * 모든 캐시 정리
 */
function clearAllCaches(): void {
  // 객체 URL
  if (window.__objectUrls) {
    window.__objectUrls.forEach(url => URL.revokeObjectURL(url));
    window.__objectUrls.clear();
  }
  
  // 모든 커스텀 캐시 정리
  const cacheNames: CacheName[] = [
    '__memoryCache',
    '__styleCache',
    '__widgetCache',
    '__imageResizeCache'
  ];
  
  cacheNames.forEach(cacheName => {
    // 타입 안전성을 위한 타입 가드 사용
    const cache = window[cacheName as keyof Window];
    if (cache) {
      if (cache instanceof Map) {
        // Map 타입 확인 후 안전한 호출
        (cache as Map<any, any>).clear();
      } else if (typeof cache === 'object' && cache !== null) {
        // 객체인 경우 속성 제거
        Object.keys(cache as object).forEach(key => {
          delete (cache as Record<string, any>)[key];
        });
      }
    }
  });
}

/**
 * 비필수 DOM 요소 정리
 */
function releaseNonEssentialDOM(): void {
  // 구현 필요
}

/**
 * 이미지 다운샘플링
 */
function downsampleImages(): void {
  // 구현 필요
}
