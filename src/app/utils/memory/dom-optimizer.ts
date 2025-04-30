/**
 * DOM 최적화 관련 유틸리티
 * DOM 요소 정리 및 최적화 기능 제공
 */

/**
 * 요소가 뷰포트 내에 있는지 확인
 * @param {Element} el 확인할 요소
 * @returns {boolean} 뷰포트 내 존재 여부
 */
export function isElementInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * DOM 요소를 정리합니다.
 */
export function cleanupDOM(): void {
  try {
    // 숨겨진 컨텐츠의 비표시 처리
    const hiddenElements = document.querySelectorAll('.hidden, [hidden], [style*="display: none"]');
    hiddenElements.forEach(el => {
      if (el instanceof HTMLElement) {
        el.innerHTML = '';
      }
    });
    
    // 임시 요소 제거
    const tempElements = document.querySelectorAll('.temp-element, .cached-view');
    tempElements.forEach(el => el.remove());
  } catch (error) {
    console.error('DOM 정리 오류:', error);
  }
}

/**
 * 사용하지 않는 이미지 참조를 해제합니다.
 */
export function unloadUnusedImages(): void {
  try {
    // 화면에 보이지 않는 이미지 참조 해제
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      // 뷰포트 밖에 있거나 숨겨진 이미지
      if (rect.top < -1000 || rect.bottom > window.innerHeight + 1000 || 
          rect.left < -1000 || rect.right > window.innerWidth + 1000 ||
          img.style.display === 'none' || img.style.visibility === 'hidden') {
        
        // 원본 src 저장 후 비우기
        if (!img.dataset.originalSrc && img.src) {
          img.dataset.originalSrc = img.src;
          img.src = '';
        }
      } else if (img.dataset.originalSrc && !img.src) {
        // 다시 보이는 이미지는 복원
        img.src = img.dataset.originalSrc;
      }
    });
  } catch (error) {
    console.error('이미지 정리 오류:', error);
  }
}
