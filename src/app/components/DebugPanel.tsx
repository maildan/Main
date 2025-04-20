import React, { memo } from 'react';
import styles from './DebugPanel.module.css';
import { TypingStatsState } from '../hooks/useTypingStats';
import { WindowModeType } from './Settings';

export interface DebugPanelProps {
  isVisible: boolean;
  stats: TypingStatsState | null;
  logsCount: number;
  isTracking: boolean;
  windowMode: WindowModeType;
}

export const DebugPanel = memo<DebugPanelProps>(function DebugPanel({
  isVisible,
  stats,
  logsCount,
  isTracking,
  windowMode
}: DebugPanelProps) {
  if (!isVisible) return null;

  return (
    <div className={styles.debugPanel}>
      <h3>디버그 정보</h3>
      <div className={styles.debugInfo}>
        <div><strong>isTracking:</strong> {isTracking ? 'true' : 'false'}</div>
        <div><strong>Logs:</strong> {logsCount}개</div>
        <div><strong>Current keyCount:</strong> {stats?.keyCount || 'N/A'}</div>
        <div><strong>Browser:</strong> {stats?.browserName || 'N/A'}</div>
        <div><strong>Window:</strong> {stats?.windowTitle || 'N/A'}</div>
        <div><strong>Window Mode:</strong> {windowMode}</div>
      </div>
    </div>
  );
});

export default DebugPanel;
