/**
 * 폰트 정리 유틸리티
 * 사용하지 않는 폰트 리소스를 정리하는 함수들
 */

const isBrowser = typeof window !== 'undefined';

interface FontResource {
    family: string;
    url?: string;
    status: 'active' | 'inactive' | 'loading';
    lastUsed?: number;
}

// Window 인터페이스 확장
declare global {
    interface Window {
        __fontCache?: Map<string, FontResource>;
        __loadedFontFamilies?: Set<string>;
    }
}

/**
 * 사용하지 않는 폰트 정리
 * 현재 페이지에서 사용되지 않는 폰트를 정리하여 메모리를 최적화합니다.
 * @returns 정리된 폰트 수
 */
export function cleanupUnusedFonts(): number {
    if (!isBrowser) return 0;

    let count = 0;
    try {
        // 현재 사용 중인 폰트 패밀리 목록 수집
        const usedFontFamilies = new Set<string>();

        // 문서 내 모든 요소 스캔
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            const fontFamily = computedStyle.getPropertyValue('font-family');

            if (fontFamily) {
                // 콤마로 구분된 폰트 패밀리 목록 파싱
                fontFamily.split(',').forEach(font => {
                    // 따옴표와 공백 제거
                    const cleanFont = font.trim().replace(/["']/g, '');
                    if (cleanFont && cleanFont !== 'inherit' && cleanFont !== 'initial') {
                        usedFontFamilies.add(cleanFont);
                    }
                });
            }
        });

        // 폰트 캐시 초기화
        if (!window.__fontCache) {
            window.__fontCache = new Map<string, FontResource>();
        }

        if (!window.__loadedFontFamilies) {
            window.__loadedFontFamilies = new Set<string>();
        }

        // 폰트 캐시에서 사용하지 않는 항목 식별
        window.__fontCache.forEach((resource, key) => {
            // 현재 사용되지 않는 폰트이고 마지막 사용 시간이 5분 이상 지났거나 정보가 없는 경우
            const isUnused = !usedFontFamilies.has(resource.family);
            const isOld = resource.lastUsed ? (Date.now() - resource.lastUsed > 5 * 60 * 1000) : true;

            if (isUnused && isOld) {
                // 사용하지 않는 폰트 제거
                window.__fontCache?.delete(key);
                count++;

                // 로드된 폰트 패밀리 목록에서도 제거
                window.__loadedFontFamilies?.delete(resource.family);

                console.debug(`폰트 정리: ${resource.family} 정리됨`);
            }
        });

        // CSS 폰트 페이스 규칙 제거 시도 (가능한 경우)
        if (document.styleSheets) {
            try {
                Array.from(document.styleSheets).forEach(styleSheet => {
                    try {
                        // 같은 출처 스타일시트만 처리 (CORS 제한으로 인해)
                        if (styleSheet.href && !styleSheet.href.startsWith(window.location.origin)) {
                            return;
                        }

                        const cssRules = styleSheet.cssRules || styleSheet.rules;
                        if (!cssRules) return;

                        // 폰트 페이스 규칙 찾기
                        for (let i = cssRules.length - 1; i >= 0; i--) {
                            const rule = cssRules[i];
                            if (rule instanceof CSSFontFaceRule) {
                                const fontFamily = rule.style.getPropertyValue('font-family');
                                const cleanFamily = fontFamily.replace(/["']/g, '').trim();

                                // 사용하지 않는 폰트 패밀리에 대한 규칙만 제거
                                if (!usedFontFamilies.has(cleanFamily)) {
                                    try {
                                        styleSheet.deleteRule(i);
                                        count++;
                                    } catch (e) {
                                        // 일부 브라우저에서는 deleteRule이 제한될 수 있음
                                        console.debug('폰트 규칙 제거 실패', e);
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // 일부 스타일시트는 보안 정책으로 접근이 제한될 수 있음
                    }
                });
            } catch (e) {
                console.debug('스타일시트 처리 중 오류', e);
            }
        }

        if (count > 0) {
            console.log(`폰트 정리 완료: ${count}개 항목 정리됨`);
        }

        // 가비지 컬렉션 힌트 제공
        if (window.requestIdleCallback) {
            window.requestIdleCallback(() => {
                if (typeof window.gc === 'function') {
                    try {
                        window.gc();
                    } catch (e) {
                        // gc 호출 실패 무시
                    }
                }
            });
        }

        return count;
    } catch (error) {
        console.error('폰트 정리 중 오류:', error);
        return 0;
    }
}

/**
 * 사용 중인 폰트 패밀리 캐싱
 * 현재 활성화된 폰트 패밀리를 기록하여 관리합니다.
 */
export function cacheActiveFontFamilies(): void {
    if (!isBrowser) return;

    try {
        const fontFamilies = new Set<string>();

        // 문서 내 모든 요소의 폰트 패밀리 수집
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            const fontFamily = computedStyle.getPropertyValue('font-family');

            if (fontFamily) {
                fontFamily.split(',').forEach(font => {
                    const cleanFont = font.trim().replace(/["']/g, '');
                    if (cleanFont && cleanFont !== 'inherit' && cleanFont !== 'initial') {
                        fontFamilies.add(cleanFont);
                    }
                });
            }
        });

        // 글로벌 캐시 초기화
        if (!window.__fontCache) {
            window.__fontCache = new Map<string, FontResource>();
        }

        if (!window.__loadedFontFamilies) {
            window.__loadedFontFamilies = new Set<string>();
        }

        // 현재 활성 폰트 업데이트
        fontFamilies.forEach(family => {
            const key = `font_${family}`;

            if (window.__fontCache?.has(key)) {
                // 기존 폰트 리소스 업데이트
                const resource = window.__fontCache.get(key);
                if (resource) {
                    resource.status = 'active';
                    resource.lastUsed = Date.now();
                    window.__fontCache.set(key, resource);
                }
            } else {
                // 새 폰트 리소스 추가
                window.__fontCache?.set(key, {
                    family,
                    status: 'active',
                    lastUsed: Date.now()
                });
            }

            // 로드된 폰트 패밀리에 추가
            window.__loadedFontFamilies?.add(family);
        });

    } catch (error) {
        console.warn('폰트 패밀리 캐싱 중 오류:', error);
    }
}

/**
 * 전체 폰트 캐시 정리
 * 모든 폰트 캐시를 정리합니다.
 */
export function clearAllFontCaches(): number {
    if (!isBrowser) return 0;

    try {
        let count = 0;

        // 폰트 캐시 정리
        if (window.__fontCache) {
            count = window.__fontCache.size;
            window.__fontCache.clear();
        }

        // 로드된 폰트 패밀리 목록 정리
        if (window.__loadedFontFamilies) {
            window.__loadedFontFamilies.clear();
        }

        if (count > 0) {
            console.log(`폰트 캐시 전체 정리: ${count}개 항목 제거됨`);
        }

        return count;
    } catch (error) {
        console.error('폰트 캐시 정리 중 오류:', error);
        return 0;
    }
} 