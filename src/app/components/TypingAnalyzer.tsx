'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useNativeGpu } from '@/app/hooks/useNativeGpu';
import { GpuTaskType } from '@/types';
import { TypingData, TypingStatistics } from '../utils/typing-performance';
import { useElectronApi } from '../hooks/useElectronApi';
import styles from './TypingAnalyzer.module.css';

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

interface TypingAnalyzerProps {
  // text prop 제거 (컴포넌트 내부에서 관리 또는 다른 방식으로 전달)
}

const TypingAnalyzer: React.FC<TypingAnalyzerProps> = (): React.ReactNode => {
  const defaultStats = {
    keyCount: 0,
    typingTime: 0,
    accuracy: 0
  };

  const safeStats = defaultStats;
  const { electronAPI: electronApi, isElectron } = useElectronApi();

  const {
    gpuInfo,
    accelerationStatus,
    loading,
    error,
    fetchGpuInfo,
    updateGpuAcceleration,
    executeGpuTask,
  } = useNativeGpu();
  const [result, setResult] = useState<TypingStatistics | null>(null);
  const [useGpuAcceleration, setUseGpuAcceleration] = useState<boolean>(accelerationStatus?.enabled ?? false);

  // Electron 환경에서 타이핑 통계 가져오기
  useEffect(() => {
    if (isElectron && electronApi) {
      const getElectronStats = async () => {
        try {
          // Electron IPC를 통해 통계 가져오기
          if (electronApi.getTypingStats) {
            const currentStats = await electronApi.getTypingStats();
            if (currentStats) {
              setResult({
                keyCount: currentStats.keyCount || 0,
                typingTime: currentStats.typingTime * 1000 || 0, // 초 -> 밀리초 변환
                accuracy: currentStats.accuracy || 100,
                wpm: currentStats.wpm || 0,
                performanceIndex: currentStats.performanceIndex || 0,
                consistencyScore: currentStats.consistencyScore || 0,
                fatigueAnalysis: currentStats.fatigueAnalysis || { score: 0, timeFactor: 0, intensityFactor: 0, recommendation: 'N/A' },
                charCount: currentStats.charCount || 0,
                wordCount: currentStats.wordCount || 0,
                accelerated: currentStats.accelerated || false,
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
            setResult({
              keyCount: data.keyCount || 0,
              typingTime: data.typingTime * 1000 || 0, // 초 -> 밀리초 변환
              accuracy: data.accuracy || 100,
              wpm: data.wpm || 0,
              performanceIndex: data.performanceIndex || 0,
              consistencyScore: data.consistencyScore || 0,
              fatigueAnalysis: data.fatigueAnalysis || { score: 0, timeFactor: 0, intensityFactor: 0, recommendation: 'N/A' },
              charCount: data.charCount || 0,
              wordCount: data.wordCount || 0,
              accelerated: data.accelerated || false,
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
        if (useGpuAcceleration && accelerationStatus?.available && !accelerationStatus.enabled) {
          await updateGpuAcceleration(true);
        }
      } catch (error) {
        console.error('GPU 설정을 불러오는 중 오류 발생:', error);
      }
    };

    loadGpuSetting();
  }, [accelerationStatus, updateGpuAcceleration, electronApi, useGpuAcceleration]);

  // 타이핑 통계 분석 수행
  const analyzeTyping = useCallback(async () => {
    // 실제 사용할 통계 데이터 결정
    const dataToAnalyze = isElectron && result ? result : safeStats;

    if (!dataToAnalyze.keyCount || !dataToAnalyze.typingTime) {
      return;
    }

    try {
      if (useGpuAcceleration && accelerationStatus?.enabled) {
        // GPU 가속 분석
        const gpuResult = await executeGpuTask(GpuTaskType.TYPING_STATISTICS, dataToAnalyze);

        if (gpuResult && gpuResult.success && gpuResult.data) {
          setResult({ ...(gpuResult.data as any), accelerated: true });
        } else {
          console.warn('GPU analysis failed, falling back to CPU analysis.', gpuResult?.error);
          const jsResult = analyzeTypingWithJS(dataToAnalyze);
          setResult({ ...jsResult, accelerated: false });
        }
      } else {
        // 자바스크립트로 분석 (폴백)
        const jsResult = analyzeTypingWithJS(dataToAnalyze);
        setResult({ ...jsResult, accelerated: false });
      }
    } catch (err) {
      console.error('타이핑 분석 오류:', err);

      // 오류 시 자바스크립트 폴백 사용
      const jsResult = analyzeTypingWithJS(dataToAnalyze);
      setResult({ ...jsResult, accelerated: false });
    }
  }, [safeStats, result, isElectron, useGpuAcceleration, accelerationStatus, executeGpuTask]);

  // 데이터 변경 시 재분석
  useEffect(() => {
    // 브라우저 환경
    if (!isElectron && safeStats.keyCount > 0 && safeStats.typingTime > 0) {
      analyzeTyping();
    }
    // Electron 환경
    else if (isElectron && result && result.keyCount > 0 && result.typingTime > 0) {
      analyzeTyping();
    }
  }, [safeStats, result, isElectron, analyzeTyping]);

  const handleToggleGpu = useCallback(async (checked: boolean) => {
    // updateGpuAcceleration 함수 사용
    const success = await updateGpuAcceleration(checked);
    if (success) {
      setUseGpuAcceleration(checked);
      // 성공/실패 메시지 표시 가능
    } else {
      // 실패 시 스위치 상태 원복
      setUseGpuAcceleration(!checked);
    }
  }, [updateGpuAcceleration]);

  // 로딩 상태 통합 (info, acceleration, computation 중 하나라도 true면 로딩)
  const isLoading = loading.info || loading.acceleration || loading.computation;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Typing Performance Analyzer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center space-x-2">
          <Switch
            id="gpu-switch"
            checked={useGpuAcceleration}
            onCheckedChange={handleToggleGpu}
            disabled={!accelerationStatus?.available || isLoading}
          />
          <Label htmlFor="gpu-switch">Use GPU Acceleration</Label>
          {loading.acceleration && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>

        {!accelerationStatus?.available && (
          <Alert variant="warning">
            <AlertTitle>GPU Not Available</AlertTitle>
            <AlertDescription>
              GPU acceleration is not available or not supported on this system.
              Analysis will run on CPU.
            </AlertDescription>
          </Alert>
        )}

        <Button onClick={analyzeTyping} disabled={isLoading}>
          {(isLoading && !accelerationStatus?.enabled) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Analyze Typing Data
        </Button>

        {(isLoading && !accelerationStatus?.enabled) && <p>Loading GPU information...</p>}

        {result && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Analysis Result {result.accelerated ? '(GPU Accelerated)' : '(CPU)'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>WPM: <strong>{result.wpm}</strong></p>
              <p>Accuracy: <strong>{result.accuracy}%</strong></p>
              <p>Performance Index: <strong>{result.performanceIndex}</strong></p>
              <p>Consistency Score: <strong>{result.consistencyScore}</strong></p>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
};

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

export default TypingAnalyzer;
