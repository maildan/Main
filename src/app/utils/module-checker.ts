/**
 * 모듈 연결 검증 유틸리티
 * 이 파일은 모듈 간 연결 상태를 확인하고 빠른 디버깅을 위한 도구를 제공합니다.
 */

/**
 * 모듈 로드 상태 인터페이스
 */
interface ModuleStatus {
    name: string;
    loaded: boolean;
    error?: string;
}

/**
 * 모듈 연결 정보 인터페이스
 */
interface ModuleConnectionInfo {
    timestamp: number;
    modules: ModuleStatus[];
    success: boolean;
}

/**
 * 메모리 관련 모듈 연결 확인
 */
export function checkMemoryModules(): ModuleConnectionInfo {
    const modules: ModuleStatus[] = [];
    let allModulesLoaded = true;

    // 모듈 로드 상태 검사 함수
    function checkModule(name: string, importFunc: () => any): ModuleStatus {
        try {
            const moduleExports = importFunc();
            const isValid = moduleExports && Object.keys(moduleExports).length > 0;
            if (!isValid) {
                allModulesLoaded = false;
            }
            return {
                name,
                loaded: isValid,
                error: isValid ? undefined : '모듈이 비어 있거나 올바르게 로드되지 않음'
            };
        } catch (error) {
            allModulesLoaded = false;
            return {
                name,
                loaded: false,
                error: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }

    // 주요 메모리 관련 모듈 확인
    modules.push(checkModule('memory/types', () => require('../memory/types')));
    modules.push(checkModule('memory/gc-utils', () => require('../memory/gc-utils')));
    modules.push(checkModule('memory/gc/resource-optimizer', () => require('../memory/gc/resource-optimizer')));
    modules.push(checkModule('memory/gc/optimization-controller', () => require('../memory/gc/optimization-controller')));
    modules.push(checkModule('memory/logger', () => require('../memory/logger')));
    modules.push(checkModule('memory-optimizer', () => require('../memory-optimizer')));
    modules.push(checkModule('memory-settings-manager', () => require('../memory-settings-manager')));

    return {
        timestamp: Date.now(),
        modules,
        success: allModulesLoaded
    };
}

/**
 * GPU 관련 모듈 연결 확인
 */
export function checkGpuModules(): ModuleConnectionInfo {
    const modules: ModuleStatus[] = [];
    let allModulesLoaded = true;

    // 모듈 로드 상태 검사 함수
    function checkModule(name: string, importFunc: () => any): ModuleStatus {
        try {
            const moduleExports = importFunc();
            const isValid = moduleExports && Object.keys(moduleExports).length > 0;
            if (!isValid) {
                allModulesLoaded = false;
            }
            return {
                name,
                loaded: isValid,
                error: isValid ? undefined : '모듈이 비어 있거나 올바르게 로드되지 않음'
            };
        } catch (error) {
            allModulesLoaded = false;
            return {
                name,
                loaded: false,
                error: error instanceof Error ? error.message : '알 수 없는 오류'
            };
        }
    }

    // 주요 GPU 관련 모듈 확인
    modules.push(checkModule('gpu-acceleration', () => require('../gpu-acceleration')));
    modules.push(checkModule('gpu-settings', () => require('../gpu-settings')));
    modules.push(checkModule('nativeModuleClient', () => require('../nativeModuleClient')));

    return {
        timestamp: Date.now(),
        modules,
        success: allModulesLoaded
    };
}

/**
 * 모든 주요 모듈 연결 확인
 */
export function checkAllModules(): Record<string, ModuleConnectionInfo> {
    return {
        memory: checkMemoryModules(),
        gpu: checkGpuModules()
    };
}

// 브라우저 환경에서만 사용 가능한 모듈 검사 함수
export function checkBrowserModules(): Promise<ModuleConnectionInfo> {
    return new Promise((resolve) => {
        const modules: ModuleStatus[] = [];
        let allModulesLoaded = true;

        // 브라우저 환경에서만 사용 가능한 API 확인
        if (typeof window !== 'undefined') {
            // 메모리 최적화 유틸리티 확인
            modules.push({
                name: 'window.__memoryOptimizer',
                loaded: !!window.__memoryOptimizer,
                error: window.__memoryOptimizer ? undefined : '메모리 최적화 유틸리티를 찾을 수 없음'
            });

            // GPU 가속 유틸리티 확인
            modules.push({
                name: 'window.__gpuAccelerator',
                loaded: !!window.__gpuAccelerator,
                error: window.__gpuAccelerator ? undefined : 'GPU 가속 유틸리티를 찾을 수 없음'
            });

            // Electron API 확인
            modules.push({
                name: 'window.electronAPI',
                loaded: !!window.electronAPI,
                error: window.electronAPI ? undefined : 'Electron API를 찾을 수 없음'
            });

            // 기능별 메서드 확인
            if (window.__memoryOptimizer) {
                modules.push({
                    name: '메모리 최적화 - requestGC',
                    loaded: !!window.__memoryOptimizer.requestGC,
                    error: window.__memoryOptimizer.requestGC ? undefined : 'requestGC 메서드를 찾을 수 없음'
                });
            }

            if (window.__gpuAccelerator) {
                modules.push({
                    name: 'GPU 가속 - isGpuAccelerationEnabled',
                    loaded: !!window.__gpuAccelerator.isGpuAccelerationEnabled,
                    error: window.__gpuAccelerator.isGpuAccelerationEnabled ? undefined : 'isGpuAccelerationEnabled 메서드를 찾을 수 없음'
                });
            }
        } else {
            // 브라우저 환경이 아닌 경우
            modules.push({
                name: 'browser-environment',
                loaded: false,
                error: '브라우저 환경이 아님'
            });
            allModulesLoaded = false;
        }

        // 결과 반환
        resolve({
            timestamp: Date.now(),
            modules,
            success: allModulesLoaded
        });
    });
}

/**
 * 모듈 로딩 시간 측정
 * @param modulePath 모듈 경로
 */
export async function measureModuleLoadTime(modulePath: string): Promise<{
    modulePath: string;
    loadTimeMs: number;
    success: boolean;
    error?: string;
}> {
    const startTime = performance.now();
    try {
        // 동적 임포트를 사용하여 모듈 로드
        await import(/* webpackIgnore: true */ modulePath);
        const endTime = performance.now();
        return {
            modulePath,
            loadTimeMs: endTime - startTime,
            success: true
        };
    } catch (error) {
        const endTime = performance.now();
        return {
            modulePath,
            loadTimeMs: endTime - startTime,
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류'
        };
    }
}
