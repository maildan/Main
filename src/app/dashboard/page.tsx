'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MemoryMonitor from '../components/MemoryMonitor';
import TypingStats from '../components/TypingStats';
import { useAutoMemoryOptimization as useMemoryOptimizer } from '../utils/memory/hooks';
import { detectGpuCapabilities } from '../utils/gpu-detection';
import styles from './page.module.css';
import { StatsData, GPUInfo } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // 메모리 최적화 기능 사용
  const { isOptimizing, optimizeMemory, lastOptimization } = useMemoryOptimizer({
    enabled: true,
    threshold: 80,
    interval: 60000,
    showNotifications: true,
  });

  // 통계 데이터 가져오기
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setFetchError(null);

        // API 요청 타임아웃 설정
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃

        // 서버에서 통계 데이터 가져오기
        const response = await fetch('/api/stats', {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API 응답 오류: ${response.status}`);
        }

        const data = await response.json();

        // 데이터 유효성 검증
        if (!data) {
          throw new Error('서버에서 데이터를 받아오지 못했습니다');
        }

        setStats(data as StatsData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '통계 데이터 가져오기 오류';

        console.error('통계 데이터 가져오기 오류:', error);
        setFetchError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    // GPU 정보 감지
    const detectGpu = async () => {
      try {
        const capabilities = await detectGpuCapabilities();
        setGpuInfo(capabilities);
      } catch (error) {
        console.error('GPU 감지 오류:', error);
      }
    };

    fetchStats();
    detectGpu();

    // 주기적 데이터 업데이트 (60초마다)
    const intervalId = setInterval(fetchStats, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // 새 세션 시작 처리
  const handleStartNewSession = () => {
    router.push('/session/new');
  };

  // 긴급 최적화 처리
  function handleEmergencyOptimize() {
    // 긴급 최적화 모드로 호출
    optimizeMemory(true); // 긴급 모드 파라미터 추가
  }

  return (
    <div className={styles.container}>
      <section className={styles.header}>
        <h1 className={styles.title}>대시보드</h1>
        <p className={styles.subtitle}>타이핑 통계 및 시스템 모니터링</p>

        <button className={styles.newSessionButton} onClick={handleStartNewSession}>
          새 세션 시작
        </button>
      </section>

      <div className={styles.grid}>
        <section className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>타이핑 통계</h2>
          {isLoading ? (
            <div className={styles.loading}>데이터 로딩 중...</div>
          ) : fetchError ? (
            <div className={styles.error}>
              <p>데이터를 불러올 수 없습니다</p>
              <p className={styles.errorDetail}>{fetchError}</p>
              <button className={styles.retryButton} onClick={() => window.location.reload()}>
                새로고침
              </button>
            </div>
          ) : (
            <TypingStats data={stats} />
          )}
        </section>

        <section className={styles.monitoringSection}>
          <h2 className={styles.sectionTitle}>시스템 모니터링</h2>
          <MemoryMonitor
            pollInterval={10000} // 10초마다 갱신
            historyLength={15} // 15개 데이터 포인트 표시
            showControls={true} // 컨트롤 버튼 표시
            height={250} // 차트 높이
            detailed={true} // 상세 정보 표시
          />

          {/* GPU 정보 표시 */}
          {gpuInfo && (
            <div className={styles.gpuInfo}>
              <h3 className={styles.infoTitle}>GPU 정보</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>벤더:</span>
                  <span className={styles.infoValue}>{gpuInfo.vendor || '알 수 없음'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>렌더러:</span>
                  <span className={styles.infoValue}>{gpuInfo.renderer || '알 수 없음'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>하드웨어 가속:</span>
                  <span className={styles.infoValue}>
                    {gpuInfo.hardwareAccelerated ? '사용 가능' : '사용 불가'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>성능 수준:</span>
                  <span className={styles.infoValue}>
                    티어 {gpuInfo.gpuTier} (
                    {gpuInfo.gpuTier === 0
                      ? '소프트웨어 렌더링'
                      : gpuInfo.gpuTier === 1
                        ? '저사양'
                        : gpuInfo.gpuTier === 2
                          ? '중간 사양'
                          : '고사양'}
                    )
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 메모리 최적화 상태 및 컨트롤 */}
      <section className={styles.memoryControls}>
        <h3 className={styles.controlsTitle}>메모리 관리</h3>
        <div className={styles.controlsGrid}>
          <div className={styles.memoryStatus}>
            <span className={styles.statusLabel}>현재 상태:</span>
            <span className={styles.statusValue}>{isOptimizing ? '최적화 중...' : '준비됨'}</span>
            {lastOptimization && (
              <span className={styles.lastOptimized}>
                마지막 최적화: {new Date(lastOptimization).toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className={styles.memoryActions}>
            <button
              className={styles.optimizeButton}
              onClick={() => optimizeMemory(false)}
              disabled={isOptimizing}
            >
              메모리 최적화
            </button>

            <button
              className={styles.emergencyButton}
              onClick={handleEmergencyOptimize}
              disabled={isOptimizing}
            >
              긴급 최적화
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
