/**
 * 메모리 풀 관리 유틸리티
 * 
 * 객체 생성 및 파괴로 인한 메모리 단편화와 GC 부하를 줄이기 위한
 * 객체 풀링 메커니즘을 제공합니다.
 */

// 메모리 풀 인터페이스
interface MemoryPool<T> {
  name: string;
  pool: T[];
  createObject: () => T;
  resetObject?: (obj: T) => void;
  maxSize: number;
  lastUsed: number;
}

// 전역 메모리 풀 저장소
export const memoryPools: Map<string, MemoryPool<any>> = new Map();

// 마지막 풀 정리 시간
let lastPoolCleanup = Date.now();

/**
 * 메모리 풀에서 객체 가져오기
 * @param poolName 풀 이름
 * @returns 풀에서 가져온 객체
 */
export function acquireFromPool<T>(poolName: string): T {
  // 풀이 없으면 생성
  if (!memoryPools.has(poolName)) {
    console.warn(`메모리 풀 "${poolName}"이 존재하지 않습니다. 기본 풀을 생성합니다.`);
    createPool(poolName, () => ({} as T), { maxSize: 50 });
  }
  
  const pool = memoryPools.get(poolName)!;
  pool.lastUsed = Date.now();
  
  // 풀에 객체가 있으면 반환
  if (pool.pool.length > 0) {
    return pool.pool.pop()!;
  }
  
  // 풀이 비어있으면 새 객체 생성
  return pool.createObject();
}

/**
 * 객체를 메모리 풀에 반환
 * @param poolName 풀 이름
 * @param obj 반환할 객체
 */
export function releaseToPool<T>(poolName: string, obj: T): void {
  if (!memoryPools.has(poolName)) {
    console.warn(`메모리 풀 "${poolName}"이 존재하지 않습니다. 객체는 폐기됩니다.`);
    return;
  }
  
  const pool = memoryPools.get(poolName)!;
  pool.lastUsed = Date.now();
  
  // 풀 크기가 최대 크기보다 작으면 객체 추가
  if (pool.pool.length < pool.maxSize) {
    // 객체 초기화 함수가 있으면 호출
    if (pool.resetObject) {
      pool.resetObject(obj);
    }
    
    // 풀에 객체 추가
    pool.pool.push(obj);
  }
  // 풀이 가득 찬 경우 객체는 자동으로 폐기됨
}

/**
 * 새 메모리 풀 생성
 * @param name 풀 이름
 * @param createFn 객체 생성 함수
 * @param options 풀 옵션
 */
export function createPool<T>(
  name: string,
  createFn: () => T,
  options: {
    maxSize?: number;
    resetFn?: (obj: T) => void;
    prealloc?: number;
  } = {}
): void {
  // 기본값 설정
  const maxSize = options.maxSize || 100;
  const prealloc = options.prealloc || 0;
  
  // 풀 생성
  const pool: MemoryPool<T> = {
    name,
    pool: [],
    createObject: createFn,
    resetObject: options.resetFn,
    maxSize,
    lastUsed: Date.now()
  };
  
  // 사전 할당
  if (prealloc > 0) {
    for (let i = 0; i < Math.min(prealloc, maxSize); i++) {
      pool.pool.push(createFn());
    }
  }
  
  // 풀 저장
  memoryPools.set(name, pool);
}

/**
 * 모든 풀에서 메모리 객체 해제
 */
export function releaseAllPooledObjects(): void {
  memoryPools.forEach(pool => {
    console.log(`메모리 풀 "${pool.name}" 정리: ${pool.pool.length}개 객체 해제`);
    pool.pool.length = 0;
  });
}

/**
 * 오래된 메모리 풀 정리
 * 일정 시간 사용되지 않은 풀 정리
 * @param maxIdleTime 최대 유휴 시간 (밀리초)
 */
export function cleanupIdlePools(maxIdleTime: number = 5 * 60 * 1000): void {
  const now = Date.now();
  
  // 너무 자주 실행되지 않도록 제한
  if (now - lastPoolCleanup < 60000) {
    return;
  }
  
  lastPoolCleanup = now;
  
  memoryPools.forEach((pool, name) => {
    if (now - pool.lastUsed > maxIdleTime) {
      // 오래된 풀 정리
      pool.pool.length = 0;
      memoryPools.delete(name);
      console.log(`오래된 메모리 풀 "${name}" 제거됨`);
    }
  });
}
