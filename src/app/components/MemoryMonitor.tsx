'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ChartOptions 
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getMemoryInfo } from '../utils/memory/memory-info';
import { requestGC } from '../utils/memory/gc-utils';
import styles from './MemoryMonitor.module.css';

// 차트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// 메모리 타임스탬프 형식화
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
};

// 차트 옵션
const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 500
  },
  scales: {
    y: {
      beginAtZero: true,
      title: {
        display: true,
        text: 'Memory (MB)'
      }
    },
    x: {
      title: {
        display: true,
        text: 'Time'
      }
    }
  },
  plugins: {
    legend: {
      position: 'top',
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.dataset.label || '';
          const value = context.parsed.y || 0;
          return `${label}: ${value.toFixed(2)} MB`;
        }
      }
    }
  }
};

interface MemoryMonitorProps {
  pollInterval?: number; // 데이터 수집 간격 (ms)
  historyLength?: number; // 기록할 데이터 포인트 수
  showControls?: boolean; // GC 버튼 등 컨트롤 표시 여부
  height?: number; // 차트 높이
  detailed?: boolean; // 상세 정보 표시 여부
  darkMode?: boolean; // 다크 모드 여부
}

/**
 * 메모리 모니터링 컴포넌트
 * 
 * 실시간으로 메모리 사용량을 그래프로 표시하고 메모리 관리 기능을 제공합니다.
 */
