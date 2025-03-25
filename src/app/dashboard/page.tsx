'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MemoryMonitor from '../components/MemoryMonitor';
import TypingStats from '../components/TypingStats';
import { useMemoryOptimizer } from '../utils/memory/hooks';
import { detectGpuCapabilities } from '../utils/gpu-detection';
import styles from './page.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [gpuInfo, setGpuInfo] = useState<any>(null);
  
  // 메모리 최적화 기능 사용
  const memoryOptimizer = useMemoryOptimizer({
    threshold: 100,       // 100MB 이상일 때 경고
    autoOptimize: true,   // 자동 최적화 활성화
    showWarnings: true,   // 경고 표시
    debug: false          // 디버그 모드 비활성화
  });
  
  // 통계 데이터 가져오기
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 서버에서 통계 데이터 가져오기
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('통계 데이터 가져오기 오류:', error);
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
  
  return (
    <div className={styles.container}>
      <section className={styles.header}>
        <h1 className={styles.title}>대시보드</h1>
        <p className={styles.subtitle}>타이핑 통계 및 시스템 모니터링</p>
        
        <button 
          className={styles.newSessionButton}
          onClick={handleStartNewSession}
        >
          새 세션 시작
        </button>
      </section>
      
      <div className={styles.grid}>
        <section className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>타이핑 통계</h2>
          {isLoading ? (
            <div className={styles.loading}>데이터 로딩 중...</div>
          ) : (
            <TypingStats data={stats} />
          )}
        </section>
        
        <section className={styles.monitoringSection}>
          <h2 className={styles.sectionTitle}>시스템 모니터링</h2>
          <MemoryMonitor 
            pollInterval={10000}     // 10초마다 갱신
            historyLength={15}       // 15개 데이터 포인트 표시
            showControls={true}      // 컨트롤 버튼 표시
            height={250}             // 차트 높이
            detailed={true}          // 상세 정보 표시
          />
          
          {/* GPU 정보 표시 */}
          {gpuInfo && (
            <div className={styles.gpuInfo}>
              <h3 className={styles.infoTitle}>GPU 정보</h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>벤더:</span>
                  <span className={styles.infoValue}>{gpuInfo.vendor}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>렌더러:</span>
                  <span className={styles.infoValue}>{gpuInfo.renderer}</span>
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
                    티어 {gpuInfo.gpuTier} ({
                      gpuInfo.gpuTier === 0 ? '소프트웨어 렌더링' :
                      gpuInfo.gpuTier === 1 ? '저사양' :
                      gpuInfo.gpuTier === 2 ? '중간 사양' :
                      '고사양'
                    })
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
            <span className={styles.statusValue}>
              {memoryOptimizer.isOptimizing ? '최적화 중...' : '준비됨'}
            </span>
          </div>
          
          <div className={styles.memoryActions}>
            <button 
              className={styles.optimizeButton}
              onClick={memoryOptimizer.optimizeMemory}
              disabled={memoryOptimizer.isOptimizing}
            >
              메모리 최적화
            </button>
            
            <button 
              className={styles.emergencyButton}
              onClick={memoryOptimizer.emergencyOptimize}
              disabled={memoryOptimizer.isOptimizing}
            >
              긴급 최적화
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
