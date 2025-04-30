import React, { useEffect, useState } from 'react';
import { useInterval } from '../hooks/useInterval';

// MemoryInfo 타입 정의
interface MemoryInfo {
  heapUsed?: number;
  heapTotal?: number;
  percentUsed?: number;
  [key: string]: any;
}

interface MemoryUsageMonitorProps {
  interval?: number;
  autoRefresh?: boolean;
  onMemoryInfo?: (info: MemoryInfo) => void;
}

// 메모리 데이터를 읽기 쉬운 형식으로 변환하는 유틸리티 함수
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function MemoryUsageMonitor({
  interval = 5000,
  autoRefresh = true,
  onMemoryInfo
}: MemoryUsageMonitorProps) {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMemoryInfo = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/native/test');

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.memoryInfo) {
        setMemoryInfo(data.memoryInfo);
        if (onMemoryInfo) {
          onMemoryInfo(data.memoryInfo);
        }
      } else {
        setError(data.error || '메모리 정보 없음');
        console.error('메모리 정보 가져오기 실패:', data.error || '알 수 없는 오류');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
      console.error('메모리 정보 가져오기 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 자동 새로고침 설정
  useInterval(fetchMemoryInfo, autoRefresh ? interval : null);

  // 초기 로드
  useEffect(() => {
    fetchMemoryInfo();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // 메모리 사용량 계산 함수
  const getUsagePercent = () => {
    if (!memoryInfo || memoryInfo.percentUsed === undefined) return 0;
    return Math.min(100, Math.max(0, memoryInfo.percentUsed));
  };

  // 색상 계산
  const getUsageColor = () => {
    const percent = getUsagePercent();
    if (percent > 85) return 'text-red-500';
    if (percent > 70) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <div className="rounded-md border p-4 shadow-sm">
      <h3 className="text-lg font-medium">메모리 사용량</h3>

      {loading && <p className="text-gray-500">로딩 중...</p>}

      {error && (
        <div className="mt-2 text-red-500">
          <p>오류: {error}</p>
        </div>
      )}

      {memoryInfo && (
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <span>사용량:</span>
            <span className={getUsageColor()}>
              {getUsagePercent().toFixed(1)}%
            </span>
          </div>

          <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full ${getUsageColor().replace('text-', 'bg-')}`}
              style={{ width: `${getUsagePercent()}%` }}
            />
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">사용 중:</span>
              <span className="ml-1 font-medium">
                {formatBytes(memoryInfo.heapUsed || 0)}
              </span>
            </div>

            <div>
              <span className="text-gray-500">총 할당:</span>
              <span className="ml-1 font-medium">
                {formatBytes(memoryInfo.heapTotal || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={fetchMemoryInfo}
        disabled={loading}
        className="mt-3 rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600 disabled:bg-blue-300"
      >
        새로고침
      </button>
    </div>
  );
}
