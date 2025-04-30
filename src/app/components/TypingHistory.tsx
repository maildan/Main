'use client';

import React from 'react';
import styles from './TypingHistory.module.css';

interface LogType {
  id: number;
  content: string;
  key_count: number;
  typing_time: number;
  timestamp: string;
  created_at: string;
}

interface TypingHistoryProps {
  logs: LogType[];
  isLoading: boolean;
}

export function TypingHistory({ logs, isLoading }: TypingHistoryProps) {
  if (isLoading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  if (logs.length === 0) {
    return <div className={styles.noData}>저장된 타이핑 기록이 없습니다.</div>;
  }

  return (
    <div className={styles.historyContainer}>
      <h2>타이핑 기록</h2>
      
      <div className={styles.historyList}>
        {logs.map(log => (
          <div key={log.id} className={styles.historyItem}>
            <div className={styles.historyTime}>
              {new Date(log.timestamp).toLocaleString()}
            </div>
            <div className={styles.historyContent}>
              {log.content.length > 100 
                ? log.content.substring(0, 100) + '...' 
                : log.content}
            </div>
            <div className={styles.historyMeta}>
              <span>타자 수: {log.key_count}</span>
              <span>시간: {log.typing_time}초</span>
              <span>속도: {Math.round(log.typing_time > 0 ? (log.key_count / log.typing_time) * 60 : 0)} 타/분</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}