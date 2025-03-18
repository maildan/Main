'use client';

import React from 'react';
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

export function TypingChart({ logs }: TypingChartProps) {
  // 날짜별 통계 데이터 가공
  const processDataByDate = () => {
    const dataMap = new Map();

    logs.forEach(log => {
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
  };

  const chartData = processDataByDate();

  const speedChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: '평균 타이핑 속도 (타/분)',
        data: chartData.speedData,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const keyCountChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: '총 타자 수',
        data: chartData.keyCountData,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
      },
    ],
  };

  const timeChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: '총 타이핑 시간 (분)',
        data: chartData.timeData,
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
    ],
  };

  // 구글 문서 방식 단어/글자 수 차트 추가
  const wordCharChartData = {
    labels: chartData.labels,
    datasets: [
      {
        label: '총 단어 수',
        data: chartData.wordData,
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
      },
      {
        label: '총 글자 수',
        data: chartData.charData, 
        backgroundColor: 'rgba(255, 159, 64, 0.5)',
      },
    ],
  };

  return (
    <div className={styles.chartContainer}>
      <h2>타이핑 통계 차트</h2>
      
      {logs.length > 0 ? (
        <div className={styles.charts}>
          <div className={styles.chartItem}>
            <h3>일별 평균 타이핑 속도</h3>
            <div className={styles.chartWrapper}>
              <Line 
                data={speedChartData} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: '일별 평균 속도 (타/분)' }
                  }
                }}
              />
            </div>
          </div>
          
          <div className={styles.chartItem}>
            <h3>일별 총 타자 수</h3>
            <div className={styles.chartWrapper}>
              <Bar 
                data={keyCountChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: '일별 총 타자 수' }
                  }
                }}
              />
            </div>
          </div>
          
          <div className={styles.chartItem}>
            <h3>일별 총 타이핑 시간</h3>
            <div className={styles.chartWrapper}>
              <Bar 
                data={timeChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: '일별 총 타이핑 시간 (분)' }
                  }
                }}
              />
            </div>
          </div>

          <div className={styles.chartItem}>
            <h3>일별 단어 및 글자 수</h3>
            <div className={styles.chartWrapper}>
              <Bar 
                data={wordCharChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: '일별 단어 및 글자 수' }
                  }
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className={styles.noData}>저장된 타이핑 데이터가 없습니다.</p>
      )}
    </div>
  );
}
