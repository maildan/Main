'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  // 최근 7일 데이터만 표시 (30일에서 7일로 단축)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return logs
    .filter(log => new Date(log.timestamp) >= sevenDaysAgo)
    .slice(0, 50); // 최대 50개 항목으로 제한 (100개에서 50개로 축소)
};

export const TypingChart = React.memo(function TypingChart({ logs }: TypingChartProps) {
  // 다크 모드 상태 추적
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // 차트 인스턴스 참조 저장
  const chartRefs = useRef<any[]>([]);
  
  // 컴포넌트 마운트/언마운트 감지
  const isMountedRef = useRef(true);
  
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
    
    // 컴포넌트 마운트 상태 설정
    isMountedRef.current = true;
    
    return () => {
      // 컴포넌트 언마운트 시 모든 리소스 해제
      isMountedRef.current = false;
      observer.disconnect();
      window.removeEventListener('darkmode-changed', handleDarkModeChange as EventListener);
      
      // 차트 인스턴스 정리
      chartRefs.current.forEach(chart => {
        if (chart && chart.destroy) {
          chart.destroy();
        }
      });
      
      // 메모리 정리 요청
      if (window.gc) {
        try {
          window.gc();
        } catch (e) {
          console.log('GC 호출 실패');
        }
      }
    };
  }, []);

  // 필터링된 로그 데이터 메모이제이션 (최소 데이터만 사용)
  const filteredLogs = useMemo(() => {
    try {
      // 데이터 검증 추가
      if (!Array.isArray(logs)) {
        console.warn('유효하지 않은 로그 데이터:', logs);
        return [];
      }
      return filterLogsForChart(logs);
    } catch (error) {
      console.error('로그 필터링 중 오류:', error);
      return [];
    }
  }, [logs]);

  // 차트 옵션 - 다크 모드에 따라 변경되는 옵션들
  const getChartOptions = useCallback((title: string) => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      // 메모리 사용량 감소를 위한 설정 추가
      animation: {
        duration: 0 // 애니메이션 비활성화
      },
      // 데이터 포인트 수 제한
      elements: {
        point: {
          radius: 2, // 더 작은 포인트 크기
          hoverRadius: 4,
        },
        line: {
          tension: 0, // 직선으로 연결 (곡선 없음)
        }
      },
      // 렌더링 성능 개선
      devicePixelRatio: 1,
      plugins: {
        legend: { 
          position: 'top' as const,
          labels: {
            color: isDarkMode ? '#E0E0E0' : '#333',
            // 폰트 크기 축소
            font: {
              size: 11,
            }
          }
        },
        title: { 
          display: true, 
          text: title,
          color: isDarkMode ? '#E0E0E0' : '#333',
          // 수정: 'normal'을 리터럴로 변경
          font: {
            size: 12,
            weight: 'normal' as const, // 타입 문제 해결
          }
        },
        tooltip: {
          enabled: true, // 필요한 경우에만 활성화
          backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          titleColor: isDarkMode ? '#E0E0E0' : '#333',
          bodyColor: isDarkMode ? '#B0B0B0' : '#666',
          borderColor: isDarkMode ? '#303030' : '#ddd',
          borderWidth: 1,
          // 툴팁 콜백 간소화
          callbacks: {
            label: function(context: any) {
              return context.raw;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { 
            color: isDarkMode ? '#B0B0B0' : '#666',
            // 표시할 틱 수 제한
            maxTicksLimit: 7,
            font: {
              size: 10,
            }
          },
          grid: { 
            color: isDarkMode ? 'rgba(60, 60, 60, 0.3)' : 'rgba(0, 0, 0, 0.1)',
            // 그리드 간소화
            display: false
          }
        },
        y: {
          ticks: { 
            color: isDarkMode ? '#B0B0B0' : '#666',
            font: {
              size: 10,
            }
          },
          grid: { 
            color: isDarkMode ? 'rgba(60, 60, 60, 0.3)' : 'rgba(0, 0, 0, 0.1)',
            // 그리드 선 수 제한
            tickLength: 5
          }
        }
      }
    };
  }, [isDarkMode]);

  // 날짜별 통계 데이터 가공 - 메모이제이션
  const chartData = useMemo(() => {
    try {
      // 데이터가 없으면 기본값 반환
      if (!Array.isArray(filteredLogs) || filteredLogs.length === 0) {
        return {
          labels: [],
          keyCountData: [],
          timeData: [],
          speedData: [],
          wordData: [],
          charData: []
        };
      }
      
      const dataMap = new Map();

      // 데이터 검증 추가
      for (let i = 0; i < filteredLogs.length; i++) {
        const log = filteredLogs[i];
        if (!log || typeof log !== 'object') continue;
        
        // timestamp가 없거나 유효하지 않은 경우 건너뛰기
        if (!log.timestamp || !Date.parse(log.timestamp)) continue;
        
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
        data.totalKeyCount += log.key_count || 0;
        data.totalTime += log.typing_time || 0;
        
        // 콘텐츠 길이 기반 계산 (간소화)
        const contentLength = log.content?.length || 0;
        data.totalChars += contentLength;
        data.totalWords += Math.ceil(contentLength / 5);
      }

      // 배열로 변환 (Object.entries 사용)
      const sortedDates = Array.from(dataMap.keys()).sort((a, b) => 
        new Date(a).getTime() - new Date(b).getTime()
      );
      
      return {
        // 날짜 레이블 간략화 (월/일만 표시)
        labels: sortedDates.map(date => {
          const parts = date.split('/');
          return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : date;
        }),
        keyCountData: sortedDates.map(date => dataMap.get(date).totalKeyCount),
        // 분 단위로 변환하고 정수로 반올림
        timeData: sortedDates.map(date => Math.round(dataMap.get(date).totalTime / 60)),
        // 속도 계산도 간소화
        speedData: sortedDates.map(date => {
          const d = dataMap.get(date);
          return d.totalTime > 0 ? Math.round((d.totalKeyCount / d.totalTime) * 60) : 0;
        }),
        wordData: sortedDates.map(date => dataMap.get(date).totalWords),
        charData: sortedDates.map(date => dataMap.get(date).totalChars),
      };
    } catch (error) {
      console.error('차트 데이터 생성 중 오류:', error);
      // 오류 발생 시 빈 데이터 반환
      return {
        labels: [],
        keyCountData: [],
        timeData: [],
        speedData: [],
        wordData: [],
        charData: []
      };
    }
  }, [filteredLogs]);

  // 차트 데이터 생성 함수 - 메모리 사용 최적화
  const createChartData = useCallback((
    labels: string[], 
    data: number[], 
    label: string, 
    color: string, 
    bgColor: string
  ) => {
    return {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor: color,
          backgroundColor: bgColor,
          // 불필요한 옵션 제거
          pointBackgroundColor: color,
          borderWidth: 1,
          fill: false,
        },
      ],
    };
  }, []);

  // 메모이제이션된 차트 데이터 (함수로 생성)
  const speedChartData = useMemo(() => 
    createChartData(
      chartData.labels,
      chartData.speedData,
      '평균 타이핑 속도 (타/분)',
      isDarkMode ? 'rgb(3, 218, 198)' : 'rgb(75, 192, 192)',
      isDarkMode ? 'rgba(3, 218, 198, 0.5)' : 'rgba(75, 192, 192, 0.5)'
    ),
  [chartData.labels, chartData.speedData, isDarkMode, createChartData]);

  // 더 효율적인 렌더링을 위한 지연 로딩 상태
  const [shouldRenderCharts, setShouldRenderCharts] = useState(false);

  // 지연 로딩 설정
  useEffect(() => {
    if (!shouldRenderCharts && filteredLogs.length > 0) {
      // 약간의 지연 후 차트 렌더링 시작
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          setShouldRenderCharts(true);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [filteredLogs.length, shouldRenderCharts]);

  // 차트 참조 설정 콜백
  const setChartRef = useCallback((instance: any) => {
    if (instance) {
      chartRefs.current.push(instance);
    }
  }, []);

  return (
    <div className={styles.chartContainer}>
      <h2>타이핑 통계 차트</h2>
      
      {filteredLogs.length > 0 ? (
        <div className={styles.charts}>
          {/* 차트 렌더링에 지연 로딩 및 조건부 렌더링 적용 */}
          {shouldRenderCharts && chartData.labels.length > 0 && (
            <div className={styles.chartItem}>
              <h3>일별 평균 타이핑 속도</h3>
              <div className={styles.chartWrapper}>
                <Line 
                  data={speedChartData} 
                  options={getChartOptions('일별 평균 속도 (타/분)')}
                  redraw={false}
                  ref={setChartRef}
                />
              </div>
            </div>
          )}
          
          {/* 다른 차트들은 사용자가 탭을 전환할 때만 렌더링하도록 지연 로딩 처리 */}
          {shouldRenderCharts && (
            <>
              <div className={styles.chartItem}>
                <h3>일별 총 타자 수</h3>
                <div className={styles.chartWrapper}>
                  <Bar 
                    data={{
                      labels: chartData.labels,
                      datasets: [{
                        label: '총 타자 수',
                        data: chartData.keyCountData,
                        backgroundColor: isDarkMode ? 'rgba(30, 136, 229, 0.7)' : 'rgba(54, 162, 235, 0.5)',
                      }]
                    }}
                    options={getChartOptions('일별 총 타자 수')}
                    redraw={false}
                    ref={setChartRef}
                  />
                </div>
              </div>
              
              <div className={styles.chartItem}>
                <h3>일별 총 타이핑 시간</h3>
                <div className={styles.chartWrapper}>
                  <Bar 
                    data={{
                      labels: chartData.labels,
                      datasets: [{
                        label: '총 타이핑 시간 (분)',
                        data: chartData.timeData,
                        backgroundColor: isDarkMode ? 'rgba(207, 102, 121, 0.7)' : 'rgba(255, 99, 132, 0.5)',
                      }]
                    }}
                    options={getChartOptions('일별 총 타이핑 시간 (분)')}
                    redraw={false}
                    ref={setChartRef}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <p className={styles.noData}>저장된 타이핑 데이터가 없습니다.</p>
      )}
    </div>
  );
});
