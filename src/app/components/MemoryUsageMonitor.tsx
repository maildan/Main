'use client';

import { useState, useEffect, useCallback } from 'react';
import { getMemoryInfo } from '../utils/nativeModuleClient';
import type { MemoryInfo } from '@/types';

interface MemoryUsageMonitorProps {
  interval?: number;
  showDetails?: boolean;
  onMemoryInfo?: (info: MemoryInfo) => void;
}

/**
 * 메모리 사용량 모니터링 컴포넌트
 */
export function MemoryUsageMonitor({
  interval = 30000,
  showDetails = true,
  onMemoryInfo
}: MemoryUsageMonitorProps) {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 메모리 정보 가져오기 - useCallback으로 래핑하여 의존성 처리
  const fetchMemoryInfoData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMemoryInfo();
      
      if (response.success && response.memoryInfo) {
        setMemoryInfo(response.memoryInfo);
        if (onMemoryInfo) {
          onMemoryInfo(response.memoryInfo);
        }
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch memory info');
      }
    } catch (err) {
      console.error('Memory info fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [onMemoryInfo]);
  
  // 컴포넌트 마운트 시 및 주기적으로 메모리 정보 가져오기
  useEffect(() => {
    fetchMemoryInfoData();
    
    const timerHandle = setInterval(fetchMemoryInfoData, interval);
    
    return () => {
      clearInterval(timerHandle);
    };
  }, [interval, fetchMemoryInfoData]); // fetchMemoryInfoData 추가
  
  // 메모리 정보가 없는 경우
  if (loading && !memoryInfo) {
    return <div className="memory-usage-monitor loading">Loading memory info...</div>;
  }
  
  // 메모리 정보 표시
  return (
    <div className="memory-usage-monitor">
      <div className="memory-usage-bar-container">
        <div 
          className="memory-usage-bar" 
          style={{ 
            width: memoryInfo ? `${Math.min(100, memoryInfo.percentUsed)}%` : '0%',
            backgroundColor: getStatusColor(memoryInfo?.percentUsed || 0)
          }}
        />
        <div className="memory-usage-label">
          {memoryInfo ? `${memoryInfo.percentUsed.toFixed(1)}%` : 'N/A'}
        </div>
      </div>
      
      {showDetails && memoryInfo && (
        <div className="memory-usage-details">
          <div className="memory-detail">
            <span>Heap Used:</span> 
            <span>{formatBytes(memoryInfo.heapUsed)}</span>
          </div>
          <div className="memory-detail">
            <span>Heap Total:</span> 
            <span>{formatBytes(memoryInfo.heapTotal)}</span>
          </div>
          <div className="memory-detail">
            <span>RSS:</span> 
            <span>{formatBytes(memoryInfo.rss)}</span>
          </div>
          <div className="memory-detail">
            <span>Last Update:</span>
            <span>{new Date(memoryInfo.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// 메모리 사용량에 따른 색상 결정
function getStatusColor(percentUsed: number): string {
  if (percentUsed >= 90) return '#ff4d4f';  // 심각 (빨강)
  if (percentUsed >= 75) return '#fa8c16';  // 경고 (주황)
  if (percentUsed >= 60) return '#faad14';  // 주의 (노랑)
  return '#52c41a';  // 정상 (초록)
}

// 바이트 단위 포맷팅
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
