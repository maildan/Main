/**
 * 로그 학습 및 최적화 유틸리티
 * 
 * 로그 데이터를 분석하여 학습하고 애플리케이션을 최적화하는 기능 제공
 */

import { LogType, searchLogs } from './log-utils';
import { logger } from './memory/logger';

/**
 * 인터페이스 정의
 */
interface WordFrequency {
  [key: string]: number;
}

interface HourlyActivity {
  [hour: number]: number;
}

interface SessionConversations {
  [sessionId: string]: number;
}

interface ErrorGroups {
  [errorType: string]: {
    count: number;
    examples: Array<{ message: string; timestamp: number }>;
    sessionIds: Set<string>;
  };
}

/**
 * 학습 모델 타입 정의
 */
export enum LearningModelType {
  MEMORY_OPTIMIZATION = 'memory_optimization',
  ERROR_PREDICTION = 'error_prediction',
  PERFORMANCE_OPTIMIZATION = 'performance_optimization',
  USER_BEHAVIOR = 'user_behavior'
}

/**
 * 학습 결과 인터페이스
 */
export interface LearningResult {
  modelType: LearningModelType;
  timestamp: number;
  insights: any[];
  recommendations: string[];
  metrics: { [key: string]: number };
}

/**
 * 메모리 최적화 학습 옵션
 */
export interface MemoryOptimizationOptions {
  timeRange?: {
    startTime?: number;
    endTime?: number;
  };
  minSampleSize?: number;
  sessionLimit?: number;
}

/**
 * 로그 데이터로부터 메모리 사용 패턴을 학습합니다.
 * 
 * @param options - 메모리 최적화 학습 옵션
 * @returns 학습 결과
 */
