'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import styles from './TypingChart.module.css';

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface LogType {
  id: number;
  content: string;
  key_count: number;
  typing_time: number;
  timestamp: string;
  created_at: string;
}

interface TypingChartProps {
  logs: LogType[];
}

// 로그 데이터 필터링 함수 - 컴포넌트 외부로 이동
const filterLogsForChart = (logs: LogType[]) => {
  // 최근 30일 데이터만 표시하여 차트 렌더링 부하 감소
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return logs
    .filter(log => new Date(log.timestamp) >= thirtyDaysAgo)
    .slice(0, 100); // 최대 100개 항목으로 제한
};

export const TypingChart = React.memo(function TypingChart({ logs }: TypingChartProps) {
  // 다크 모드 상태 추적
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // 다크 모드 감지 함수 개선
  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark-mode') || 
                    document.body.classList.contains('dark-mode');
      setIsDarkMode(isDark);
    };
    
    // 초기 확인
    checkDarkMode();
    
    // 커스텀 이벤트 리스너 추가
    const handleDarkModeChange = (event: CustomEvent<{darkMode: boolean}>) => {
      setIsDarkMode(event.detail.darkMode);
    };
    
    window.addEventListener('darkmode-changed', handleDarkModeChange as EventListener);
    
    // DOM 변화 관찰
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => {
      observer.disconnect();
      window.removeEventListener('darkmode-changed', handleDarkModeChange as EventListener);
    };
  }, []);

  // 필터링된 로그 데이터 메모이제이션
  const filteredLogs = useMemo(() => filterLogsForChart(logs), [logs]);
  
  // 차트 옵션 - 다크 모드에 따라 변경되는 옵션들
  const getChartOptions = useCallback((title: string) => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: 'top' as const,
          labels: {
            color: isDarkMode ? '#E0E0E0' : '#333'
          }
        },
        title: { 
          display: true, 
          text: title,
          color: isDarkMode ? '#E0E0E0' : '#333'
        },
        tooltip: {
          backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          titleColor: isDarkMode ? '#E0E0E0' : '#333',
          bodyColor: isDarkMode ? '#B0B0B0' : '#666',
          borderColor: isDarkMode ? '#303030' : '#ddd',
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: { color: isDarkMode ? '#B0B0B0' : '#666' },
          grid: { color: isDarkMode ? 'rgba(60, 60, 60, 0.3)' : 'rgba(0, 0, 0, 0.1)' }
        },
        y: {
          ticks: { color: isDarkMode ? '#B0B0B0' : '#666' },
          grid: { color: isDarkMode ? 'rgba(60, 60, 60, 0.3)' : 'rgba(0, 0, 0, 0.1)' }
        }
      }
    };
  }, [isDarkMode]);

  // 날짜별 통계 데이터 가공 - 메모이제이션
  const chartData = useMemo(() => {
    const dataMap = new Map();

    filteredLogs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleDateString();
      
      if (!dataMap.has(date)) {
        dataMap.set(date, {
          totalKeyCount: 0,
          totalTime: 0,
          totalChars: 0,
          totalWords: 0,
        });
      }

      const data = dataMap.get(date);
      data.totalKeyCount += log.key_count;
      data.totalTime += log.typing_time;
      data.totalChars += log.content.length;
      
      // 구글 문서 방식의 단어 수 계산
      const contentWords = log.content.trim().length > 0
        ? log.content.trim().split(/\s+/).length
        : 0;
      data.totalWords += contentWords;
    });

    return {
      labels: Array.from(dataMap.keys()),
      keyCountData: Array.from(dataMap.values()).map(d => d.totalKeyCount),
      timeData: Array.from(dataMap.values()).map(d => Math.round(d.totalTime / 60)), // 분 단위로 변환
      speedData: Array.from(dataMap.values()).map(d => 
        d.totalTime > 0 ? Math.round((d.totalKeyCount / d.totalTime) * 60) : 0
      ),
      wordData: Array.from(dataMap.values()).map(d => d.totalWords),
      charData: Array.from(dataMap.values()).map(d => d.totalChars),
    };
  }, [filteredLogs]);

  // 메모이제이션된 차트 데이터
  const speedChartData = useMemo(() => ({
    labels: chartData.labels,
    datasets: [
      {
        label: '평균 타이핑 속도 (타/분)',
        data: chartData.speedData,
        borderColor: isDarkMode ? 'rgb(3, 218, 198)' : 'rgb(75, 192, 192)',
        backgroundColor: isDarkMode ? 'rgba(3, 218, 198, 0.5)' : 'rgba(75, 192, 192, 0.5)',
        tension: 0.3,
      },
    ],
  }), [chartData.labels, chartData.speedData, isDarkMode]);

  const keyCountChartData = useMemo(() => ({
    labels: chartData.labels,
    datasets: [
      {
        label: '총 타자 수',
        data: chartData.keyCountData,
        backgroundColor: isDarkMode ? 'rgba(30, 136, 229, 0.7)' : 'rgba(54, 162, 235, 0.5)',
      },
    ],
  }), [chartData.labels, chartData.keyCountData, isDarkMode]);

  const timeChartData = useMemo(() => ({
    labels: chartData.labels,
    datasets: [
      {
        label: '총 타이핑 시간 (분)',
        data: chartData.timeData,
        backgroundColor: isDarkMode ? 'rgba(207, 102, 121, 0.7)' : 'rgba(255, 99, 132, 0.5)',
      },
    ],
  }), [chartData.labels, chartData.timeData, isDarkMode]);

  // 구글 문서 방식 단어/글자 수 차트 추가
  const wordCharChartData = useMemo(() => ({
    labels: chartData.labels,
    datasets: [
      {
        label: '총 단어 수',
        data: chartData.wordData,
        backgroundColor: isDarkMode ? 'rgba(124, 77, 255, 0.7)' : 'rgba(153, 102, 255, 0.5)',
      },
      {
        label: '총 글자 수',
        data: chartData.charData, 
        backgroundColor: isDarkMode ? 'rgba(251, 140, 0, 0.7)' : 'rgba(255, 159, 64, 0.5)',
      },
    ],
  }), [chartData.labels, chartData.wordData, chartData.charData, isDarkMode]);

  return (
    <div className={styles.chartContainer}>
      <h2>타이핑 통계 차트</h2>
      
      {filteredLogs.length > 0 ? (
        <div className={styles.charts}>
          {/* 차트 렌더링에 lazy loading 적용 */}
          {chartData.labels.length > 0 && (
            <div className={styles.chartItem}>
              <h3>일별 평균 타이핑 속도</h3>
              <div className={styles.chartWrapper}>
                <Line 
                  data={speedChartData} 
                  options={getChartOptions('일별 평균 속도 (타/분)')}
                  // 더 낮은 프레임 레이트로 애니메이션 실행 (메모리 사용 감소)
                  redraw={false}  
                />
              </div>
            </div>
          )}
          
          <div className={styles.chartItem}>
            <h3>일별 총 타자 수</h3>
            <div className={styles.chartWrapper}>
              <Bar 
                data={keyCountChartData}
                options={getChartOptions('일별 총 타자 수')}
              />
            </div>
          </div>
          
          <div className={styles.chartItem}>
            <h3>일별 총 타이핑 시간</h3>
            <div className={styles.chartWrapper}>
              <Bar 
                data={timeChartData}
                options={getChartOptions('일별 총 타이핑 시간 (분)')}
              />
            </div>
          </div>

          <div className={styles.chartItem}>
            <h3>일별 단어 및 글자 수</h3>
            <div className={styles.chartWrapper}>
              <Bar 
                data={wordCharChartData}
                options={getChartOptions('일별 단어 및 글자 수')}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className={styles.noData}>저장된 타이핑 데이터가 없습니다.</p>
      )}
    </div>
  );
});
