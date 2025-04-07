'use client';

import { useState, useEffect } from 'react';
import { checkMemoryModules, checkGpuModules, checkBrowserModules } from '../utils/module-checker';
import styles from './ModuleDebugPanel.module.css';

interface ModuleDebugPanelProps {
    className?: string;
}

export default function ModuleDebugPanel({ className = '' }: ModuleDebugPanelProps) {
    const [memoryModules, setMemoryModules] = useState<any>(null);
    const [gpuModules, setGpuModules] = useState<any>(null);
    const [browserModules, setBrowserModules] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function checkModules() {
            try {
                setLoading(true);
                // 메모리 관련 모듈 확인
                const memoryStatus = checkMemoryModules();
                setMemoryModules(memoryStatus);

                // GPU 관련 모듈 확인
                const gpuStatus = checkGpuModules();
                setGpuModules(gpuStatus);

                // 브라우저 모듈 확인
                const browserStatus = await checkBrowserModules();
                setBrowserModules(browserStatus);
            } catch (err) {
                setError(err instanceof Error ? err.message : '모듈 확인 중 오류 발생');
                console.error('모듈 확인 오류:', err);
            } finally {
                setLoading(false);
            }
        }

        checkModules();
    }, []);

    if (loading) {
        return <div className={`${styles.moduleDebugPanel} ${className}`}>모듈 상태 확인 중...</div>;
    }

    if (error) {
        return <div className={`${styles.moduleDebugPanel} ${className} ${styles.error}`}>오류: {error}</div>;
    }

    return (
        <div className={`${styles.moduleDebugPanel} ${className}`}>
            <h2>모듈 연결 상태</h2>

            <div className={styles.section}>
                <h3>메모리 모듈</h3>
                <div className={styles.status}>
                    <span className={styles.label}>상태:</span>
                    <span className={memoryModules?.success ? styles.success : styles.failed}>
                        {memoryModules?.success ? '정상' : '문제 발생'}
                    </span>
                </div>

                <div className={styles.moduleList}>
                    {memoryModules?.modules.map((module: any, index: number) => (
                        <div
                            key={index}
                            className={`${styles.moduleItem} ${module.loaded ? styles.loaded : styles.notLoaded}`}
                        >
                            <span className={styles.moduleName}>{module.name}</span>
                            <span className={styles.moduleStatus}>
                                {module.loaded ? '✓' : '✗'}
                            </span>
                            {!module.loaded && module.error && (
                                <div className={styles.moduleError}>{module.error}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <h3>GPU 모듈</h3>
                <div className={styles.status}>
                    <span className={styles.label}>상태:</span>
                    <span className={gpuModules?.success ? styles.success : styles.failed}>
                        {gpuModules?.success ? '정상' : '문제 발생'}
                    </span>
                </div>

                <div className={styles.moduleList}>
                    {gpuModules?.modules.map((module: any, index: number) => (
                        <div
                            key={index}
                            className={`${styles.moduleItem} ${module.loaded ? styles.loaded : styles.notLoaded}`}
                        >
                            <span className={styles.moduleName}>{module.name}</span>
                            <span className={styles.moduleStatus}>
                                {module.loaded ? '✓' : '✗'}
                            </span>
                            {!module.loaded && module.error && (
                                <div className={styles.moduleError}>{module.error}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.section}>
                <h3>브라우저 모듈</h3>
                <div className={styles.status}>
                    <span className={styles.label}>상태:</span>
                    <span className={browserModules?.success ? styles.success : styles.failed}>
                        {browserModules?.success ? '정상' : '문제 발생'}
                    </span>
                </div>

                <div className={styles.moduleList}>
                    {browserModules?.modules.map((module: any, index: number) => (
                        <div
                            key={index}
                            className={`${styles.moduleItem} ${module.loaded ? styles.loaded : styles.notLoaded}`}
                        >
                            <span className={styles.moduleName}>{module.name}</span>
                            <span className={styles.moduleStatus}>
                                {module.loaded ? '✓' : '✗'}
                            </span>
                            {!module.loaded && module.error && (
                                <div className={styles.moduleError}>{module.error}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <button
                className={styles.refreshButton}
                onClick={() => window.location.reload()}
            >
                새로고침
            </button>
        </div>
    );
}