export async function learnMemoryUsagePatterns(
  options: MemoryOptimizationOptions = {}
): Promise<LearningResult> {
  try {
    logger.info('메모리 사용 패턴 학습 시작');
    
    // 기본값 설정
    const minSampleSize = options.minSampleSize || 50;
    const now = Date.now();
    const startTime = options.timeRange?.startTime || now - 7 * 24 * 60 * 60 * 1000; // 기본 1주일
    const endTime = options.timeRange?.endTime || now;
    
    // 메모리 관련 로그 검색
    const memoryLogs = await searchLogs({
      type: LogType.MEMORY,
      startTime,
      endTime,
      limit: 1000 // 최대 1000개까지만 가져옴
    });
    
    if (memoryLogs.length < minSampleSize) {
      logger.warn(`충분한 메모리 로그 샘플이 없습니다. 필요: ${minSampleSize}, 현재: ${memoryLogs.length}`);
    }
    
    // 메모리 사용량 분석
    const memoryUsages = memoryLogs.map(log => {
      const metadata = log.metadata || {};
      return {
        timestamp: log.timestamp,
        heapUsed: metadata.heapUsed || 0,
        heapTotal: metadata.heapTotal || 0,
        percentUsed: metadata.percentUsed || 0
      };
    });
    
    // 시간대별 메모리 사용량 집계
    const hourlyUsage: { [hour: number]: number[] } = {};
    memoryUsages.forEach(usage => {
      const date = new Date(usage.timestamp);
      const hour = date.getHours();
      
      if (!hourlyUsage[hour]) hourlyUsage[hour] = [];
      hourlyUsage[hour].push(usage.percentUsed);
    });
    
    // 평균 시간대별 사용량 계산
    const hourlyAverages = Object.entries(hourlyUsage).map(([hour, values]) => ({
      hour: parseInt(hour),
      avgUsage: values.reduce((sum, val) => sum + val, 0) / values.length,
      count: values.length
    }));
    
    // 최대 메모리 사용 시간대 식별
    hourlyAverages.sort((a, b) => b.avgUsage - a.avgUsage);
    const peakHours = hourlyAverages.slice(0, 3);
    
    // 메모리 누수 가능성이 있는 세션 식별
    const sessionData: { [sessionId: string]: number[] } = {};
    memoryLogs.forEach(log => {
      if (!log.sessionId) return;
      
      const metadata = log.metadata || {};
      if (!sessionData[log.sessionId]) sessionData[log.sessionId] = [];
      sessionData[log.sessionId].push(metadata.percentUsed || 0);
    });
    
    // 세션별로 메모리 증가 추세 분석
    const sessionTrends = Object.entries(sessionData).map(([sessionId, usages]) => {
      if (usages.length < 5) return null; // 너무 짧은 세션은 제외
      
      const firstHalf = usages.slice(0, Math.floor(usages.length / 2));
      const secondHalf = usages.slice(Math.floor(usages.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
      
      const increaseTrend = secondAvg - firstAvg;
      
      return {
        sessionId,
        samplesCount: usages.length,
        increaseTrend,
        percentIncrease: (increaseTrend / firstAvg) * 100
      };
    }).filter(Boolean);
    
    // 메모리 증가 추세가 높은 세션 정렬
    sessionTrends.sort((a, b) => (b?.increaseTrend || 0) - (a?.increaseTrend || 0));
    const problematicSessions = sessionTrends.filter(session => session && session.percentIncrease > 15);
    
    // 최적화 추천사항 생성
    const recommendations = [];
    
    if (peakHours.length > 0) {
      const formattedHours = peakHours.map(h => `${h.hour}시`).join(', ');
      recommendations.push(`메모리 사용량이 높은 시간대(${formattedHours})에 자동 메모리 최적화를 예약하세요.`);
    }
    
    if (problematicSessions.length > 0) {
      recommendations.push(`메모리 누수 가능성이 있는 ${problematicSessions.length}개의 패턴이 발견되었습니다.`);
      
      if (problematicSessions.length > 2) {
        recommendations.push('장기간 사용 시 주기적인 앱 재시작 일정을 설정하세요.');
      }
    }
    
    // 메모리 GC 최적 주기 추천
    const gcSuggestion = calculateOptimalGCInterval(memoryUsages);
    if (gcSuggestion) {
      recommendations.push(`최적의 가비지 컬렉션 주기: ${gcSuggestion}ms`);
    }
    
    // 학습 결과 반환
    const result: LearningResult = {
      modelType: LearningModelType.MEMORY_OPTIMIZATION,
      timestamp: Date.now(),
      insights: [
        { type: 'peakHours', data: peakHours },
        { type: 'problematicSessions', data: problematicSessions.slice(0, 5) },
        { type: 'hourlyUsage', data: hourlyAverages },
      ],
      recommendations,
      metrics: {
        sampleSize: memoryLogs.length,
        avgMemoryUsage: memoryUsages.reduce((sum, u) => sum + u.percentUsed, 0) / memoryUsages.length,
        peakMemoryUsage: Math.max(...memoryUsages.map(u => u.percentUsed)),
        problematicSessionsCount: problematicSessions.length
      }
    };
    
    logger.info('메모리 사용 패턴 학습 완료', { 
      sampleSize: memoryLogs.length, 
      recommendations: recommendations.length 
    });
    
    return result;
  } catch (error) {
    logger.error('메모리 사용 패턴 학습 중 오류:', error as Record<string, unknown>);
    throw error;
  }
}

/**
 * 사용자 행동 패턴 학습 옵션
 */
export interface UserBehaviorOptions {
  timeRange?: {
    startTime?: number;
    endTime?: number;
  };
  minSampleSize?: number;
}

/**
 * 로그 데이터로부터 사용자 행동 패턴을 학습합니다.
 * 
 * @param options - 사용자 행동 학습 옵션
 * @returns 학습 결과
 */
export async function learnUserBehaviorPatterns(
  options: UserBehaviorOptions = {}
): Promise<LearningResult> {
  try {
    logger.info('사용자 행동 패턴 학습 시작');
    
    // 기본값 설정
    const minSampleSize = options.minSampleSize || 20;
    const now = Date.now();
    const startTime = options.timeRange?.startTime || now - 30 * 24 * 60 * 60 * 1000; // 기본 30일
    const endTime = options.timeRange?.endTime || now;
    
    // 대화 로그 검색
    const conversationLogs = await searchLogs({
      type: LogType.CONVERSATION,
      startTime,
      endTime,
      limit: 1000 // 최대 1000개까지만 가져옴
    });
    
    if (conversationLogs.length < minSampleSize) {
      logger.warn(`충분한 대화 로그 샘플이 없습니다. 필요: ${minSampleSize}, 현재: ${conversationLogs.length}`);
    }
    
    // 대화 데이터 추출
    const conversations = conversationLogs.map(log => {
      try {
        return {
          ...log,
          parsedContent: JSON.parse(log.content)
        };
      } catch (_) {  // 사용하지 않는 변수는 _ 로만 표시
        return {
          ...log,
          parsedContent: {
            userMessage: '',
            aiResponse: '',
            timestamp: log.timestamp
          }
        };
      }
    });
    
    // 자주 사용되는 단어/구문 분석
    const wordFrequency: WordFrequency = {};
    conversations.forEach(conv => {
      const userMessage = conv.parsedContent?.userMessage || '';
      if (!userMessage) return;
      
      const words = userMessage
        .toLowerCase()
        .replace(/[^\w\s가-힣]/g, ' ')
        .split(/\s+/)
        .filter((word: string) => word.length > 1);
      
      words.forEach((word: string) => {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      });
    });
    
    // 시간대별 활동 패턴 분석
    const hourlyActivity: HourlyActivity = {};
    conversations.forEach(conv => {
      const timestamp = conv.timestamp || conv.parsedContent?.timestamp;
      if (!timestamp) return;
      
      const date = new Date(timestamp);
      const hour = date.getHours();
      
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });
    
    // 메시지 길이 분석
    const messageLengths = conversations.map(conv => {
      const userMessage = conv.parsedContent?.userMessage || '';
      return userMessage.length;
    });
    
    const avgMessageLength = messageLengths.length > 0 ? 
      messageLengths.reduce((sum, len) => sum + len, 0) / messageLengths.length : 0;
    
    // 세션별 대화 수 분석
    const sessionConversations: SessionConversations = {};
    conversations.forEach(conv => {
      if (!conv.sessionId) return;
      sessionConversations[conv.sessionId] = (sessionConversations[conv.sessionId] || 0) + 1;
    });
    
    const sessionsArray = Object.entries(sessionConversations)
      .map(([id, count]) => ({ id, count: count as number }));
    
    const avgConversationsPerSession = sessionsArray.length > 0 ?
      sessionsArray.reduce((sum, session) => {
        return sum + (session && session.count ? session.count : 0);
      }, 0) / sessionsArray.length : 0;
    
    // 활동이 가장 많은 시간대 식별: null 체크 추가
    const activeHours = Object.entries(hourlyActivity)
      .sort((a, b) => {
        if (a === null || b === null || a[1] === null || b[1] === null) return 0;
        return (b[1] as number) - (a[1] as number);
      })
      .slice(0, 3)
      .map(([hour, count]) => ({ 
        hour: parseInt(hour), 
        count: count as number 
      }));
    
    // 추천사항 생성
    const recommendations = [];
    
    if (activeHours.length > 0) {
      const formattedHours = activeHours.map(h => `${h.hour}시`).join(', ');
      recommendations.push(`사용자는 ${formattedHours}에 가장 활발하게 활동합니다. 이 시간대에 성능을 최적화하세요.`);
    }
    
    if (avgMessageLength > 100) {
      recommendations.push(`사용자는 평균 ${Math.round(avgMessageLength)}자의 긴 메시지를 보냅니다. 대용량 텍스트 처리를 최적화하세요.`);
    } else {
      recommendations.push(`사용자는 평균 ${Math.round(avgMessageLength)}자의 짧은 메시지를 보냅니다. 빠른 응답에 집중하세요.`);
    }
    
    if (avgConversationsPerSession > 10) {
      recommendations.push(`사용자는 세션당 평균 ${Math.round(avgConversationsPerSession)}개의 대화를 나눕니다. 장기 세션 메모리 관리를 최적화하세요.`);
    }
    
    if (Object.keys(wordFrequency).length > 0) {
      const topWords = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word, count]) => ({ word, count }));
      const topThreeWords = topWords.slice(0, 3).map(w => w.word).join(', ');
      recommendations.push(`가장 자주 사용된 키워드는 "${topThreeWords}"입니다. 이와 관련된 응답을 최적화하세요.`);
    }
    
    // 학습 결과 반환 코드에서 타입 단언 안전하게 처리
    const result: LearningResult = {
      modelType: LearningModelType.USER_BEHAVIOR,
      timestamp: Date.now(),
      insights: [
        { type: 'topWords', data: Object.entries(wordFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([word, count]) => ({ word, count })) },
        { type: 'activeHours', data: activeHours },
        { type: 'messageLengths', data: { average: avgMessageLength, max: Math.max(...messageLengths) } },
        { type: 'sessionsActivity', data: { 
          average: avgConversationsPerSession, 
          maxCount: Math.max(...Object.values(sessionConversations).map(v => v as number)) 
        } },
      ],
      recommendations: recommendations || [], // null 체크 추가
      metrics: {
        sampleSize: conversations.length,
        uniqueWords: Object.keys(wordFrequency).length,
        avgMessageLength,
        avgConversationsPerSession
      }
    };
    
    // 타입 안전한 로깅
    logger.info('사용자 행동 패턴 학습 완료', { 
      sampleSize: conversations.length, 
      recommendations: recommendations ? recommendations.length : 0 
    } as Record<string, unknown>);  // 타입 단언 추가
    
    return result;
  } catch (error) {
    logger.error('사용자 행동 패턴 학습 중 오류:', error as Record<string, unknown>);
    throw error;
  }
}

