/**
 * 리소스 최적화 유틸리티
 */
import { logger } from './logger';

/**
 * 리소스를 최적화합니다.
 */
export async function optimizeResources(): Promise<boolean> {
  try {
    logger.info('[Resource Optimizer] 리소스 최적화 시작');

    // 브라우저 환경인 경우만 실행
    if (typeof window === 'undefined') {
      return false;
    }

    // 이미지 리사이즈 캐시 정리
    cleanupImageResizeCache();

    // 사용하지 않는 이미지 메모리 해제
    unloadNonVisibleImages();

    // 오디오/비디오 리소스 정리
    cleanupMediaResources();

    return true;
  } catch (error) {
    logger.error('[Resource Optimizer] 리소스 최적화 중 오류 발생', { error });
    return false;
  }
}

/**
 * 이미지 리사이즈 캐시 정리
 */
function cleanupImageResizeCache(): void {
  try {
    const win = window as any;
    
    // 캐시가 존재하는 경우 정리
    if (win.__imageResizeCache) {
      // Map 형식인 경우
      if (typeof win.__imageResizeCache.clear === 'function') {
        win.__imageResizeCache.clear();
        logger.info('[Resource Optimizer] 이미지 리사이즈 캐시를 정리했습니다.');
      } 
      // 객체 형식인 경우
      else if (typeof win.__imageResizeCache === 'object') {
        // 새 객체로 대체
        win.__imageResizeCache = {};
        logger.info('[Resource Optimizer] 이미지 리사이즈 캐시 객체를 정리했습니다.');
      }
    } else {
      // 캐시가 없는 경우 초기화
      win.__imageResizeCache = new Map<string, unknown>();
    }
  } catch (err) {
    logger.error('[Resource Optimizer] 이미지 리사이즈 캐시 정리 중 오류 발생');
  }
}

/**
 * 현재 표시되지 않는 이미지 리소스 해제
 */
function unloadNonVisibleImages(): void {
  try {
    const images = document.querySelectorAll('img');
    let unloadedCount = 0;

    images.forEach(img => {
      // 표시 여부 확인
      const rect = img.getBoundingClientRect();
      const isVisible = (
        rect.top < window.innerHeight &&
        rect.bottom >= 0 &&
        rect.left < window.innerWidth &&
        rect.right >= 0
      );

      // 표시되지 않고 데이터 속성이 있으면 src 대신 data-src로 이동
      if (!isVisible && img.src && !img.dataset.srcBackup) {
        // 원본 src 백업
        img.dataset.srcBackup = img.src;
        // src 제거 (브라우저가 메모리에서 해제할 수 있음)
        img.src = '';
        unloadedCount++;
      }
      // 표시되고 백업된 src가 있으면 복원
      else if (isVisible && !img.src && img.dataset.srcBackup) {
        img.src = img.dataset.srcBackup;
        delete img.dataset.srcBackup;
      }
    });

    if (unloadedCount > 0) {
      logger.info(`[Resource Optimizer] ${unloadedCount}개의 보이지 않는 이미지를 메모리에서 해제했습니다.`);
    }
  } catch (err) {
    logger.error('[Resource Optimizer] 이미지 리소스 해제 중 오류 발생');
  }
}

/**
 * 오디오/비디오 리소스 정리
 */
function cleanupMediaResources(): void {
  try {
    const mediaElements = document.querySelectorAll('audio, video') as NodeListOf<HTMLMediaElement>;
    let pausedCount = 0;

    mediaElements.forEach(media => {
      if (!media.paused && !document.contains(media)) {
        media.pause();
        
        if (media instanceof HTMLVideoElement) {
          media.currentTime = 0;
          media.src = '';
          media.load(); // 리소스 해제
        }
        
        pausedCount++;
      }
    });

    if (pausedCount > 0) {
      logger.info(`[Resource Optimizer] ${pausedCount}개의 숨겨진 미디어 요소를 일시 중지했습니다.`);
    }
  } catch (err) {
    logger.error('[Resource Optimizer] 미디어 리소스 정리 중 오류 발생');
  }
} 