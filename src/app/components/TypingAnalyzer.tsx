'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNativeGpu } from '../hooks/useNativeGpu';
import { useElectronApi } from '../hooks/useElectronApi';
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
  const { electronAPI: electronApi, isElectron } = useElectronApi();

  const { available, enabled, loading, error, computeWithGpu, toggleGpuAcceleration } = useNativeGpu();
  const [result, setResult] = useState<TypingAnalysisResult | null>(null);
  const [useGpuAcceleration, setUseGpuAcceleration] = useState<boolean>(false);
  const [electronStats, setElectronStats] = useState<TypingData | null>(null);

  // Electron 환경에서 타이핑 통계 가져오기
  useEffect(() => {
    if (isElectron && electronApi) {
      const getElectronStats = async () => {
        try {
          // Electron IPC를 통해 통계 가져오기
          if (electronApi.getTypingStats) {
            const currentStats = await electronApi.getTypingStats();
            if (currentStats) {
              setElectronStats({
                keyCount: currentStats.keyCount || 0,
                typingTime: currentStats.typingTime * 1000 || 0, // 초 -> 밀리초 변환
                accuracy: currentStats.accuracy || 100
              });
            }
          }
        } catch (error) {
          console.error('Electron 통계 가져오기 실패:', error);
        }
      };

      // 초기 로드 및 주기적 업데이트
      getElectronStats();
      const interval = setInterval(getElectronStats, 5000); // 5초마다 업데이트

      // Electron IPC 이벤트 리스너 설정
      let unsubscribe: (() => void) | undefined;
      
      if (electronApi.onTypingStatsUpdate) {
        // 콜백 함수를 직접 전달하는 방식으로 수정
        unsubscribe = electronApi.onTypingStatsUpdate((data: TypingData) => {
          if (data) {
            setElectronStats({
              keyCount: data.keyCount || 0,
              typingTime: data.typingTime * 1000 || 0, // 초 -> 밀리초 변환
              accuracy: data.accuracy || 100
            });
          }
        });
      }

      return () => {
        clearInterval(interval);
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, [isElectron, electronApi]);

  // 설정에서 GPU 가속 여부 가져오기
  useEffect(() => {
    const loadGpuSetting = async () => {
      try {
        if (electronApi && electronApi.loadSettings) {
          // Electron 환경에서 설정 로드
          const settings = await electronApi.loadSettings();
          if (settings) {
            setUseGpuAcceleration(!!settings.useTypingAnalysisGpuAcceleration);
          }
        } else {
          // 웹 환경에서 설정 로드
          const response = await fetch('/api/settings/get');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.settings) {
              const useGpuAcceleration = data.settings.useTypingAnalysisGpuAcceleration;
              setUseGpuAcceleration(!!useGpuAcceleration);
            }
          } else {
            console.warn('GPU 가속 설정을 불러오는데 실패했습니다. 기본값으로 설정합니다.');
          }
        }
        
        // GPU 모듈 활성화 여부 확인
        if (useGpuAcceleration && available && !enabled) {
          await toggleGpuAcceleration(true);
        }
      } catch (error) {
        console.error('GPU 설정을 불러오는 중 오류 발생:', error);
      }
    };
    
    loadGpuSetting();
  }, [available, enabled, toggleGpuAcceleration, electronApi, useGpuAcceleration]);

  // 타이핑 통계 분석 수행
  const analyzeTyping = useCallback(async () => {
    // 실제 사용할 통계 데이터 결정
    const dataToAnalyze = isElectron && electronStats ? electronStats : safeStats;
    
    if (!dataToAnalyze.keyCount || !dataToAnalyze.typingTime) {
      return;
    }

    try {
      if (useGpuAcceleration && enabled) {
        // GPU 가속 분석
        const computeResult = await computeWithGpu<TypingAnalysisResult>(dataToAnalyze, 'typing');
        
        if (computeResult && computeResult.result_summary) {
          setResult(computeResult.result_summary);
        }
      } else {
        // 자바스크립트로 분석 (폴백)
        const jsResult = analyzeTypingWithJS(dataToAnalyze);
        setResult(jsResult);
      }
    } catch (err) {
      console.error('타이핑 분석 오류:', err);
      
      // 오류 시 자바스크립트 폴백 사용
      const jsResult = analyzeTypingWithJS(dataToAnalyze);
      setResult(jsResult);
    }
  }, [safeStats, electronStats, isElectron, useGpuAcceleration, enabled, computeWithGpu]);

  // 데이터 변경 시 재분석
  useEffect(() => {
    // 브라우저 환경
    if (!isElectron && safeStats.keyCount > 0 && safeStats.typingTime > 0) {
      analyzeTyping();
    }
    // Electron 환경
    else if (isElectron && electronStats && electronStats.keyCount > 0 && electronStats.typingTime > 0) {
      analyzeTyping();
    }
  }, [safeStats, electronStats, isElectron, analyzeTyping]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>타이핑 분석</h2>
      </div>

      {loading && <div className={styles.loading}>분석 중...</div>}
      
      {error && <div className={styles.error}>{error}</div>}
      
      {result && !loading && (
        <div className={styles.results}>
          <div className={styles.stat}>
            <span className={styles.label}>속도</span>
            <span className={styles.value}>{Math.round(result.wpm)} WPM</span>
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

      {!result && !loading && (
        <div className={styles.noData}>
          <p>타이핑 데이터가 충분하지 않습니다.</p>
          <p>키보드 입력이 감지되면 분석이 시작됩니다.</p>
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
