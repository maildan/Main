'use client';

import { useState, useEffect } from 'react';
import { useNativeMemory } from '@/app/hooks/useNativeMemory';
import { OptimizationLevel } from '@/types/native-module';
import styles from './MemoryUsageMonitor.module.css';

interface MemoryUsageMonitorProps {
  autoOptimize?: boolean;
  showControls?: boolean;
  refreshInterval?: number;
  memoryThreshold?: number;
}

const MemoryUsageMonitor: React.FC<MemoryUsageMonitorProps> = ({
  autoOptimize = true,
  showControls = true,
  refreshInterval = 5000,
  memoryThreshold = 100
}) => {
  const { 
    memoryInfo, 
    optimizationLevel, 
    loading, 
    fetchMemoryInfo, 
    performOptimization,
    performGC,
    autoOptimize: runAutoOptimize
  } = useNativeMemory(true, refreshInterval);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [optimizeStatus, setOptimizeStatus] = useState<string | null>(null);
  
  // 메모리 최적화 레벨에 따른 색상 클래스
  const getLevelColorClass = (level: number): string => {
    switch (level) {
      case OptimizationLevel.Critical:
        return styles.critical;
      case OptimizationLevel.High:
        return styles.high;
      case OptimizationLevel.Medium:
        return styles.medium;
      case OptimizationLevel.Low:
        return styles.low;
      default:
        return styles.normal;
    }
  };
  
  // 메모리 사용량 표시
  const getMemoryUsageText = (): string => {
    if (!memoryInfo) return '메모리 정보 로드 중...';
    
    const usedMB = memoryInfo.heap_used_mb.toFixed(1);
    const totalMB = (memoryInfo.heap_total / (1024 * 1024)).toFixed(1);
    const percent = memoryInfo.percent_used.toFixed(1);
    
    return `${usedMB}MB / ${totalMB}MB (${percent}%)`;
  };
  
  // 표시될 최적화 레벨 텍스트
  const getLevelText = (level: number): string => {
    switch (level) {
      case OptimizationLevel.Critical:
        return '위험';
      case OptimizationLevel.High:
        return '높음';
      case OptimizationLevel.Medium:
        return '중간';
      case OptimizationLevel.Low:
        return '낮음';
      default:
        return '정상';
    }
  };
  
  // 수동 메모리 최적화 실행
  const handleOptimize = async (level: OptimizationLevel, emergency: boolean = false) => {
    setOptimizeStatus('최적화 중...');
    try {
      await performOptimization(level, emergency);
      setOptimizeStatus('최적화 완료');
      setTimeout(() => setOptimizeStatus(null), 2000);
    } catch (error) {
      setOptimizeStatus('최적화 실패');
      setTimeout(() => setOptimizeStatus(null), 2000);
    }
  };
  
  // 수동 GC 실행
  const handleGC = async () => {
    setOptimizeStatus('GC 수행 중...');
    try {
      await performGC();
      setOptimizeStatus('GC 완료');
      setTimeout(() => setOptimizeStatus(null), 2000);
    } catch (error) {
      setOptimizeStatus('GC 실패');
      setTimeout(() => setOptimizeStatus(null), 2000);
    }
  };
  
  // 자동 최적화 실행
  useEffect(() => {
    if (!autoOptimize || !memoryInfo) return;
    
    // 메모리 사용량이 임계값을 초과하면 자동 최적화 실행
    if (memoryInfo.heap_used_mb > memoryThreshold) {
      runAutoOptimize();
    }
  }, [memoryInfo, autoOptimize, memoryThreshold, runAutoOptimize]);
  
  return (
    <div className={`${styles.container} ${getLevelColorClass(optimizationLevel)}`}>
      <div className={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <div className={styles.title}>
          <span className={styles.icon}>📊</span>
          <span>메모리 사용량</span>
        </div>
        <div className={styles.status}>
          {loading ? (
            <span className={styles.loading}>로딩 중...</span>
          ) : (
            <>
              <span className={styles.memoryUsage}>{getMemoryUsageText()}</span>
              <span className={`${styles.level} ${getLevelColorClass(optimizationLevel)}`}>
                {getLevelText(optimizationLevel)}
              </span>
            </>
          )}
        </div>
        <button className={styles.expandButton}>
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      
      {isExpanded && showControls && (
        <div className={styles.controls}>
          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.button} ${styles.lowButton}`}
              onClick={() => handleOptimize(OptimizationLevel.Low)}
              disabled={loading}
            >
              가벼운 최적화
            </button>
            <button 
              className={`${styles.button} ${styles.mediumButton}`}
              onClick={() => handleOptimize(OptimizationLevel.Medium)}
              disabled={loading}
            >
              중간 최적화
            </button>
            <button 
              className={`${styles.button} ${styles.highButton}`}
              onClick={() => handleOptimize(OptimizationLevel.High)}
              disabled={loading}
            >
              높은 최적화
            </button>
            <button 
              className={`${styles.button} ${styles.criticalButton}`}
              onClick={() => handleOptimize(OptimizationLevel.Critical, true)}
              disabled={loading}
            >
              긴급 최적화
            </button>
            <button 
              className={`${styles.button} ${styles.gcButton}`}
              onClick={handleGC}
              disabled={loading}
            >
              GC 실행
            </button>
          </div>
          
          {optimizeStatus && (
            <div className={styles.optimizeStatus}>
              {optimizeStatus}
            </div>
          )}
          
          <div className={styles.details}>
            {memoryInfo && (
              <>
                <div className={styles.detailItem}>
                  <span className={styles.label}>힙 사용량:</span>
                  <span className={styles.value}>{memoryInfo.heap_used_mb.toFixed(2)} MB</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>RSS:</span>
                  <span className={styles.value}>{memoryInfo.rss_mb.toFixed(2)} MB</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>사용률:</span>
                  <span className={styles.value}>{memoryInfo.percent_used.toFixed(2)}%</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>최적화 레벨:</span>
                  <span className={`${styles.value} ${getLevelColorClass(optimizationLevel)}`}>
                    {getLevelText(optimizationLevel)}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.label}>마지막 갱신:</span>
                  <span className={styles.value}>
                    {new Date(memoryInfo.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryUsageMonitor;
