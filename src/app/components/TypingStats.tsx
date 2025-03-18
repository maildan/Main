'use client';

import React from 'react';
import styles from './TypingStats.module.css';

interface LogType {
  id: number;
  content: string;
  key_count: number;
  typing_time: number;
  timestamp: string;
  created_at: string;
}

interface TypingStatsProps {
  logs: LogType[];
}

export function TypingStats({ logs }: TypingStatsProps) {
  // 통계 계산
  const totalKeystrokes = logs.reduce((sum, log) => sum + log.key_count, 0);
  const totalTime = logs.reduce((sum, log) => sum + log.typing_time, 0);
  const totalChars = logs.reduce((sum, log) => sum + log.content.length, 0);
  const totalCharsNoSpace = logs.reduce(
    (sum, log) => sum + (log.content.replace(/\s/g, '').length),
    0
  );
  
  // 구글 문서 방식의 총 단어 수 계산
  const totalWords = logs.reduce((sum, log) => {
    const contentWords = log.content.trim().length > 0
      ? log.content.trim().split(/\s+/).length
      : 0;
    return sum + contentWords;
  }, 0);
  
  // 속도 및 정확도 계산
  const avgSpeed = totalTime > 0 ? Math.round((totalKeystrokes / totalTime) * 60) : 0;
  const accuracy = totalChars > 0 ? Math.round((totalCharsNoSpace / totalKeystrokes) * 100) : 0;
  
  return (
    <div className={styles.statsContainer}>
      <h2>타이핑 통계</h2>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>총 타자 수</h3>
          <div className={styles.statValue}>{totalKeystrokes.toLocaleString()}</div>
        </div>
        
        <div className={styles.statCard}>
          <h3>총 글자 수</h3>
          <div className={styles.statValue}>
            {totalChars.toLocaleString()} <span>(공백 제외: {totalCharsNoSpace.toLocaleString()})</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <h3>총 단어 수</h3>
          <div className={styles.statValue}>{totalWords.toLocaleString()}</div>
        </div>
        
        <div className={styles.statCard}>
          <h3>총 시간</h3>
          <div className={styles.statValue}>{formatTime(totalTime)}</div>
        </div>
        
        <div className={styles.statCard}>
          <h3>평균 속도</h3>
          <div className={styles.statValue}>{avgSpeed} <span>타/분</span></div>
        </div>
        
        <div className={styles.statCard}>
          <h3>정확도</h3>
          <div className={styles.statValue}>{accuracy}%</div>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return `${minutes}분 ${remainingSeconds}초`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}시간 ${remainingMinutes}분 ${remainingSeconds}초`;
}