/**
 * 오류 예측 학습 옵션
 */
export interface ErrorPredictionOptions {
  timeRange?: {
    startTime?: number;
    endTime?: number;
  };
  minSampleSize?: number;
}

/**
 * 로그 데이터로부터 오류 패턴을 학습하여 예측 모델을 생성합니다.
 * 
 * @param options - 오류 예측 학습 옵션
 * @returns 학습 결과
 */
export async function learnErrorPatterns(
  options: ErrorPredictionOptions = {}
): Promise<LearningResult> {
  try {
    logger.info('오류 패턴 학습 시작');
    
    // 기본값 설정
    const minSampleSize = options.minSampleSize || 10;
    const now = Date.now();
    const startTime = options.timeRange?.startTime || now - 30 * 24 * 60 * 60 * 1000; // 기본 30일
    const endTime = options.timeRange?.endTime || now;
    
    // 오류 로그 검색
    const errorLogs = await searchLogs({
      type: LogType.ERROR,
      startTime,
      endTime,
      limit: 1000
    });
    
    if (errorLogs.length < minSampleSize) {
      logger.warn(`충분한 오류 로그 샘플이 없습니다. 필요: ${minSampleSize}, 현재: ${errorLogs.length}`);
    }
    
    // 오류 메시지 분류
    const errorGroups: ErrorGroups = {};
    errorLogs.forEach(log => {
      // 오류 메시지에서 핵심 부분만 추출
      const errorMessage = log.content || '';
      const errorType = getErrorType(errorMessage);
      
      if (!errorGroups[errorType]) {
        errorGroups[errorType] = {
          count: 0,
          examples: [],
          sessionIds: new Set()
        };
      }
      
      errorGroups[errorType].count++;
      
      // 최대 5개까지만 예시 저장
      if (errorGroups[errorType].examples.length < 5) {
        errorGroups[errorType].examples.push({
          message: errorMessage,
          timestamp: log.timestamp
        });
      }
      
      // 세션 ID가 있는 경우 추가
      if (log.sessionId) {
        errorGroups[errorType].sessionIds.add(log.sessionId);
      }
    });
    
    // 가장 빈번한 오류 추출
    const topErrors = Object.entries(errorGroups)
      .map(([type, data]) => ({
        type,
        count: data.count,
        examples: data.examples,
        uniqueSessions: data.sessionIds.size
      }))
      .sort((a, b) => b.count - a.count);
    
    // 시간대별 오류 발생 패턴
    const hourlyErrors: Record<number, number> = {};
    errorLogs.forEach(log => {
      const date = new Date(log.timestamp);
      const hour = date.getHours();
      
      hourlyErrors[hour] = (hourlyErrors[hour] || 0) + 1;
    });
    
    // 가장 오류가 많은 시간대
    const errorPeakHours = Object.entries(hourlyErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));
    
    // 추천사항 생성
    const recommendations = [];
    
    if (topErrors.length > 0) {
      const topError = topErrors[0];
      recommendations.push(`가장 빈번한 오류 "${topError.type}"에 대한 예외 처리를 강화하세요. (${topError.count}회 발생)`);
      
      if (topError.uniqueSessions > 3) {
        recommendations.push(`"${topError.type}" 오류가 ${topError.uniqueSessions}개의 다른 세션에서 발생했습니다. 시스템적 문제일 가능성이 있습니다.`);
      }
    }
    
    if (errorPeakHours.length > 0) {
      const formattedHours = errorPeakHours.map(h => `${h.hour}시`).join(', ');
      recommendations.push(`${formattedHours}에 오류 발생률이 높습니다. 이 시간대에 추가 모니터링을 설정하세요.`);
    }
    
    if (errorLogs.length > 50) {
      const errorRate = (errorLogs.length / ((endTime - startTime) / (24 * 60 * 60 * 1000))).toFixed(2);
      recommendations.push(`일평균 ${errorRate}개의 오류가 발생합니다. 오류 처리 로직을 검토하세요.`);
    }
    
    // 학습 결과 반환
    const result: LearningResult = {
      modelType: LearningModelType.ERROR_PREDICTION,
      timestamp: Date.now(),
      insights: [
        { type: 'topErrors', data: topErrors.slice(0, 5) },
        { type: 'errorPeakHours', data: errorPeakHours },
        { type: 'errorDistribution', data: Object.fromEntries(topErrors.slice(0, 10).map(e => [e.type, e.count])) }
      ],
      recommendations,
      metrics: {
        sampleSize: errorLogs.length,
        uniqueErrorTypes: Object.keys(errorGroups).length,
        mostFrequentErrorCount: topErrors.length > 0 ? topErrors[0].count : 0,
        errorVarietyIndex: Object.keys(errorGroups).length / errorLogs.length
      }
    };
    
    logger.info('오류 패턴 학습 완료', { 
      sampleSize: errorLogs.length, 
      errorTypes: Object.keys(errorGroups).length 
    });
    
    return result;
  } catch (error) {
    logger.error('오류 패턴 학습 중 오류:', error as Record<string, unknown>);
    throw error;
  }
}

