/**
 * 캐싱 관련 유틸리티
 * 약한 참조 기반 캐시 등 메모리 효율적인 캐싱 기능 제공
 */

/**
 * 대형 객체 캐시 처리를 위한 WeakMap
 * 순환 참조 방지와 GC 허용을 위해 WeakMap 사용
 */
const objectCache = new WeakMap<object, boolean>();

/**
 * 객체를 약한 참조로 캐싱
 * @param key 객체 키 (참조형만 가능)
 * @param value 저장할 값
 */
export function weakCache<T extends object>(key: T, value: boolean = true): void {
  objectCache.set(key, value);
}

/**
 * 약한 참조 캐시에서 객체 확인
 * @param key 객체 키
 * @returns {boolean} 캐시 존재 여부
 */
export function hasWeakCache<T extends object>(key: T): boolean {
  return objectCache.has(key);
}

/**
 * 재사용 가능한 객체 생성
 * 메모리 할당 최소화를 위한 객체 풀링
 */
export const reusableObject = <T extends object>(initialValue: T): { get(): T; reset(): void } => {
  let value = { ...initialValue };
  
  return {
    get(): T {
      return value;
    },
    reset(): void {
      value = { ...initialValue };
    }
  };
};
