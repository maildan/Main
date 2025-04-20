'use client';

import React, { useState, useEffect } from 'react';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Tooltip 관련 import 주석 처리
import styles from './MiniView.module.css';

// MiniViewStats 타입 임시로 any 사용
interface MiniViewStats {
  current?: any;
  system?: any;
  wpm?: number | string;
  accuracy?: number | string;
  timeElapsedFormatted?: string;
  memoryUsageFormatted?: string;
  keyCount?: number;
  typingTime?: number;
  windowTitle?: string;
}

interface MiniViewProps {
  // props 정의
}

const MiniView: React.FC<MiniViewProps> = (): React.ReactNode => {
  const [stats, setStats] = useState<MiniViewStats | null>(null); // 초기값 null
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleStatsUpdate = (_event: any, data: MiniViewStats) => {
      setStats(data);
      setError(null);
    };
    const handleStatsError = (_event: any, errorMessage: string) => {
      setError(errorMessage);
      setStats(null);
    };

    window.electronAPI?.onMiniViewStatsUpdate(handleStatsUpdate);
    window.electronAPI?.onMiniViewStatsError(handleStatsError);

    // 초기 데이터 요청 (선택적)
    window.electronAPI?.requestMiniViewStats();

    return () => {
      window.electronAPI?.removeListener('mini-view-stats-update', handleStatsUpdate);
      window.electronAPI?.removeListener('mini-view-stats-error', handleStatsError);
    };
  }, []);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    window.electronAPI?.toggleMiniViewSize(!isExpanded); // isExpanded 상태 반대로 전달
  };

  if (error) {
    return <div className={styles.miniViewContainer}>{error}</div>;
  }

  if (!stats) {
    return <div className={styles.miniViewContainer}>Loading...</div>;
  }

  const wpm = stats.current?.wpm ?? stats.wpm ?? 'N/A';
  const acc = stats.current?.accuracy ?? stats.accuracy ?? 'N/A';
  // const time = stats.current?.timeElapsedFormatted ?? stats.timeElapsedFormatted ?? 'N/A';
  // const cpuUsage = stats.system?.cpuUsage ?? 'N/A';
  // const memoryUsage = stats.system?.memoryUsageFormatted ?? 'N/A';

  return (
    // <TooltipProvider> // Tooltip 관련 주석 처리
    <div className={`${styles.miniViewContainer} ${isExpanded ? styles.expanded : ''}`}>
      {/* <Tooltip> */}
      {/* <TooltipTrigger asChild> */}
      <div className={styles.stats} onClick={toggleExpand} tabIndex={0} role="button" aria-label="Toggle mini view details">
        {/* 간단 정보 표시 */}
        <span>WPM: {wpm}</span>
        <span>ACC: {acc}%</span>
      </div>
      {/* </TooltipTrigger> */}
      {/* <TooltipContent>
            <p>Time: {time}</p>
            <p>CPU: {cpuUsage}%</p>
            <p>Mem: {memoryUsage}</p>
          </TooltipContent> */}
      {/* </Tooltip> */}

      {/* 확장 시 추가 정보 (필요시) */}
      {isExpanded && (
        <div className={styles.details}>
          <p>Key Count: {stats.keyCount ?? 'N/A'}</p>
          <p>Typing Time: {stats.typingTime ?? 'N/A'}s</p>
          <p>Window: {stats.windowTitle ?? 'N/A'}</p>
        </div>
      )}
    </div>
    // </TooltipProvider> // Tooltip 관련 주석 처리
  );
};

export default MiniView;
