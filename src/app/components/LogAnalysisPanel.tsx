'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LearningModelType, LearningResult } from '../utils/log-learning';
import { formatBytes, formatTime } from '../utils/format-utils';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import styles from './LogAnalysisPanel.module.css';

/**
 * 시간별 데이터를 위한 타입 정의
 */
interface HourData {
  hour: number;
  count: number;
  percentage?: number;
  // 필요한 다른 속성들 추가
}

/**
 * 세션 데이터를 위한 타입 정의
 */
interface SessionData {
  id: string;
  duration: number;
  keyCount: number;
  date: string;
  // 필요한 다른 속성들 추가
}

/**
 * 단어 데이터를 위한 타입 정의
 */
interface WordData {
  word: string;
  count: number;
  percentage?: number;
  // 필요한 다른 속성들 추가
}

interface LogAnalysisPanelProps {
  className?: string;
}

/**
 * 로그 분석 패널 컴포넌트
 * 로그 데이터를 학습하고 분석 결과를 표시합니다.
 */
export default function LogAnalysisPanel({ className = '' }: LogAnalysisPanelProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LearningResult[]>([]);
  const [selectedTab, setSelectedTab] = useState<LearningModelType>(LearningModelType.MEMORY_OPTIMIZATION);
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number | null>(null);
  const [combinedRecommendations, setCombinedRecommendations] = useState<string[]>([]);

  // 학습 상태
  const [, setLearningStatus] = useState<{
    isLearning: boolean;
    lastLearningTime: number | null;
    availableModels: LearningModelType[];
  }>({
    isLearning: false,
    lastLearningTime: null,
    availableModels: Object.values(LearningModelType)
  });

  const learningStatusRef = useRef(false);

  /**
   * 학습 상태 확인
   */
  const checkLearningStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/logs/learn');

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setLearningStatus(data.status || {
          isLearning: false,
          lastLearningTime: null,
          availableModels: Object.values(LearningModelType)
        });
      } else {
        console.error('학습 상태 확인 오류:', data.error);
      }
    } catch (error: any) {
      console.error('학습 상태 확인 중 오류 발생:', error);
    }
  }, []);

  // 컴포넌트 마운트 시 학습 상태 확인
  useEffect(() => {
    checkLearningStatus();
  }, [checkLearningStatus]);

  /**
   * 학습 실행
   */
  const runLearning = useCallback(async (models: LearningModelType[] = []) => {
    // 모델을 지정하지 않은 경우 기본값으로 모든 모델 사용
    const modelsToLearn = models.length > 0
      ? models
      : Object.values(LearningModelType);

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/logs/learn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modelTypes: modelsToLearn,
          options: {
            memory: {
              timeRange: {
                startTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1주일
                endTime: Date.now()
              }
            },
            user: {
              timeRange: {
                startTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // 1개월
                endTime: Date.now()
              }
            },
            error: {
              timeRange: {
                startTime: Date.now() - 30 * 24 * 60 * 60 * 1000, // 1개월
                endTime: Date.now()
              }
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setResults(data.results || []);
        setCombinedRecommendations(data.combinedRecommendations || []);
        setLastAnalysisTime(data.timestamp || Date.now());

        // 학습 상태 업데이트
        await checkLearningStatus();
      } else {
        setError(data.error || '알 수 없는 오류가 발생했습니다.');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [checkLearningStatus]);

  /**
   * 특정 모델 유형에 대한 학습 결과 가져오기
   */
  const getResultForModel = (modelType: LearningModelType): LearningResult | undefined => {
    return results.find(result => result.modelType === modelType);
  };

  /**
   * 학습 결과에서 추천 사항 렌더링
   */
  const renderRecommendations = (recommendations: string[]) => {
    return (
      <ul className={styles.recommendationList}>
        {recommendations.map((rec, index) => (
          <li key={index} className={styles.recommendationItem}>{rec}</li>
        ))}
      </ul>
    );
  };

  /**
   * 통계 항목 렌더링
   */
  const renderMetricItem = (label: string, value: any) => {
    let formattedValue = value;

    // 숫자인 경우 소수점 처리
    if (typeof value === 'number') {
      // 메모리 관련 항목은 MB 또는 바이트로 표시
      if (label.toLowerCase().includes('memory') ||
        label.toLowerCase().includes('heap') ||
        label.toLowerCase().includes('size')) {
        formattedValue = formatBytes(value);
      }
      // 0과 1 사이의 값은 백분율로 표시
      else if (value > 0 && value < 1) {
        formattedValue = `${(value * 100).toFixed(2)}%`;
      }
      // 기타 숫자는 소수점 2자리까지 표시
      else {
        formattedValue = Number.isInteger(value) ? value : value.toFixed(2);
      }
    }

    return (
      <div key={label} className={styles.metricItem}>
        <span className={styles.metricLabel}>{label}:</span>
        <span className={styles.metricValue}>{formattedValue}</span>
      </div>
    );
  };

  /**
   * 메모리 최적화 결과 렌더링
   */
  const renderMemoryOptimizationResults = () => {
    const result = getResultForModel(LearningModelType.MEMORY_OPTIMIZATION);

    if (!result) {
      return (
        <div className={styles.noResults}>
          <p>메모리 최적화 학습 결과가 없습니다.</p>
          <button
            onClick={() => runLearning([LearningModelType.MEMORY_OPTIMIZATION])}
            disabled={isLoading}
            className={styles.learningButton}
          >
            메모리 패턴 학습하기
          </button>
        </div>
      );
    }

    const { insights, recommendations, metrics } = result;

    return (
      <div className={styles.resultSection}>
        <h3>메모리 사용량 분석 결과</h3>

        {/* 인사이트 표시 */}
        <div className={styles.insightsSection}>
          <h4>주요 인사이트</h4>

          {insights.map((insight, index) => {
            if (insight.type === 'peakHours' && insight.data.length > 0) {
              return (
                <div key={index} className={styles.insightItem}>
                  <h5>메모리 사용량 피크 시간대</h5>
                  <div className={styles.peakHoursChart}>
                    {insight.data.map((hour: HourData, i: number) => (
                      <div key={i} className={styles.hourBar}>
                        <div 
                          className={styles.hourBarFill} 
                          style={{ height: `${hour.percentage || 0}%` }}
                        />
                        <span className={styles.hourLabel}>{hour.hour}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (insight.type === 'problematicSessions' && insight.data.length > 0) {
              return (
                <div key={index} className={styles.insightItem}>
                  <h5>의심되는 메모리 누수 세션</h5>
                  <ul className={styles.sessionsList}>
                    {insight.data.map((session: SessionData, i: number) => (
                      <div key={i} className={styles.sessionItem}>
                        <div className={styles.sessionDetails}>
                          <span className={styles.sessionDate}>{session.date}</span>
                          <span className={styles.sessionDuration}>{formatTime(session.duration)}</span>
                        </div>
                        <div className={styles.sessionKeyCount}>
                          <KeyboardIcon className={styles.keyIcon} />
                          <span>{session.keyCount}</span>
                        </div>
                      </div>
                    ))}
                  </ul>
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* 메트릭 표시 */}
        <div className={styles.metricsSection}>
          <h4>메모리 사용 통계</h4>
          <div className={styles.metricsGrid}>
            {Object.entries(metrics).map(([key, value]) =>
              renderMetricItem(
                key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase()),
                value
              )
            )}
          </div>
        </div>

        {/* 추천 사항 표시 */}
        <div className={styles.recommendationsSection}>
          <h4>추천 사항</h4>
          {renderRecommendations(recommendations)}
        </div>
      </div>
    );
  };

  /**
   * 사용자 행동 분석 결과 렌더링
   */
  const renderUserBehaviorResults = () => {
    const result = getResultForModel(LearningModelType.USER_BEHAVIOR);

    if (!result) {
      return (
        <div className={styles.noResults}>
          <p>사용자 행동 분석 결과가 없습니다.</p>
          <button
            onClick={() => runLearning([LearningModelType.USER_BEHAVIOR])}
            disabled={isLoading}
            className={styles.learningButton}
          >
            사용자 패턴 학습하기
          </button>
        </div>
      );
    }

    const { insights, recommendations, metrics } = result;

    return (
      <div className={styles.resultSection}>
        <h3>사용자 행동 분석 결과</h3>

        {/* 인사이트 표시 */}
        <div className={styles.insightsSection}>
          <h4>주요 인사이트</h4>

          {insights.map((insight, index) => {
            if (insight.type === 'topWords' && insight.data.length > 0) {
              return (
                <div key={index} className={styles.insightItem}>
                  <h5>자주 사용하는 단어</h5>
                  <div className={styles.wordCloud}>
                    {insight.data.slice(0, 10).map((word: WordData, i: number) => (
                      <div key={i} className={styles.wordItem}>
                        <span className={styles.wordRank}>{i + 1}</span>
                        <span className={styles.wordText}>{word.word}</span>
                        <span className={styles.wordCount}>{word.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            if (insight.type === 'activeHours' && insight.data.length > 0) {
              return (
                <div key={index} className={styles.insightItem}>
                  <h5>활발한 활동 시간대</h5>
                  <div className={styles.activeHoursChart}>
                    {insight.data.map((hour: HourData, i: number) => (
                      <div key={i} className={styles.hourBar}>
                        <div 
                          className={styles.hourBarFill} 
                          style={{ height: `${hour.percentage || 0}%` }}
                        />
                        <span className={styles.hourLabel}>{hour.hour}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* 메트릭 표시 */}
        <div className={styles.metricsSection}>
          <h4>사용 통계</h4>
          <div className={styles.metricsGrid}>
            {Object.entries(metrics).map(([key, value]) =>
              renderMetricItem(
                key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase()),
                value
              )
            )}
          </div>
        </div>

        {/* 추천 사항 표시 */}
        <div className={styles.recommendationsSection}>
          <h4>추천 사항</h4>
          {renderRecommendations(recommendations)}
        </div>
      </div>
    );
  };

  /**
   * 오류 분석 결과 렌더링
   */
  const renderErrorPredictionResults = () => {
    const result = getResultForModel(LearningModelType.ERROR_PREDICTION);

    if (!result) {
      return (
        <div className={styles.noResults}>
          <p>오류 분석 결과가 없습니다.</p>
          <button
            onClick={() => runLearning([LearningModelType.ERROR_PREDICTION])}
            disabled={isLoading}
            className={styles.learningButton}
          >
            오류 패턴 학습하기
          </button>
        </div>
      );
    }

    const { insights, recommendations, metrics } = result;

    return (
      <div className={styles.resultSection}>
        <h3>오류 패턴 분석 결과</h3>

        {/* 인사이트 표시 */}
        <div className={styles.insightsSection}>
          <h4>주요 인사이트</h4>

          {insights.map((insight, index) => {
            if (insight.type === 'topErrors' && insight.data.length > 0) {
              return (
                <div key={index} className={styles.insightItem}>
                  <h5>가장 빈번한 오류 유형</h5>
                  <ul className={styles.errorsList}>
                    {insight.data.map((error: any, i: number) => (
                      <li key={i} className={styles.errorItem}>
                        <span className={styles.errorType}>{error.type}</span>
                        <span className={styles.errorCount}>{error.count}회</span>
                        <div className={styles.errorBar} style={{ width: `${Math.min(100, error.count * 5)}%` }} />

                        {error.examples && error.examples.length > 0 && (
                          <div className={styles.errorExample}>
                            <span className={styles.errorExampleLabel}>예시:</span>
                            <span className={styles.errorExampleContent}>
                              {error.examples[0].message}
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }

            if (insight.type === 'errorPeakHours' && insight.data.length > 0) {
              return (
                <div key={index} className={styles.insightItem}>
                  <h5>오류 발생 빈도 높은 시간대</h5>
                  <div className={styles.errorHoursChart}>
                    {insight.data.map((hour: HourData, i: number) => (
                      <div key={i} className={styles.errorHourBar}
                        style={{
                          height: `${Math.max(20, (hour.count / 5) * 100)}px`,
                          backgroundColor: i === 0 ? '#e03131' : '#f08c00'
                        }}
                      >
                        <span className={styles.errorHourLabel}>{hour.hour}시</span>
                        <span className={styles.errorHourValue}>{hour.count}회</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* 메트릭 표시 */}
        <div className={styles.metricsSection}>
          <h4>오류 통계</h4>
          <div className={styles.metricsGrid}>
            {Object.entries(metrics).map(([key, value]) =>
              renderMetricItem(
                key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase()),
                value
              )
            )}
          </div>
        </div>

        {/* 추천 사항 표시 */}
        <div className={styles.recommendationsSection}>
          <h4>추천 사항</h4>
          {renderRecommendations(recommendations)}
        </div>
      </div>
    );
  };

  /**
   * 종합 분석 결과 렌더링
   */
  const renderOverallInsights = () => {
    if (combinedRecommendations.length === 0) {
      return (
        <div className={styles.noResults}>
          <p>종합 분석 결과가 없습니다. 먼저 다양한 유형의 학습을 실행하세요.</p>
          <button
            onClick={() => runLearning()}
            disabled={isLoading}
            className={styles.learningButton}
          >
            전체 학습 실행하기
          </button>
        </div>
      );
    }

    return (
      <div className={styles.resultSection}>
        <h3>종합 분석 결과</h3>

        <div className={styles.overallSummary}>
          <div className={styles.summaryStats}>
            <div className={styles.summaryStat}>
              <span className={styles.summaryStatLabel}>분석된 모델</span>
              <span className={styles.summaryStatValue}>{results.length}</span>
            </div>
            <div className={styles.summaryStat}>
              <span className={styles.summaryStatLabel}>총 추천사항</span>
              <span className={styles.summaryStatValue}>{combinedRecommendations.length}</span>
            </div>
            <div className={styles.summaryStat}>
              <span className={styles.summaryStatLabel}>마지막 분석</span>
              <span className={styles.summaryStatValue}>
                {lastAnalysisTime
                  ? new Date(lastAnalysisTime).toLocaleString()
                  : '없음'}
              </span>
            </div>
          </div>

          <div className={styles.recommendationsSection}>
            <h4>통합 추천 사항</h4>
            {renderRecommendations(combinedRecommendations)}
          </div>

          <div className={styles.actionButtons}>
            <button
              onClick={() => runLearning()}
              disabled={isLoading}
              className={styles.learningButton}
            >
              {isLoading ? '학습 중...' : '학습 다시 실행하기'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 선택한 탭에 따라 결과 렌더링
  const renderSelectedTabContent = () => {
    switch (selectedTab) {
      case LearningModelType.MEMORY_OPTIMIZATION:
        return renderMemoryOptimizationResults();
      case LearningModelType.USER_BEHAVIOR:
        return renderUserBehaviorResults();
      case LearningModelType.ERROR_PREDICTION:
        return renderErrorPredictionResults();
      case LearningModelType.PERFORMANCE_OPTIMIZATION:
        return renderOverallInsights();
      default:
        return <div>유효하지 않은 탭입니다.</div>;
    }
  };

  return (
    <div className={`${styles.logAnalysisPanel} ${className}`}>
      <div className={styles.header}>
        <h2>로그 분석 대시보드</h2>
        {lastAnalysisTime && (
          <p className={styles.lastAnalysisTime}>
            마지막 분석: {new Date(lastAnalysisTime).toLocaleString()}
          </p>
        )}
      </div>

      {/* 학습 컨트롤 버튼 */}
      <div className={styles.controls}>
        <button
          onClick={() => runLearning()}
          disabled={isLoading}
          className={styles.mainButton}
        >
          {isLoading ? '학습 중...' : '모든 데이터 학습하기'}
        </button>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className={styles.errorMessage}>
          <p>오류 발생: {error}</p>
        </div>
      )}

      {/* 학습 중 로딩 표시 */}
      {isLoading && (
        <div className={styles.loadingIndicator}>
          <div className={styles.spinner}></div>
          <p>로그 데이터 학습 중...</p>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tabButton} ${selectedTab === LearningModelType.MEMORY_OPTIMIZATION ? styles.activeTab : ''}`}
          onClick={() => setSelectedTab(LearningModelType.MEMORY_OPTIMIZATION)}
        >
          메모리 최적화
        </button>
        <button
          className={`${styles.tabButton} ${selectedTab === LearningModelType.USER_BEHAVIOR ? styles.activeTab : ''}`}
          onClick={() => setSelectedTab(LearningModelType.USER_BEHAVIOR)}
        >
          사용자 행동
        </button>
        <button
          className={`${styles.tabButton} ${selectedTab === LearningModelType.ERROR_PREDICTION ? styles.activeTab : ''}`}
          onClick={() => setSelectedTab(LearningModelType.ERROR_PREDICTION)}
        >
          오류 예측
        </button>
        <button
          className={`${styles.tabButton} ${selectedTab === LearningModelType.PERFORMANCE_OPTIMIZATION ? styles.activeTab : ''}`}
          onClick={() => setSelectedTab(LearningModelType.PERFORMANCE_OPTIMIZATION)}
        >
          종합 분석
        </button>
      </div>

      {/* 선택한 탭 내용 렌더링 */}
      <div className={styles.tabContent}>
        {renderSelectedTabContent()}
      </div>
    </div>
  );
}
