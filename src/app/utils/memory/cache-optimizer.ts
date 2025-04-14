/**
 * 캐시 최적화 유틸리티
 */
import { logger } from './logger';

/**
 * 앱 캐시를 정리합니다.
 */
export async function cleanupCache(): Promise<boolean> {
  try {
    logger.info('[Cache Optimizer] 캐시 정리 시작');

    // 브라우저 환경인 경우만 실행
    if (typeof window === 'undefined') {
      return false;
    }

    // 메모리 캐시 정리 (전역 맵 객체)
    if (window.__memoryCache) {
      try {
        window.__memoryCache.clear();
        logger.info('[Cache Optimizer] 메모리 캐시 정리 완료');
      } catch (err) {
        logger.error('[Cache Optimizer] 메모리 캐시 정리 실패');
      }
    }

    // 로컬 캐시 크기 제한
    try {
      // 정리할 캐시 키 찾기
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('cache:') || key.includes('cache-')
      );

      // 가장 오래된 캐시부터 정리 (최대 10개)
      const oldestCacheKeys = cacheKeys
        .map(key => {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '{}');
            return { key, timestamp: item.timestamp || 0 };
          } catch {
            return { key, timestamp: 0 };
          }
        })
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, 10)
        .map(item => item.key);

      // 오래된 캐시 삭제
      oldestCacheKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // 개별 항목 삭제 오류는 무시
        }
      });

      logger.info(`[Cache Optimizer] ${oldestCacheKeys.length}개의 로컬 캐시 항목 정리 완료`);
    } catch (err) {
      logger.error('[Cache Optimizer] 로컬 캐시 정리 실패');
    }

    return true;
  } catch (error) {
    logger.error('[Cache Optimizer] 캐시 정리 중 오류 발생', { error });
    return false;
  }
} 