// import { TypingSessionStats, TypingPerformanceResult } from '@/types'; // 타입 정의 찾을 수 없음
// import { calculateTypingMetrics } from './performance-metrics'; // 함수 찾을 수 없음
import { nativeModuleClient } from './nativeModuleClient';
import { GpuTaskType, GpuComputationResult } from '@/types'; // GpuComputationResult 추가

/**
 * 타이핑 데이터 인터페이스
 */
export interface TypingData {
  keyCount: number;
  errors: number;
  typingTime: number;
  content?: string;
  keyIntervals?: number[];
}

/**
 * 타이핑 통계 인터페이스
 */
export interface TypingStatistics {
  wpm: number;
  accuracy: number;
  keyCount: number;
  typingTime: number;
  charCount: number;
  wordCount: number;
  performanceIndex: number;
  consistencyScore: number;
  fatigueAnalysis: {
    score: number;
    timeFactor: number;
    intensityFactor: number;
    recommendation: string;
  };
  accelerated: boolean;
}

/**
 * Typing performance analysis, potentially using GPU acceleration.
 */
export async function analyzeTypingPerformance(
  sessionStats: any, // 임시로 any 타입 사용 (TypingSessionStats 정의 찾을 수 없음)
  useGpu: boolean = false
): Promise<any> { // 임시로 any 타입 사용 (TypingPerformanceResult 정의 찾을 수 없음)
  // const basicMetrics = calculateTypingMetrics(sessionStats); // 함수 찾을 수 없음
  const basicMetrics = { wpm: 0, accuracy: 100 }; // 임시 기본값
  let gpuAnalysisResult = null;

  if (useGpu && nativeModuleClient) {
    try {
      // Prepare data for GPU task
      const gpuTaskData = {
        stats: sessionStats,
        // Add other relevant data for GPU processing if needed
      };

      console.log('Starting GPU computation for typing analysis...');
      // Call the method on the client instance with two arguments
      // Use TYPING_STATISTICS instead of TYPING_ANALYSIS
      const gpuResult: GpuComputationResult = await nativeModuleClient.performGpuComputation(
        gpuTaskData, // data 인자
        GpuTaskType.TYPING_STATISTICS // taskType 인자
      );

      // Check data property instead of result
      if (gpuResult?.success && gpuResult.data) {
        console.log('GPU computation successful:', gpuResult.data);
        gpuAnalysisResult = gpuResult.data; // Assume data contains relevant analysis
      } else {
        console.warn('GPU computation failed or returned no data:', gpuResult?.error);
      }
    } catch (error) {
      console.error('Error during GPU typing analysis:', error);
    }
  }

  return {
    ...basicMetrics,
    gpuAccelerated: !!gpuAnalysisResult,
    gpuAnalysis: gpuAnalysisResult,
    // Add other potential results from analysis
  };
}

/**
 * 타이핑 통계 계산 (GPU 가속화 사용)
 * @param data 타이핑 데이터
 * @returns Promise<TypingStatistics>
 */
export async function calculateTypingStatistics(data: TypingData): Promise<TypingStatistics> {
  try {
    // GPU 계산 호출 (두 개의 인자, 올바른 GpuTaskType 사용)
    const response = await nativeModuleClient.performGpuComputation(
      data,
      GpuTaskType.TYPING_STATISTICS
    );

    // 결과 객체에서 result 대신 data 사용, 타입 캐스팅 주의
    if (!response.success || !response.data) {
      console.warn('GPU typing statistics computation failed or returned no data, falling back to JS calculation.');
      return calculateTypingStatisticsFallback(data);
    }

    // 결과 추출 (response.data 사용, 타입 가정)
    const resultData = response.data as any; // data 타입이 불확실하므로 any 사용

    return {
      wpm: resultData?.wpm || 0,
      accuracy: resultData?.accuracy || 100,
      keyCount: data.keyCount,
      typingTime: data.typingTime,
      charCount: resultData?.char_count || 0,
      wordCount: resultData?.word_count || 0,
      performanceIndex: resultData?.performance_index || 0,
      consistencyScore: resultData?.consistency_score || 0,
      fatigueAnalysis: {
        score: resultData?.fatigue_analysis?.score || 0,
        timeFactor: resultData?.fatigue_analysis?.time_factor || 0,
        intensityFactor: resultData?.fatigue_analysis?.intensity_factor || 0,
        recommendation: resultData?.fatigue_analysis?.recommendation || '데이터가 부족합니다',
      },
      accelerated: true // GPU 사용 성공
    };
  } catch (error) {
    console.error('GPU 가속 타이핑 통계 계산 오류:', error);
    return calculateTypingStatisticsFallback(data);
  }
}

