'use client';

import { useState, useEffect } from 'react';
import styles from './NativeModuleTest.module.css';

// 모듈 정보 인터페이스
interface ModuleInfo {
  isLoaded: boolean;
  isFallback: boolean;
  availableFunctions: string[];
  version: string;
  timestamp: number;
}

// 메모리 정보 인터페이스
interface MemoryInfo {
  heap_used?: number;
  heap_total?: number;
  heap_used_mb?: number;
  percent_used?: number;
  error?: string;
}

// API 응답 인터페이스
interface TestResponse {
  success: boolean;
  moduleInfo?: ModuleInfo;
  memoryInfo?: MemoryInfo;
  message?: string;
  error?: string;
}

interface NativeModuleTestProps {
  // props 정의
}

const NativeModuleTest: React.FC<NativeModuleTestProps> = (): React.ReactNode => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 네이티브 모듈 테스트
  const testNativeModule = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/native/test');
      const _data: TestResponse = await response.json();
      setResult(_data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // 메모리 최적화 테스트
  const testMemoryOptimization = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/native/memory/optimize');
      const data = await response.json();

      // 메모리 최적화 후 모듈 상태 다시 테스트
      await testNativeModule();
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  // 페이지 로딩 시 테스트 실행
  useEffect(() => {
    testNativeModule();
  }, []);

  // 연결 상태에 따른 클래스 이름 계산
  const getStatusClassName = () => {
    if (!result) return styles.unknown;
    if (!result.success) return styles.error;
    if (result.moduleInfo?.isLoaded && !result.moduleInfo?.isFallback) return styles.success;
    if (result.moduleInfo?.isLoaded && result.moduleInfo?.isFallback) return styles.warning;
    return styles.error;
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Rust 네이티브 모듈 연결 테스트</h2>

      <div className={`${styles.statusCard} ${getStatusClassName()}`}>
        <div className={styles.statusHeader}>
          <h3 className={styles.statusTitle}>연결 상태</h3>
          <div className={styles.statusBadge}>
            {loading ? '테스트 중...' :
              result?.success
                ? (result.moduleInfo?.isFallback ? 'Fallback 모드' : '연결됨')
                : '연결 실패'}
          </div>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <p>오류: {error}</p>
          </div>
        )}

        {result?.success && (
          <div className={styles.resultContent}>
            <div className={styles.resultItem}>
              <span className={styles.label}>모듈 로드됨:</span>
              <span className={styles.value}>{result.moduleInfo?.isLoaded ? '예' : '아니오'}</span>
            </div>

            <div className={styles.resultItem}>
              <span className={styles.label}>Fallback 모드:</span>
              <span className={styles.value}>{result.moduleInfo?.isFallback ? '예' : '아니오'}</span>
            </div>

            <div className={styles.resultItem}>
              <span className={styles.label}>버전:</span>
              <span className={styles.value}>{result.moduleInfo?.version || 'N/A'}</span>
            </div>

            {result.memoryInfo && !result.memoryInfo.error && (
              <>
                <div className={styles.divider}></div>
                <h4 className={styles.sectionTitle}>메모리 정보</h4>

                <div className={styles.resultItem}>
                  <span className={styles.label}>사용된 힙:</span>
                  <span className={styles.value}>
                    {result.memoryInfo.heap_used_mb ? `${result.memoryInfo.heap_used_mb.toFixed(2)}MB` : 'N/A'}
                  </span>
                </div>

                <div className={styles.resultItem}>
                  <span className={styles.label}>사용률:</span>
                  <span className={styles.value}>
                    {result.memoryInfo.percent_used ? `${result.memoryInfo.percent_used.toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </>
            )}

            {result.moduleInfo?.availableFunctions && (
              <>
                <div className={styles.divider}></div>
                <h4 className={styles.sectionTitle}>사용 가능한 함수</h4>
                <div className={styles.functionList}>
                  {result.moduleInfo.availableFunctions.length > 0 ? (
                    result.moduleInfo.availableFunctions.map(func => (
                      <div key={func} className={styles.functionItem}>{func}</div>
                    ))
                  ) : (
                    <div className={styles.emptyMessage}>사용 가능한 함수 없음</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <button
            className={styles.testButton}
            onClick={testNativeModule}
            disabled={loading}
          >
            {loading ? '테스트 중...' : '다시 테스트'}
          </button>

          <button
            className={styles.optimizeButton}
            onClick={testMemoryOptimization}
            disabled={loading}
          >
            메모리 최적화 테스트
          </button>
        </div>
      </div>

      <div className={styles.note}>
        <p>
          <strong>참고:</strong> Rust 네이티브 모듈을 사용할 수 없는 경우 JS로 구현된 폴백 모듈이 사용됩니다.
          폴백 모듈은 모든 기능을 지원하지 않을 수 있습니다.
        </p>
      </div>
    </div>
  );
};

export default NativeModuleTest;
