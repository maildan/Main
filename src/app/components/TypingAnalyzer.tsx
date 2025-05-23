'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNativeGpu } from '../hooks/useNativeGpu';
import styles from './TypingAnalyzer.module.css';

interface TypingData {
  keyCount: number;
  typingTime: number;  // 밀리초
  accuracy?: number;
}

interface TypingAnalysisResult {
  wpm: number;
  accuracy: number;
  performance_index: number;
  consistency_score: number;
  fatigue_analysis: {
    score: number;
    time_factor: number;
    intensity_factor: number;
    recommendation: string;
  };
}

export function TypingAnalyzer({ stats, _isTracking }: { 
  stats?: TypingData; 
  _isTracking?: boolean 
}) {
  const defaultStats = {
    keyCount: 0,
    typingTime: 0,
    accuracy: 0
  };

  const safeStats = stats || defaultStats;

  const { available, enabled, loading, error, computeWithGpu, toggleGpuAcceleration } = useNativeGpu();
  const [result, setResult] = useState<TypingAnalysisResult | null>(null);
  const [useGpuAcceleration, setUseGpuAcceleration] = useState<boolean>(false);

  // 타이핑 통계 분석 수행
  const analyzeTyping = useCallback(async () => {
    if (!safeStats.keyCount || !safeStats.typingTime) {
      return;
    }

    try {
      if (useGpuAcceleration && enabled) {
        // GPU 가속 분석
        const computeResult = await computeWithGpu<TypingAnalysisResult>(safeStats, 'typing');
        
        if (computeResult && computeResult.result_summary) {
          setResult(computeResult.result_summary);
        }
      } else {
        // 자바스크립트로 분석 (폴백)
        const jsResult = analyzeTypingWithJS(safeStats);
        setResult(jsResult);
      }
    } catch (err) {
      console.error('타이핑 분석 오류:', err);
      
      // 오류 시 자바스크립트 폴백 사용
      const jsResult = analyzeTypingWithJS(safeStats);
      setResult(jsResult);
    }
  }, [safeStats, useGpuAcceleration, enabled, computeWithGpu]);

  // GPU 가속 활성화/비활성화 처리
  const handleToggleGpu = useCallback(async () => {
    const newState = !useGpuAcceleration;
    setUseGpuAcceleration(newState);
    
    if (newState && available && !enabled) {
      await toggleGpuAcceleration(true);
    }
  }, [useGpuAcceleration, available, enabled, toggleGpuAcceleration]);

  // 데이터 변경 시 재분석
  useEffect(() => {
    if (safeStats.keyCount > 0 && safeStats.typingTime > 0) {
      analyzeTyping();
    }
  }, [safeStats, analyzeTyping]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>타이핑 분석</h2>
        {available && (
          <div className={styles.gpuToggle}>
            <label>
              <input
                type="checkbox"
                checked={useGpuAcceleration}
                onChange={handleToggleGpu}
                disabled={loading}
              />
              GPU 가속 사용
            </label>
          </div>
        )}
      </div>

      {loading && <div className={styles.loading}>분석 중...</div>}
      
      {error && <div className={styles.error}>{error}</div>}
      
      {result && !loading && (
        <div className={styles.results}>
          <div className={styles.stat}>
            <span className={styles.label}>속도</span>
            <span className={styles.value}>{result.wpm} WPM</span>
          </div>
          
          <div className={styles.stat}>
            <span className={styles.label}>정확도</span>
            <span className={styles.value}>{result.accuracy.toFixed(1)}%</span>
          </div>
          
          <div className={styles.stat}>
            <span className={styles.label}>성능 지수</span>
            <span className={styles.value}>{result.performance_index.toFixed(1)}</span>
          </div>
          
          <div className={styles.stat}>
            <span className={styles.label}>일관성</span>
            <span className={styles.value}>{result.consistency_score.toFixed(1)}</span>
          </div>
          
          <div className={styles.fatigue}>
            <h3>피로도 분석</h3>
            <div className={styles.fatigueMeter}>
              <div 
                className={styles.fatigueIndicator} 
                style={{ width: `${result.fatigue_analysis.score}%` }}
              />
            </div>
            <p className={styles.recommendation}>
              {result.fatigue_analysis.recommendation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// 자바스크립트로 타이핑 통계 분석 (폴백)
function analyzeTypingWithJS(data: TypingData): TypingAnalysisResult {
  const { keyCount, typingTime, accuracy = 100 } = data;
  
  // WPM 계산 (1단어 = 5타)
  const minutes = typingTime / 60000;
  const wpm = minutes > 0 ? (keyCount / 5) / minutes : 0;
  
  // 일관성 점수 (간단한 추정)
  const consistency = 65 + (Math.min(keyCount, 500) / 20);
  
  // 피로도 계산
  const fatigue = {
    score: Math.min(100, (minutes * 10) + (wpm / 10)),
    time_factor: minutes,
    intensity_factor: wpm / 100,
    recommendation: minutes > 30 
      ? '휴식이 필요합니다' 
      : minutes > 15 
        ? '짧은 휴식을 고려하세요' 
        : '좋은 상태입니다'
  };
  
  return {
    wpm,
    accuracy,
    performance_index: (wpm * accuracy / 100),
    consistency_score: consistency,
    fatigue_analysis: fatigue
  };
}
