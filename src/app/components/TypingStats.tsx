'use client';

import React from 'react';
import styles from './TypingStats.module.css';

interface TypingStatsProps {
  data: {
    totalKeyCount?: number;
    totalTypingTime?: number;
    averageSpeed?: number;
    averageAccuracy?: number;
    totalSessions?: number;
    lastSession?: {
      timestamp: string;
      keyCount: number;
      typingTime: number;
      accuracy?: number;
    };
    recentStats?: Array<{
      date: string;
      keyCount: number;
      typingTime: number;
    }>;
  } | null;
}

const TypingStats: React.FC<TypingStatsProps> = ({ data }): React.ReactNode => {
  if (!data) {
    return (
      <div className={styles.noData}>
        <p>통계 데이터가 없습니다.</p>
        <p>새 타이핑 세션을 시작하여 통계를 수집하세요.</p>
      </div>
    );
  }

  // 시간 형식화 (초 → 시:분:초)
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours > 0 ? `${hours}시간 ` : ''}${minutes}분 ${secs}초`;
  };

  // 날짜 형식화
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={styles.container}>
      {/* 통계 요약 */}
      <div className={styles.summary}>
        <div className={styles.statItem}>
          <div className={styles.statValue}>{data.totalKeyCount?.toLocaleString() || 0}</div>
          <div className={styles.statLabel}>총 키 입력 수</div>
        </div>

        <div className={styles.statItem}>
          <div className={styles.statValue}>{formatTime(data.totalTypingTime || 0)}</div>
          <div className={styles.statLabel}>총 타이핑 시간</div>
        </div>

        <div className={styles.statItem}>
          <div className={styles.statValue}>{data.averageSpeed || 0}</div>
          <div className={styles.statLabel}>평균 KPM</div>
        </div>

        <div className={styles.statItem}>
          <div className={styles.statValue}>{data.averageAccuracy ? `${data.averageAccuracy.toFixed(2)}%` : 'N/A'}</div>
          <div className={styles.statLabel}>평균 정확도</div>
        </div>
      </div>

      {/* 최근 세션 정보 */}
      {data.lastSession && (
        <div className={styles.lastSession}>
          <h3 className={styles.sectionTitle}>최근 세션</h3>
          <div className={styles.sessionInfo}>
            <div className={styles.sessionDate}>{formatDate(data.lastSession.timestamp)}</div>
            <div className={styles.sessionStats}>
              <div className={styles.sessionStat}>
                <span className={styles.sessionStatLabel}>키 입력 수:</span>
                <span className={styles.sessionStatValue}>{data.lastSession.keyCount.toLocaleString()}</span>
              </div>
              <div className={styles.sessionStat}>
                <span className={styles.sessionStatLabel}>타이핑 시간:</span>
                <span className={styles.sessionStatValue}>{formatTime(data.lastSession.typingTime)}</span>
              </div>
              <div className={styles.sessionStat}>
                <span className={styles.sessionStatLabel}>타자 속도:</span>
                <span className={styles.sessionStatValue}>
                  {Math.round((data.lastSession.keyCount / data.lastSession.typingTime) * 60)} KPM
                </span>
              </div>
              {data.lastSession.accuracy !== undefined && (
                <div className={styles.sessionStat}>
                  <span className={styles.sessionStatLabel}>정확도:</span>
                  <span className={styles.sessionStatValue}>{data.lastSession.accuracy.toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 최근 통계 (표 형식) */}
      {data.recentStats && data.recentStats.length > 0 && (
        <div className={styles.recentStats}>
          <h3 className={styles.sectionTitle}>최근 기록</h3>
          <div className={styles.tableContainer}>
            <table className={styles.statsTable}>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>키 입력 수</th>
                  <th>타이핑 시간</th>
                  <th>KPM</th>
                </tr>
              </thead>
              <tbody>
                {data.recentStats.map((stat, index) => (
                  <tr key={index}>
                    <td>{formatDate(stat.date)}</td>
                    <td>{stat.keyCount.toLocaleString()}</td>
                    <td>{formatTime(stat.typingTime)}</td>
                    <td>{Math.round((stat.keyCount / stat.typingTime) * 60)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypingStats;