import React, { memo } from 'react';
import styles from '../page.module.css';

interface DebugPanelProps {
  isVisible: boolean;
  stats: {
    keyCount: number;
    windowTitle: string;
    browserName: string;
  };
  logsCount: number;
  isTracking: boolean;
  windowMode: string;
}

export const DebugPanel = memo(function DebugPanel({
  isVisible,
  stats,
  logsCount,
  isTracking,
  windowMode
}: DebugPanelProps) {
  if (!isVisible) return null;
  
  return (
    <div className={styles.debugPanelBottom}>
      <h3>디버그 정보</h3>
      <div className={styles.debugInfo}>
        <div><strong>isTracking:</strong> {isTracking ? 'true' : 'false'}</div>
        <div><strong>Logs:</strong> {logsCount}개</div>
        <div><strong>Current keyCount:</strong> {stats.keyCount}</div>
        <div><strong>Browser:</strong> {stats.browserName || 'N/A'}</div>
        <div><strong>Window:</strong> {stats.windowTitle || 'N/A'}</div>
        <div><strong>Window Mode:</strong> {windowMode}</div>
      </div>
    </div>
  );
});

export default DebugPanel;