/**
 * 여러 학습 결과를 통합하여 종합적인 최적화 추천을 생성합니다.
 * 
 * @param results - 학습 결과 배열
 * @returns 통합된 추천사항 배열
 */
export function combineRecommendations(results: LearningResult[]): string[] {
  // 모든 추천사항 수집
  const allRecommendations = results.flatMap(result => result.recommendations);
  
  // 중복 제거 (유사한 추천사항 병합)
  const uniqueRecommendations = [];
  const addedKeywords = new Set();
  
  for (const rec of allRecommendations) {
    // 문장에서 핵심 키워드 추출 (간단한 구현)
    const keywords = rec.toLowerCase().replace(/[^\w\s가-힣]/g, ' ').split(/\s+/).filter(w => w.length > 4);
    
    // 이미 유사한 키워드가 있는지 확인
    let isDuplicate = false;
    for (const keyword of keywords) {
      if (addedKeywords.has(keyword)) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueRecommendations.push(rec);
      keywords.forEach(keyword => addedKeywords.add(keyword));
    }
  }
  
  return uniqueRecommendations;
}

/**
 * 에러 메시지에서 에러 타입을 추출합니다.
 * 
 * @param errorMessage - 에러 메시지
 * @returns 추출된 에러 타입
 */
function getErrorType(errorMessage: string): string {
  // 일반적인 JavaScript 오류 패턴 확인
  if (errorMessage.includes('TypeError:')) return 'TypeError';
  if (errorMessage.includes('ReferenceError:')) return 'ReferenceError';
  if (errorMessage.includes('SyntaxError:')) return 'SyntaxError';
  if (errorMessage.includes('RangeError:')) return 'RangeError';
  if (errorMessage.includes('NetworkError:') || errorMessage.includes('네트워크')) return 'NetworkError';
  if (errorMessage.includes('API 요청 실패') || errorMessage.includes('API request failed')) return 'APIError';
  if (errorMessage.includes('Permission denied') || errorMessage.includes('권한')) return 'PermissionError';
  if (errorMessage.includes('not found') || errorMessage.includes('찾을 수 없음')) return 'NotFoundError';
  if (errorMessage.includes('메모리') || errorMessage.includes('memory')) return 'MemoryError';
  
  // 특정 키워드로 분류
  if (errorMessage.includes('undefined') || errorMessage.includes('null')) return 'NullError';
  if (errorMessage.includes('promise') || errorMessage.includes('async')) return 'AsyncError';
  if (errorMessage.includes('초과') || errorMessage.includes('limit') || errorMessage.includes('threshold')) return 'LimitExceededError';
  
  // 기본값 반환
  return 'UnknownError';
}

