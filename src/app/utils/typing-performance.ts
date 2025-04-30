import { performGpuComputation, GpuTaskType } from './nativeModuleClient';

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
 * 타이핑 통계 계산 (GPU 가속화 사용)
 * @param data 타이핑 데이터
 * @returns Promise<TypingStatistics>
 */
export async function calculateTypingStatistics(data: TypingData): Promise<TypingStatistics> {
  try {
    // GPU 계산 호출
    const result = await performGpuComputation(GpuTaskType.TypingStatistics, data);
    
    if (!result) {
      return calculateTypingStatisticsFallback(data);
    }
    
    return {
      wpm: result.wpm || 0,
      accuracy: result.accuracy || 100,
      keyCount: data.keyCount,
      typingTime: data.typingTime,
      charCount: result.char_count || 0,
      wordCount: result.word_count || 0,
      performanceIndex: result.performance_index || 0,
      consistencyScore: result.consistency_score || 0,
      fatigueAnalysis: {
        score: result.fatigue_analysis?.score || 0,
        timeFactor: result.fatigue_analysis?.time_factor || 0,
        intensityFactor: result.fatigue_analysis?.intensity_factor || 0,
        recommendation: result.fatigue_analysis?.recommendation || '데이터가 부족합니다',
      },
      accelerated: true
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
    // GPU 계산 호출
    const result = await performGpuComputation(
      GpuTaskType.PatternDetection, 
      {
        keyIntervals,
        size: 'medium'
      }
    );
    
    if (!result) {
      return analyzeTypingPatternFallback(keyIntervals);
    }
    
    return {
      ...result,
      accelerated: true
    };
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