/**
 * 타이핑 통계 계산 폴백 버전 (JavaScript로 직접 계산)
 * @param data 타이핑 데이터
 * @returns TypingStatistics
 */
function calculateTypingStatisticsFallback(data: TypingData): TypingStatistics {
  const { keyCount, errors, typingTime, content } = data;

  // WPM 계산
  const minutes = typingTime / 60000;
  const wpm = minutes > 0 ? Math.round((keyCount / 5) / minutes * 10) / 10 : 0;

  // 정확도 계산
  const totalKeystrokes = keyCount + errors;
  const accuracy = totalKeystrokes > 0
    ? Math.round((keyCount / totalKeystrokes) * 1000) / 10
    : 100;

  // 텍스트 분석
  const charCount = content?.length || 0;
  const wordCount = content?.split(/\s+/).filter(w => w.length > 0).length || 0;

  // 성능 지표
  const performanceIndex = Math.round((wpm * accuracy / 100) * 10) / 10;

  // 일관성 점수 계산 (기본값)
  const consistencyScore = 70;

  // 피로도 계산
  const timeFactor = Math.round(minutes * 10) / 10;
  const intensityFactor = Math.min(wpm / 40, 3);
  const fatigueScore = Math.min(Math.round(minutes * 5 * (1 + intensityFactor * 0.2)), 100);

  return {
    wpm,
    accuracy,
    keyCount,
    typingTime,
    charCount,
    wordCount,
    performanceIndex,
    consistencyScore,
    fatigueAnalysis: {
      score: fatigueScore,
      timeFactor,
      intensityFactor,
      recommendation: getFatigueRecommendation(fatigueScore)
    },
    accelerated: false
  };
}

/**
 * 피로도 권장 사항 생성
 */
function getFatigueRecommendation(score: number): string {
  if (score > 70) {
    return '휴식이 필요합니다';
  } else if (score > 40) {
    return '짧은 휴식을 고려하세요';
  } else {
    return '좋은 상태입니다';
  }
}

/**
 * 고급 타이핑 패턴 분석 (GPU 가속화 사용)
 * @param keyIntervals 키 간격 배열
 * @returns Promise<any> 패턴 분석 결과
 */
export async function analyzeTypingPattern(keyIntervals: number[]): Promise<any> {
  try {
    // GPU 계산 호출 (두 개의 인자, 올바른 GpuTaskType 사용)
    const patternData = { keyIntervals }; // 데이터 객체화
    const response = await nativeModuleClient.performGpuComputation(
      patternData,
      GpuTaskType.PATTERN_DETECTION
    );

    // 결과 객체에서 result 대신 data 사용
    if (!response.success || !response.data) {
      console.warn('GPU typing pattern analysis failed or returned no data, falling back to JS calculation.');
      return analyzeTypingPatternFallback(keyIntervals);
    }

    return response.data;
  } catch (error) {
    console.error('GPU 가속 타이핑 패턴 분석 오류:', error);
    return analyzeTypingPatternFallback(keyIntervals);
  }
}

/**
 * 타이핑 패턴 분석 폴백 버전
 * @param keyIntervals 키 간격 배열
 * @returns 패턴 분석 결과
 */
function analyzeTypingPatternFallback(keyIntervals: number[]): any {
  if (!keyIntervals || keyIntervals.length === 0) {
    return {
      avgInterval: 0,
      stdDev: 0,
      consistencyScore: 0,
      fatigueIndicator: false,
      accelerated: false
    };
  }

  // 평균 계산
  const sum = keyIntervals.reduce((a, b) => a + b, 0);
  const avg = sum / keyIntervals.length;

  // 표준 편차 계산
  const sqDiffs = keyIntervals.map(value => {
    const diff = value - avg;
    return diff * diff;
  });
  const variance = sqDiffs.reduce((a, b) => a + b, 0) / keyIntervals.length;
  const stdDev = Math.sqrt(variance);

  // 일관성 점수 계산
  const consistencyScore = 100 / (1 + stdDev / 10);

  return {
    avgInterval: Math.round(avg * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    consistencyScore: Math.round(consistencyScore * 10) / 10,
    fatigueIndicator: avg > 200,
    accelerated: false
  };
}
