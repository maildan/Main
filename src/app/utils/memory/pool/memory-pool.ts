/**
 * 메모리 풀 관련 기능 모듈
 * 메모리 풀링으로 메모리 단편화와 GC 압력 감소
 */

// 메모리 풀 타입 정의
export interface MemoryPoolsType {
  analysisResults: Record<string, any>[];
  arrays: {
    small: any[][];
    medium: any[][];
    large: any[][];
  };
  objects: Record<string, any>[];
  inUse: WeakMap<object, boolean>;
}

// 메모리 풀링을 위한 재사용 객체 - 선언과 동시에 초기화
export const memoryPools: MemoryPoolsType = {
  // 분석 결과 저장용 객체 풀
  analysisResults: Array.from({ length: 10 }, () => ({})),
  // 임시 배열 풀 (여러 크기의 배열 미리 할당)
  arrays: {
    small: Array.from({ length: 20 }, () => new Array(32)),
    medium: Array.from({ length: 10 }, () => new Array(128)),
    large: Array.from({ length: 5 }, () => new Array(512))
  },
  // 임시 객체 풀
  objects: Array.from({ length: 15 }, () => ({})),
  // 현재 사용 중인 풀 객체 추적
  inUse: new WeakMap()
};

/**
 * 메모리 풀에서 객체 획득
 * @param type 객체 유형 ('result', 'array', 'object')
 * @param size 배열의 경우 크기 카테고리 ('small', 'medium', 'large')
 * @returns 재사용 가능한 객체
 */
export function acquireFromPool(type: 'result' | 'array' | 'object', size?: 'small' | 'medium' | 'large'): any {
  try {
    if (type === 'result') {
      // 결과 객체 풀에서 사용 가능한 객체 찾기
      const availableResult = memoryPools.analysisResults.find(obj => !memoryPools.inUse.has(obj));
      
      if (availableResult) {
        // 객체 초기화 및 사용 중 표시
        Object.keys(availableResult).forEach(key => delete availableResult[key]);
        memoryPools.inUse.set(availableResult, true);
        return availableResult;
      }
      
      // 모든 객체가 사용 중이면 새 객체 생성
      const newResult = {} as Record<string, any>;
      memoryPools.inUse.set(newResult, true);
      return newResult;
    } 
    else if (type === 'array') {
      // 적절한 크기의 배열 풀에서 배열 획득
      const sizeCategory = size || 'small';
      const availableArray = memoryPools.arrays[sizeCategory].find(arr => !memoryPools.inUse.has(arr));
      
      if (availableArray) {
        availableArray.length = 0; // 배열 초기화
        memoryPools.inUse.set(availableArray, true);
        return availableArray;
      }
      
      // 모든 배열이 사용 중이면 새 배열 생성
      const newArray: any[] = [];
      memoryPools.inUse.set(newArray, true);
      return newArray;
    }
    else if (type === 'object') {
      // 객체 풀에서 사용 가능한 객체 찾기
      const availableObject = memoryPools.objects.find(obj => !memoryPools.inUse.has(obj));
      
      if (availableObject) {
        Object.keys(availableObject).forEach(key => delete availableObject[key]);
        memoryPools.inUse.set(availableObject, true);
        return availableObject;
      }
      
      // 모든 객체가 사용 중이면 새 객체 생성
      const newObject = {} as Record<string, any>;
      memoryPools.inUse.set(newObject, true);
      return newObject;
    }
    
    return null;
  } catch (error) {
    console.error('메모리 풀 획득 오류:', error);
    // 폴백: 새 객체 생성
    return type === 'array' ? [] : {};
  }
}

/**
 * 풀로 객체 반환 (재사용 가능하도록)
 * @param obj 반환할 객체
 */
export function releaseToPool(obj: any): void {
  if (!obj) return;
  
  try {
    // 사용 중 표시 제거
    memoryPools.inUse.delete(obj);
    
    // 배열인 경우 초기화
    if (Array.isArray(obj)) {
      obj.length = 0;
    }
    // 객체인 경우 모든 속성 제거
    else if (typeof obj === 'object') {
      Object.keys(obj).forEach(key => delete obj[key]);
    }
  } catch (error) {
    console.error('메모리 풀 반환 오류:', error);
  }
}

/**
 * 모든 풀링된 객체 해제
 */
export function releaseAllPooledObjects(): void {
  try {
    // 모든 결과 객체 초기화
    memoryPools.analysisResults.forEach(obj => {
      Object.keys(obj).forEach(key => delete obj[key]);
      memoryPools.inUse.delete(obj);
    });
    
    // 모든 배열 초기화
    Object.values(memoryPools.arrays).forEach(arrayPool => {
      arrayPool.forEach(arr => {
        arr.length = 0;
        memoryPools.inUse.delete(arr);
      });
    });
    
    // 모든 객체 초기화
    memoryPools.objects.forEach(obj => {
      Object.keys(obj).forEach(key => delete obj[key]);
      memoryPools.inUse.delete(obj);
    });
  } catch (error) {
    console.warn('풀링된 객체 해제 중 오류:', error);
  }
}
