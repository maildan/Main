'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LearningModelType } from '../utils/log-learning';
import { saveSystemLog } from '../utils/log-utils';

/**
 * 자동 학습 옵션 인터페이스
 */
interface AutoLearningOptions {
  enableAutoLearning: boolean;          // 자동 학습 활성화 여부
  learningIntervalHours: number;        // 학습 실행 간격 (시간)
  runOnLowActivity: boolean;            // 낮은 활동 시에만 실행 여부
  modelsToLearn: LearningModelType[];   // 학습할 모델 유형
  maxLogAgeDays: number;                // 학습에 사용할 최대 로그 기간 (일)
}

/**
 * 자동 학습 시스템 컴포넌트 Props
 */
interface SelfLearningSystemProps {
  options?: Partial<AutoLearningOptions>;
  onLearningComplete?: (results: any) => void;
  onLearningError?: (error: Error) => void;
}

/**
 * 자동 학습 시스템 컴포넌트
 * 
 * 백그라운드에서 정기적으로 로그 데이터에서 학습을 실행합니다.
 */
const SelfLearningSystem: React.FC<SelfLearningSystemProps> = ({
  options,
  onLearningComplete,
  onLearningError
}): React.ReactNode => {
  // 마지막 학습 시간을 추적하는 ref (렌더링을 트리거하지 않기 위해 ref 사용)
  const lastLearningRef = useRef<number | null>(null);
  // 학습 실행 중인지 여부
  const [isLearning, setIsLearning] = useState<boolean>(false);
  // 학습 예약 타이머 ID
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [learningStatus, setLearningStatus] = useState('idle');

  // 기본 옵션과 사용자 옵션을 병합
  const defaultOptions: AutoLearningOptions = {
    enableAutoLearning: true,
    learningIntervalHours: 24, // 기본 24시간마다
    runOnLowActivity: true,
    modelsToLearn: [
      LearningModelType.MEMORY_OPTIMIZATION,
      LearningModelType.USER_BEHAVIOR,
      LearningModelType.ERROR_PREDICTION
    ],
    maxLogAgeDays: 30
  };

  const learningOptions: AutoLearningOptions = {
    ...defaultOptions,
    ...(options || {})
  };

  /**
   * 현재 사용자 활동이 낮은지 확인
   * (예: 야간 시간, 키보드/마우스 활동 없음)
   */
  const isLowActivityPeriod = (): boolean => {
    // 현재 시간을 확인 (로컬 시간)
    const now = new Date();
    const hour = now.getHours();

    // 밤 10시 ~ 아침 7시 사이면 낮은 활동 시간으로 간주
    if (hour >= 22 || hour <= 7) {
      return true;
    }

    // 추가 활동 감지 로직은 여기에 구현
    // 예: 마지막 키보드/마우스 활동 시간, CPU 사용량 등

    return false;
  };

  /**
   * 학습 간격 시간이 지났는지 확인
   */
  const shouldRunLearning = (): boolean => {
    // 자동 학습이 비활성화되어 있으면 실행하지 않음
    if (!learningOptions.enableAutoLearning) {
      return false;
    }

    const now = Date.now();

    // 마지막 학습 시간이 없거나 간격 시간이 지났는지 확인
    if (lastLearningRef.current === null) {
      // 로컬 스토리지에서 마지막 학습 시간 불러오기
      const lastLearningTime = localStorage.getItem('lastAutoLearningTime');

      if (!lastLearningTime) {
        return true; // 마지막 학습 기록이 없으면 실행
      }

      lastLearningRef.current = Number(lastLearningTime);
    }

    // 학습 간격 시간을 밀리초로 변환
    const intervalMs = learningOptions.learningIntervalHours * 60 * 60 * 1000;

    // 마지막 학습 후 간격이 지났는지 확인
    return (now - lastLearningRef.current) >= intervalMs;
  };

  /**
   * 자동 학습 실행
   */
  const runAutoLearning = async () => {
    // 이미 학습 중이면 중복 실행 방지
    if (isLearning) {
      return;
    }

    // 낮은 활동 시에만 실행 옵션이 켜져 있고, 현재 활동이 높으면 건너뜀
    if (learningOptions.runOnLowActivity && !isLowActivityPeriod()) {
      console.log('활동이 높은 시간대라 자동 학습을 연기합니다.');
      return;
    }

    try {
      setIsLearning(true);

      await saveSystemLog('자동 학습 시작', {
        modelsToLearn: learningOptions.modelsToLearn,
        maxLogAgeDays: learningOptions.maxLogAgeDays
      });

      const startTime = Date.now() - (learningOptions.maxLogAgeDays * 24 * 60 * 60 * 1000);
      const endTime = Date.now();

      // 학습 API 호출
      const response = await fetch('/api/logs/learn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          modelTypes: learningOptions.modelsToLearn,
          options: {
            memory: { timeRange: { startTime, endTime } },
            user: { timeRange: { startTime, endTime } },
            error: { timeRange: { startTime, endTime } }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        // 마지막 학습 시간 업데이트
        lastLearningRef.current = Date.now();
        localStorage.setItem('lastAutoLearningTime', lastLearningRef.current.toString());

        // 로그 저장
        await saveSystemLog('자동 학습 완료', {
          resultsCount: result.results?.length || 0,
          timestamp: Date.now()
        });

        // 콜백 호출
        onLearningComplete?.(result);
      } else {
        throw new Error(result.error || '학습 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('자동 학습 중 오류:', error);

      // 오류 로그 저장
      await saveSystemLog('자동 학습 오류', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });

      // 오류 콜백 호출
      onLearningError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLearning(false);
    }
  };

  // 컴포넌트 마운트 시 자동 학습 체크 및 설정
  useEffect(() => {
    // 정기적으로 학습 체크 및 실행 (10분마다)
    const checkAndRunLearning = async () => {
      if (shouldRunLearning()) {
        console.log('자동 학습 조건 충족, 학습 실행');
        await runAutoLearning();
      }
    };

    // 컴포넌트 마운트 시 즉시 확인 (하지만 바로 실행은 하지 않음)
    const initialCheck = async () => {
      if (shouldRunLearning() && isLowActivityPeriod()) {
        console.log('초기 조건 확인 - 자동 학습 실행');
        await runAutoLearning();
      }
    };

    initialCheck();

    // 10분마다 체크
    timerRef.current = setInterval(checkAndRunLearning, 10 * 60 * 1000);

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [learningOptions.enableAutoLearning, learningOptions.learningIntervalHours]);

  // 이 컴포넌트는 UI를 렌더링하지 않음
  return null;
};

export default SelfLearningSystem;
