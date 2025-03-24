/**
 * 이미지 최적화 관련 유틸리티
 * 이미지 캐시 정리 및 최적화 기능 제공
 */
import { isElementInViewport } from './dom-optimizer';

/**
 * 이미지 캐시 정리
 * 렌더러에 로드된 이미지 캐시를 효율적으로 관리
 */
export function clearImageCache(): void {
  try {
    // 화면에 보이지 않는 이미지 선택
    const images = document.querySelectorAll('img:not([data-keep-cache="true"])');
    images.forEach(img => {
      if (!isElementInViewport(img)) {
        // HTMLImageElement로 타입 캐스팅하여 src 속성에 접근
        const imgElement = img as HTMLImageElement;
        const originalSrc = imgElement.src;
        if (originalSrc) {
          imgElement.setAttribute('data-original-src', originalSrc);
          imgElement.src = '';
          
          // 필요할 때 복원하기 위한 이벤트 리스너
          imgElement.addEventListener('error', () => {
            const savedSrc = imgElement.getAttribute('data-original-src');
            if (savedSrc) imgElement.src = savedSrc;
          }, { once: true });
        }
      }
    });
  } catch (error) {
    console.warn('이미지 캐시 정리 중 오류:', error);
  }
}

/**
 * 이미지 리소스를 최적화하여 메모리 사용량을 줄입니다.
 * @returns Promise<boolean>
 */
export async function optimizeImageResources(): Promise<boolean> {
  try {
    // 1. 화면에 보이지 않는 이미지 검색
    const images = document.querySelectorAll('img:not([data-optimized])');
    let optimizedCount = 0;
    
    for (const img of Array.from(images)) {
      const imgElement = img as HTMLImageElement;
      const rect = imgElement.getBoundingClientRect();
      
      // 화면에 보이지 않는 이미지이고 소스가 있는 경우
      if ((rect.top < -window.innerHeight || rect.bottom > window.innerHeight * 2 ||
           rect.left < -window.innerWidth || rect.right > window.innerWidth * 2) && 
          imgElement.src && !imgElement.src.startsWith('data:')) {
        
        // 원본 소스 저장
        const originalSrc = imgElement.src;
        imgElement.setAttribute('data-original-src', originalSrc);
        
        // 빈 이미지 또는 초소형 플레이스홀더로 대체
        imgElement.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
        
        // 이미지가 다시 보이게 되면 복원하기 위한 Intersection Observer 설정
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const targetImg = entry.target as HTMLImageElement;
              const originalSrc = targetImg.getAttribute('data-original-src');
              
              if (originalSrc) {
                targetImg.src = originalSrc;
                targetImg.removeAttribute('data-original-src');
                targetImg.setAttribute('data-optimized', 'restored');
              }
              
              observer.disconnect();
            }
          });
        }, { rootMargin: '200px' }); // 뷰포트 주변 200px 영역까지 고려
        
        observer.observe(imgElement);
        imgElement.setAttribute('data-optimized', 'true');
        optimizedCount++;
      }
    }
    
    if (optimizedCount > 0) {
      console.log(`이미지 리소스 최적화 완료: ${optimizedCount}개 이미지 처리됨`);
    }
    
    // 2. 초대형 캔버스 및 SVG 요소 처리
    const heavyElements = document.querySelectorAll('canvas[width][height], svg[width][height]');
    heavyElements.forEach(element => {
      const width = parseInt(element.getAttribute('width') || '0');
      const height = parseInt(element.getAttribute('height') || '0');
      
      // 너무 큰 캔버스/SVG가 메모리를 많이 차지할 수 있음
      if (width * height > 1000000) { // 1M 픽셀 이상
        if (!element.hasAttribute('data-optimized')) {
          // 화면에 보이지 않을 때만 처리
          const rect = element.getBoundingClientRect();
          if (rect.top < -window.innerHeight || rect.bottom > window.innerHeight * 2) {
            element.setAttribute('data-optimized', 'hidden');
            // HTMLElement로 타입 캐스팅하여 style 속성에 접근
            const htmlElement = element as HTMLElement;
            htmlElement.setAttribute('data-original-display', htmlElement.style.display);
            htmlElement.style.display = 'none';
          }
        }
      }
    });
    
    return true;
  } catch (error) {
    console.error('이미지 리소스 최적화 오류:', error);
    return false;
  }
}