export default function MemoryMonitor({
  pollInterval = 5000,
  historyLength = 20,
  showControls = true,
  height = 300,
  detailed = true,
  darkMode = false
}: MemoryMonitorProps) {
  // 메모리 데이터 상태
  const [memoryData, setMemoryData] = useState<{
    labels: string[];
    used: number[];
    total: number[];
    percent: number[];
    rss?: number[];
  }>({
    labels: [],
    used: [],
    total: [],
    percent: [],
    rss: []
  });
  
  // 현재 메모리 상태
  const [currentMemory, setCurrentMemory] = useState<{
    heapUsed: number;
    heapTotal: number;
    percentUsed: number;
    rss?: number;
    timestamp: number;
  } | null>(null);
  
  // 갱신 중 상태
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // GC 실행 중 상태
  const [isPerformingGC, setIsPerformingGC] = useState(false);
  
  // 메모리 상태 (안전, 주의, 위험)
  const [memoryStatus, setMemoryStatus] = useState<'safe' | 'warning' | 'danger'>('safe');
  
  // 애니메이션을 위한 타이머 ID
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 메모리 상태 평가 함수
  const evaluateMemoryStatus = (percentUsed: number) => {
    if (percentUsed > 85) return 'danger';
    if (percentUsed > 70) return 'warning';
    return 'safe';
  };
  
  // 메모리 정보 가져오기
  const fetchMemoryInfo = async () => {
    try {
      setIsRefreshing(true);
      
      const memoryInfo = await getMemoryInfo();
      
      if (memoryInfo) {
        const timestamp = memoryInfo.timestamp || Date.now();
        const formattedTime = formatTime(timestamp);
        
        // 메모리 상태 업데이트
        setCurrentMemory({
          heapUsed: memoryInfo.heap_used_mb || memoryInfo.heapUsedMB || 0,
          heapTotal: memoryInfo.heapTotal || 0,
          percentUsed: memoryInfo.percent_used || memoryInfo.percentUsed || 0,
          rss: memoryInfo.rss_mb || memoryInfo.rssMB,
          timestamp
        });
        
        // 메모리 상태 평가
        setMemoryStatus(evaluateMemoryStatus(
          memoryInfo.percent_used || memoryInfo.percentUsed || 0
        ));
        
        // 차트 데이터 업데이트
        setMemoryData(prev => {
          // 새 데이터 포인트 추가
          const newLabels = [...prev.labels, formattedTime];
          const newUsed = [...prev.used, memoryInfo.heap_used_mb || memoryInfo.heapUsedMB || 0];
          const newTotal = [...prev.total, memoryInfo.heapTotal || 0];
          const newPercent = [...prev.percent, memoryInfo.percent_used || memoryInfo.percentUsed || 0];
          const newRSS = [...(prev.rss || []), memoryInfo.rss_mb || memoryInfo.rssMB || 0];
          
          // 데이터 개수 제한
          if (newLabels.length > historyLength) {
            newLabels.shift();
            newUsed.shift();
            newTotal.shift();
            newPercent.shift();
            if (newRSS.length > historyLength) newRSS.shift();
          }
          
          return {
            labels: newLabels,
            used: newUsed,
            total: newTotal,
            percent: newPercent,
            rss: newRSS
          };
        });
      }
    } catch (error) {
      console.error('메모리 정보 가져오기 오류:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // 가비지 컬렉션 요청
  const handleGarbageCollection = async () => {
    try {
      setIsPerformingGC(true);
      const result = await requestGC();
      
      if (result && result.success) {
        const freedMB = result.freedMB || 0;
        console.log(`가비지 컬렉션 완료: ${freedMB.toFixed(2)}MB 해제됨`);
      }
      
      // GC 후 메모리 정보 갱신
      await fetchMemoryInfo();
    } catch (error) {
      console.error('가비지 컬렉션 오류:', error);
    } finally {
      setIsPerformingGC(false);
    }
  };
  
  // 초기화 및 주기적 갱신
  useEffect(() => {
    // 초기 데이터 로드
    fetchMemoryInfo();
    
    // 주기적 갱신 설정
    timerRef.current = setInterval(() => {
      fetchMemoryInfo();
    }, pollInterval);
    
    // 정리 함수
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [pollInterval]);
  // 차트 데이터
  const chartData = {
    labels: memoryData.labels,
    datasets: [
      {
        label: 'Heap Used (MB)',
        data: memoryData.used,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      },
      ...(detailed ? [{
        label: 'RSS (MB)',
        data: memoryData.rss,
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        tension: 0.4
      }] : [])
    ]
  };
  
  return (
    <div className={`${styles.container} ${darkMode ? styles.darkMode : ''}`}>
      <h3 className={styles.title}>메모리 모니터링</h3>
      
      {/* 현재 메모리 상태 */}
      <div className={`${styles.statsContainer} ${styles[memoryStatus]}`}>
        {currentMemory ? (
          <>
            <div className={styles.stat}>
              <span className={styles.statLabel}>사용됨:</span>
              <span className={styles.statValue}>{currentMemory.heapUsed.toFixed(2)} MB</span>
            </div>
            {detailed && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>전체:</span>
                <span className={styles.statValue}>{currentMemory.heapTotal.toFixed(2)} MB</span>
              </div>
            )}
            <div className={styles.stat}>
              <span className={styles.statLabel}>사용률:</span>
              <span className={styles.statValue}>{currentMemory.percentUsed.toFixed(1)}%</span>
            </div>
            {detailed && currentMemory.rss && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>RSS:</span>
                <span className={styles.statValue}>{currentMemory.rss.toFixed(2)} MB</span>
              </div>
            )}
          </>
        ) : (
          <div className={styles.loading}>데이터 로드 중...</div>
        )}
      </div>
      
      {/* 메모리 사용량 차트 */}
      <div className={styles.chartContainer} style={{ height: `${height}px` }}>
        <Line data={chartData} options={chartOptions} />
      </div>
      
      {/* 컨트롤 버튼 */}
      {showControls && (
        <div className={styles.controls}>
          <button 
            className={styles.refreshButton} 
            onClick={fetchMemoryInfo}
            disabled={isRefreshing}
          >
            {isRefreshing ? '갱신 중...' : '수동 갱신'}
          </button>
          
          <button 
            className={styles.gcButton} 
            onClick={handleGarbageCollection}
            disabled={isPerformingGC}
          >
            {isPerformingGC ? 'GC 실행 중...' : '가비지 컬렉션 실행'}
          </button>
        </div>
      )}
      
      {/* 메모리 상태 표시 */}
      <div className={`${styles.statusIndicator} ${styles[memoryStatus]}`}>
        <div className={styles.statusLabel}>
          {memoryStatus === 'safe' && '정상'}
          {memoryStatus === 'warning' && '주의'}
          {memoryStatus === 'danger' && '위험'}
        </div>
      </div>
    </div>
  );
}
