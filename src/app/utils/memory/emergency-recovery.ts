/**
 * 긴급 메모리 복구 유틸리티
 */
import { logger } from './logger';

/**
 * 긴급 메모리 복구를 수행합니다.
 * 위험한 메모리 상황에서 호출되는 강력한 최적화 함수
 */
export async function emergencyRecovery(): Promise<boolean> {
  try {
    logger.warn('[Emergency Recovery] 긴급 메모리 복구 시작');

    // 브라우저 환경인 경우만 실행
    if (typeof window === 'undefined') {
      return false;
    }

    // 1. 페이지에서 숨겨진 모든 내용 제거
    removeHiddenContent();

    // 2. 비필수 UI 요소 최소화
    minimizeNonEssentialUI();

    // 3. 대용량 데이터 구조 정리
    cleanupLargeDataStructures();

    // 4. 강제 가비지 컬렉션 요청 (지원되는 경우)
    requestGarbageCollection();

    logger.info('[Emergency Recovery] 긴급 메모리 복구 완료');
    return true;
  } catch (error) {
    logger.error('[Emergency Recovery] 긴급 복구 중 오류 발생', { error });
    return false;
  }
}

/**
 * 페이지에서 숨겨진 콘텐츠 제거
 */
function removeHiddenContent(): void {
  try {
    // 숨겨진 요소 검색
    const hiddenElements = document.querySelectorAll(
      '[aria-hidden="true"], [hidden], [style*="display: none"], [style*="display:none"], [style*="visibility: hidden"], [style*="visibility:hidden"]'
    );

    let removedCount = 0;

    hiddenElements.forEach(el => {
      // 필수 요소는 제외
      if (!el.classList.contains('essential') && !el.getAttribute('data-keep')) {
        // 완전히 제거하는 대신 DOM에서 분리
        if (el.parentNode) {
          el.parentNode.removeChild(el);
          removedCount++;
        }
      }
    });

    if (removedCount > 0) {
      logger.info(`[Emergency Recovery] ${removedCount}개의 숨겨진 요소를 제거했습니다.`);
    }
  } catch (err) {
    logger.error('[Emergency Recovery] 숨겨진 콘텐츠 제거 중 오류 발생');
  }
}

/**
 * 비필수 UI 요소 최소화
 */
function minimizeNonEssentialUI(): void {
  try {
    // 애니메이션이 있는 요소 비활성화
    const animatedElements = document.querySelectorAll(
      '[class*="animate"], [class*="animation"], [style*="animation"], [style*="transition"]'
    );

    animatedElements.forEach(el => {
      if (el instanceof HTMLElement) {
        // 애니메이션 관련 스타일 제거
        el.style.animation = 'none';
        el.style.transition = 'none';
        
        // 애니메이션 관련 클래스 제거
        el.classList.forEach(className => {
          if (className.includes('animate') || className.includes('transition')) {
            el.classList.remove(className);
          }
        });
      }
    });

    // 고해상도 이미지 교체
    const images = document.querySelectorAll('img[src*="high-res"], img[src*="hd"], img[src*="2x"]');
    images.forEach(img => {
      if (img instanceof HTMLImageElement && img.dataset.lowRes) {
        img.src = img.dataset.lowRes;
      }
    });

    logger.info('[Emergency Recovery] UI 요소를 최소화했습니다.');
  } catch (err) {
    logger.error('[Emergency Recovery] UI 최소화 중 오류 발생');
  }
}

/**
 * 대용량 데이터 구조 정리
 */
function cleanupLargeDataStructures(): void {
  try {
    const win = window as any;
    
    // 메모리에 있는 큰 데이터 배열이나 객체 정리
    ['__dataCache', '__stateHistory', '__largeDatasets', '__memoryCache'].forEach(prop => {
      if (win[prop]) {
        if (Array.isArray(win[prop])) {
          win[prop] = [];
        } else if (typeof win[prop] === 'object') {
          // Map이나 Set 인지 확인
          if (typeof win[prop].clear === 'function') {
            win[prop].clear();
          } else {
            win[prop] = {};
          }
        }
      }
    });

    // 로컬 스토리지의 임시 항목 정리
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('temp_') || key.includes('_cache_')) {
        localStorage.removeItem(key);
      }
    });

    logger.info('[Emergency Recovery] 대용량 데이터 구조를 정리했습니다.');
  } catch (err) {
    logger.error('[Emergency Recovery] 데이터 구조 정리 중 오류 발생');
  }
}

/**
 * 가비지 컬렉션 요청
 */
function requestGarbageCollection(): void {
  try {
    if (typeof window !== 'undefined') {
      // 표준 API는 없지만, 일부 환경에서는 가능
      if (typeof (window as any).gc === 'function') {
        (window as any).gc();
        logger.info('[Emergency Recovery] 명시적 가비지 컬렉션 요청 완료');
      }
      
      // 간접적인 GC 촉발 시도
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => {
          // 의도적으로 대용량 객체 생성 후 해제
          const largeArray = new Array(1000000);
          for (let i = 0; i < 1000000; i++) {
            largeArray[i] = i;
          }
          
          // 참조 제거
          largeArray.length = 0;
        });
      }
    }
  } catch (err) {
    logger.error('[Emergency Recovery] 가비지 컬렉션 요청 중 오류 발생');
  }
} 