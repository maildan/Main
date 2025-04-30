import { useState, useMemo } from 'react';
import styles from './StatsChart.module.css';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface Log {
    timestamp: string;
    keyCount: number;
    typingTime: number;
    totalChars: number;
}

interface StatsChartProps {
    logs: Log[];
}

export function StatsChart({ logs }: StatsChartProps) {
    const [chartType, setChartType] = useState<'daily' | 'hourly'>('daily');
    const [dataType, setDataType] = useState<'keyCount' | 'typingTime' | 'totalChars'>('keyCount');

    const chartData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        if (chartType === 'daily') {
            // 일별 데이터 집계
            const dailyData: Record<string, { date: string; keyCount: number; typingTime: number; totalChars: number; sessions: number }> = {};
            logs.forEach(log => {
                const date = new Date(log.timestamp).toLocaleDateString();
                if (!dailyData[date]) {
                    dailyData[date] = {
                        date,
                        keyCount: 0,
                        typingTime: 0,
                        totalChars: 0,
                        sessions: 0
                    };
                }
                dailyData[date].keyCount += log.keyCount || 0;
                dailyData[date].typingTime += log.typingTime || 0;
                dailyData[date].totalChars += log.totalChars || 0;
                dailyData[date].sessions += 1;
            });
            return Object.values(dailyData);
        } else {
            // 시간별 데이터 집계
            const hourlyData: Record<string, { hour: string; keyCount: number; typingTime: number; totalChars: number; sessions: number }> = {};
            logs.forEach(log => {
                const date = new Date(log.timestamp);
                const hour = date.getHours();
                const hourKey = `${hour}시`;
                if (!hourlyData[hourKey]) {
                    hourlyData[hourKey] = {
                        hour: hourKey,
                        keyCount: 0,
                        typingTime: 0,
                        totalChars: 0,
                        sessions: 0
                    };
                }
                hourlyData[hourKey].keyCount += log.keyCount || 0;
                hourlyData[hourKey].typingTime += log.typingTime || 0;
                hourlyData[hourKey].totalChars += log.totalChars || 0;
                hourlyData[hourKey].sessions += 1;
            });
            return Object.values(hourlyData);
        }
    }, [logs, chartType]);

    return (
        <div className={styles.statsChartContainer}>
            <h2>타이핑 통계 차트</h2>
            
            <div className={styles.chartControls}>
                <div className={styles.controlGroup}>
                    <span>기간 선택:</span>
                    <div className={styles.buttonGroup}>
                        <button 
                            className={chartType === 'daily' ? styles.active : ''}
                            onClick={() => setChartType('daily')}
                        >
                            일별
                        </button>
                        <button 
                            className={chartType === 'hourly' ? styles.active : ''}
                            onClick={() => setChartType('hourly')}
                        >
                            시간별
                        </button>
                    </div>
                </div>
                
                <div className={styles.controlGroup}>
                    <span>데이터 유형:</span>
                    <div className={styles.buttonGroup}>
                        <button 
                            className={dataType === 'keyCount' ? styles.active : ''}
                            onClick={() => setDataType('keyCount')}
                        >
                            타자수
                        </button>
                        <button 
                            className={dataType === 'typingTime' ? styles.active : ''}
                            onClick={() => setDataType('typingTime')}
                        >
                            타이핑 시간
                        </button>
                        <button 
                            className={dataType === 'totalChars' ? styles.active : ''}
                            onClick={() => setDataType('totalChars')}
                        >
                            총 문자수
                        </button>
                    </div>
                </div>
            </div>
            
            <div className={styles.chartWrapper}>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            dataKey={chartType === 'daily' ? 'date' : 'hour'}
                            angle={-45}
                            textAnchor="end"
                            height={70}
                        />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar 
                            dataKey={dataType}
                            name={
                                dataType === 'keyCount' ? '타자수' : 
                                dataType === 'typingTime' ? '타이핑 시간(초)' :
                                '총 문자수'
                            }
                            fill="#8884d8" 
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className={styles.statsSummary}>
                <h3>요약 통계</h3>
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>총 타자수</span>
                        <span className={styles.statValue}>
                            {logs.reduce((sum, log) => sum + (log.keyCount || 0), 0).toLocaleString()}
                        </span>
                    </div>
                    
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>총 타이핑 시간</span>
                        <span className={styles.statValue}>
                            {formatTime(logs.reduce((sum, log) => sum + (log.typingTime || 0), 0))}
                        </span>
                    </div>
                    
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>총 문자수</span>
                        <span className={styles.statValue}>
                            {logs.reduce((sum, log) => sum + (log.totalChars || 0), 0).toLocaleString()}
                        </span>
                    </div>
                    
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>기록 수</span>
                        <span className={styles.statValue}>
                            {logs.length.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 시간 형식화 함수
function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}초`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes < 60) {
        return `${minutes}분 ${remainingSeconds}초`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    return `${hours}시간 ${remainingMinutes}분 ${remainingSeconds}초`;
}