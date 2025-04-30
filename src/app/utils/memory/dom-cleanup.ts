/**
 * DOM 정리 유틸리티
 */
import { logInfo, logWarn } from '../log-utils';

/**
 * DOM 요소 정리
 * @param aggressive 적극적 정리 여부
 */
export async function cleanupDom(aggressive: boolean = false): Promise<boolean> {
    try {
        logInfo(`[DOM] 정리 시작 (적극적 정리: ${aggressive})`);

        let cleanedElements = 0;

        if (typeof document === 'undefined') {
            return false;
        }

        // 분리된 이벤트 리스너 정리
        cleanedElements += cleanupEventListeners();

        // 숨겨진 요소 최적화
        cleanedElements += optimizeHiddenElements(aggressive);

        // 화면 밖 요소 최적화
        if (aggressive) {
            cleanedElements += optimizeOffscreenElements();
        }

        logInfo(`[DOM] 정리 완료: ${cleanedElements}개 요소 최적화됨`);
        return true;
    } catch (error) {
        logWarn('[DOM] 정리 중 오류 발생', error);
        return false;
    }
}

/**
 * 이벤트 리스너 정리
 */
function cleanupEventListeners(): number {
    try {
        // 구현...
        return 0;
    } catch (error) {
        logWarn('[DOM] 이벤트 리스너 정리 오류', error);
        return 0;
    }
}

/**
 * 숨겨진 요소 최적화
 */
function optimizeHiddenElements(aggressive: boolean): number {
    try {
        let count = 0;

        // 숨겨진 요소 찾기
        const hiddenElements = document.querySelectorAll(
            '[hidden], .hidden, [style*="display: none"], [style*="visibility: hidden"]'
        );

        // 숨겨진 요소 최적화
        hiddenElements.forEach(el => {
            if (el instanceof HTMLElement) {
                // 적극적인 경우: innerHTML 비우기
                if (aggressive && !el.dataset.preserveContent) {
                    el.innerHTML = '';
                    count++;
                }

                // 이미지 소스 제거
                const images = el.querySelectorAll('img');
                images.forEach(img => {
                    if (img.src && !img.dataset.preserveSrc) {
                        img.dataset.originalSrc = img.src;
                        img.src = '';
                        count++;
                    }
                });
            }
        });

        return count;
    } catch (error) {
        logWarn('[DOM] 숨겨진 요소 최적화 오류', error);
        return 0;
    }
}

/**
 * 화면 밖 요소 최적화
 */
function optimizeOffscreenElements(): number {
    try {
        let count = 0;

        // 현재 뷰포트 사이즈
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // 최적화 대상 요소 찾기
        const elements = document.querySelectorAll('.optimize-when-offscreen, [data-optimize-offscreen]');

        elements.forEach(el => {
            if (el instanceof HTMLElement) {
                const rect = el.getBoundingClientRect();

                // 화면 밖에 있는지 확인
                const isOffscreen = (
                    rect.bottom < 0 ||
                    rect.top > viewportHeight ||
                    rect.right < 0 ||
                    rect.left > viewportWidth
                );

                if (isOffscreen && !el.dataset.optimized) {
                    // 원본 상태 저장
                    el.dataset.optimized = 'true';
                    el.dataset.originalDisplay = el.style.display || '';

                    // 화면에서 숨기기
                    el.style.display = 'none';
                    count++;
                }
                // 다시 화면 안으로 들어왔을 때 복원
                else if (!isOffscreen && el.dataset.optimized === 'true') {
                    el.style.display = el.dataset.originalDisplay || '';
                    delete el.dataset.optimized;
                }
            }
        });

        return count;
    } catch (error) {
        logWarn('[DOM] 화면 밖 요소 최적화 오류', error);
        return 0;
    }
}