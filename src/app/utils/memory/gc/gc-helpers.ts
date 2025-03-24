/**
 * 가비지 컬렉션 관련 헬퍼 함수
 */

/**
 * 로컬 가비지 컬렉션 힌트 - 순환 참조 방지를 위해 별도 구현
 */
export function localGarbageCollectionHint(): void {
  // 대형 배열 생성 및 삭제로 GC 유도
  const arrays = [];
  for (let i = 0; i < 10; i++) {
    arrays.push(new Uint8Array(100 * 1024)); // 100KB씩 할당
  }
  arrays.length = 0; // 참조 해제
}