/**
 * 최적의 가비지 컬렉션 간격을 계산합니다.
 * 
 * @param memoryUsages - 메모리 사용량 데이터
 * @returns 최적의 GC 간격(ms) 또는 null
 */
function calculateOptimalGCInterval(memoryUsages: any[]): number | null {
  if (memoryUsages.length < 10) return null;
  
  // 메모리 사용량 증가 패턴 분석
  const _timestamps = memoryUsages.map(u => u.timestamp);  // 사용하지 않는 변수에 _ 접두사 추가
  const _memoryValues = memoryUsages.map(u => u.percentUsed);  // 사용하지 않는 변수에 _ 접두사 추가
  
  // 정렬
  const sortedData = memoryUsages
    .map((u, _i) => ({ timestamp: u.timestamp, value: u.percentUsed }))
    .sort((a, b) => a.timestamp - b.timestamp);
  
  // 증가율 계산
  const increases = [];
  for (let i = 1; i < sortedData.length; i++) {
    const timeDiff = sortedData[i].timestamp - sortedData[i-1].timestamp;
    const valueDiff = sortedData[i].value - sortedData[i-1].value;
    
    if (valueDiff > 0 && timeDiff > 0) {
      increases.push({
        rate: valueDiff / timeDiff * 1000, // ms당 증가율을 초당 증가율로 변환
        timeDiff
      });
    }
  }
  
  if (increases.length < 5) return null;
  
  // 중앙값 계산
  increases.sort((a, b) => a.rate - b.rate);
  const medianRate = increases[Math.floor(increases.length / 2)].rate;
  
  // 메모리 사용량이 5% 증가하는데 걸리는 평균 시간 (밀리초)
  const timeToIncrease5Percent = 5 / medianRate * 1000;
  
  // 적절한 GC 간격 = 메모리가 5% 증가하는 시간의 80%
  // 이 값은 경험적으로 결정된 것이며, 상황에 따라 조정 가능
  const suggestedInterval = Math.round(timeToIncrease5Percent * 0.8);
  
  // 합리적인 범위 내에 있는지 검증 (최소 10초, 최대 5분)
  const minInterval = 10 * 1000;
  const maxInterval = 5 * 60 * 1000;
  
  if (suggestedInterval < minInterval) return minInterval;
  if (suggestedInterval > maxInterval) return maxInterval;
  
  return suggestedInterval;
}
