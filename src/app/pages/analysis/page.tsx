'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import LogAnalysisPanel from '../../components/LogAnalysisPanel';
import styles from './page.module.css';

/**
 * 로그 분석 페이지
 * 로그 데이터 학습 및 분석 결과를 보여줍니다.
 */
const LogAnalysisPage: React.FC = (): React.ReactNode => {
  const router = useRouter();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>로그 분석 및 인사이트</h1>
        <p>
          로그 데이터를 기반으로 메모리 최적화, 사용자 행동 패턴, 오류 예측에 대한 인사이트를 확인하세요.
        </p>
      </header>

      <main className={styles.main}>
        <LogAnalysisPanel />

        <section className={styles.helpSection}>
          <h2>분석 도움말</h2>
          <div className={styles.helpContent}>
            <h3>학습 기능 안내</h3>
            <p>
              로그 학습은 애플리케이션의 저장된 로그 데이터를 분석하여 패턴을 발견하고 최적화 방안을 제시합니다.
              각 모듈별로 다음과 같은 인사이트를 제공합니다:
            </p>

            <ul>
              <li>
                <strong>메모리 최적화</strong>: 메모리 사용 패턴을 분석하여 최적의 GC 간격, 메모리 누수 가능성이 있는 세션,
                그리고 메모리 사용량이 많은 시간대를 식별합니다.
              </li>
              <li>
                <strong>사용자 행동</strong>: 사용자의 입력 패턴, 자주 사용하는 단어, 활발한 활동 시간대 등을 분석하여
                사용자 경험 최적화 방안을 제안합니다.
              </li>
              <li>
                <strong>오류 예측</strong>: 발생한 오류의 유형과 패턴을 분석하여 자주 발생하는 오류에 대한 대응 전략을
                제시합니다.
              </li>
              <li>
                <strong>종합 분석</strong>: 모든 데이터를 종합하여 시스템 전반의 최적화 권장사항을 제공합니다.
              </li>
            </ul>

            <h3>학습 시 참고사항</h3>
            <p>
              <strong>데이터 양</strong>: 보다 정확한 분석 결과를 위해 충분한 양의 로그 데이터가 필요합니다. 일반적으로 최소 몇 일 이상의
              사용 데이터가 필요합니다.
            </p>
            <p>
              <strong>학습 주기</strong>: 시스템 변화나 새로운 패턴을 반영하기 위해 정기적으로 학습을 실행하는 것이 좋습니다.
            </p>
            <p>
              <strong>리소스 사용</strong>: 학습 과정은 서버 리소스를 일시적으로 많이 사용할 수 있으므로, 사용량이 적은 시간대에 실행하는 것을 권장합니다.
            </p>
          </div>

          <div className={styles.actions}>
            <button
              onClick={() => router.push('/dashboard')}
              className={styles.secondaryButton}
            >
              대시보드로 돌아가기
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LogAnalysisPage;
