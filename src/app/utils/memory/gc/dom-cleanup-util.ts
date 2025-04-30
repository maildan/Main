/**
 * DOM 클린업 유틸리티
 * 메모리 사용량을 줄이기 위한 DOM 관련 정리 함수
 */

/**
 * DOM 요소 정리 수행
 * 필요없는 DOM 요소와 이벤트 리스너 제거
 */
export function cleanupDOM(): void {
  try {
    // 비표시 이미지 최적화
    optimizeOffscreenImages();
    
    // 숨겨진 요소 정리
    cleanupHiddenElements();
    
    // 이벤트 리스너 정리
    cleanupUnusedEventListeners();
    
    console.log('DOM 정리 완료');
  } catch (error) {
    console.error('DOM 정리 중 오류:', error);
  }
}

/**
 * 화면에 보이지 않는 이미지 최적화
 */
function optimizeOffscreenImages(): void {
  try {
    const images = document.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
    let optimizedCount = 0;
    
    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      const isVisible = (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
      
      // 화면 밖의 이미지를 저해상도로 대체하거나 데이터 속성으로 원본 주소 이동
      if (!isVisible && !img.dataset.original) {
        img.dataset.original = img.src;
        img.src = '';
        optimizedCount++;
      }
    });
    
    if (optimizedCount > 0) {
      console.log(`최적화된 오프스크린 이미지: ${optimizedCount}개`);
    }
  } catch (error) {
    console.warn('이미지 최적화 중 오류:', error);
  }
}

/**
 * 숨겨진 요소 정리
 */
function cleanupHiddenElements(): void {
  try {
    // display: none인 대형 컨테이너 정리
    const hiddenElements = document.querySelectorAll('[style*="display: none"]') as NodeListOf<HTMLElement>;
    let cleanedElements = 0;
    
    hiddenElements.forEach(el => {
      // 단, 애플리케이션에 중요한 요소는 제외
      if (!el.classList.contains('app-critical') && 
          !el.id.includes('critical') &&
          el.children.length > 10) {
        // 내용 임시 제거 (참조는 유지)
        el.innerHTML = '';
        cleanedElements++;
      }
    });
    
    if (cleanedElements > 0) {
      console.log(`정리된 숨겨진 요소: ${cleanedElements}개`);
    }
  } catch (error) {
    console.warn('숨겨진 요소 정리 중 오류:', error);
  }
}

/**
 * 사용하지 않는 이벤트 리스너 정리
 */
function cleanupUnusedEventListeners(): void {
  // 이 기능은 완전히 구현하기 어려움
  // DOM API에서 요소에 연결된 이벤트 리스너를 직접 확인하는 방법이 없음
  console.log('이벤트 리스너 정리 - 현재 API 제한으로 인해 구현되지 않음');
}
