import { useState, useMemo } from 'react';
import styles from './StatsChart.module.css';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, 
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

interface Log {
    timestamp: string;
    keyCount: number;
    typingTime: number;
    totalChars: number;
    app?: string;
    browser?: string;
    accuracy?: number;
}

interface StatsChartProps {
    logs: Log[];
}

// 색상 팔레트
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function StatsChart({ logs }: StatsChartProps) {
    const [chartType, setChartType] = useState<'daily' | 'hourly' | 'weekly' | 'monthly'>('daily');
    const [dataType, setDataType] = useState<'keyCount' | 'typingTime' | 'totalChars' | 'accuracy'>('keyCount');
    const [viewMode, setViewMode] = useState<'bar' | 'line' | 'pie'>('bar');

    // 차트 데이터 계산
    const chartData = useMemo(() => {
        if (!logs || logs.length === 0) return [];

        if (chartType === 'daily') {
            // 일별 데이터 집계
            const dailyData: Record<string, { date: string; keyCount: number; typingTime: number; totalChars: number; accuracy: number; sessions: number }> = {};
            logs.forEach(log => {
                const date = new Date(log.timestamp).toLocaleDateString();
                if (!dailyData[date]) {
                    dailyData[date] = {
                        date,
                        keyCount: 0,
                        typingTime: 0,
                        totalChars: 0,
                        accuracy: 0,
                        sessions: 0
                    };
                }
                dailyData[date].keyCount += log.keyCount || 0;
                dailyData[date].typingTime += log.typingTime || 0;
                dailyData[date].totalChars += log.totalChars || 0;
                dailyData[date].sessions += 1;
                
                // 정확도 - 가중 평균 계산
                if (log.accuracy) {
                    const prevTotal = dailyData[date].accuracy * (dailyData[date].sessions - 1);
                    dailyData[date].accuracy = (prevTotal + log.accuracy) / dailyData[date].sessions;
                }
            });
            return Object.values(dailyData);
        } else if (chartType === 'hourly') {
            // 시간별 데이터 집계
            const hourlyData: Record<string, { hour: string; keyCount: number; typingTime: number; totalChars: number; accuracy: number; sessions: number }> = {};
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
                        accuracy: 0,
                        sessions: 0
                    };
                }
                hourlyData[hourKey].keyCount += log.keyCount || 0;
                hourlyData[hourKey].typingTime += log.typingTime || 0;
                hourlyData[hourKey].totalChars += log.totalChars || 0;
                hourlyData[hourKey].sessions += 1;
                
                // 정확도 - 가중 평균 계산
                if (log.accuracy) {
                    const prevTotal = hourlyData[hourKey].accuracy * (hourlyData[hourKey].sessions - 1);
                    hourlyData[hourKey].accuracy = (prevTotal + log.accuracy) / hourlyData[hourKey].sessions;
                }
            });
            return Object.values(hourlyData);
        } else if (chartType === 'weekly') {
            // 주별 데이터 집계
            const weeklyData: Record<string, { week: string; keyCount: number; typingTime: number; totalChars: number; accuracy: number; sessions: number }> = {};
            logs.forEach(log => {
                const date = new Date(log.timestamp);
                const year = date.getFullYear();
                const weekNum = getWeekNumber(date);
                const weekKey = `${year}년 ${weekNum}주`;
                
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = {
                        week: weekKey,
                        keyCount: 0,
                        typingTime: 0,
                        totalChars: 0,
                        accuracy: 0,
                        sessions: 0
                    };
                }
                weeklyData[weekKey].keyCount += log.keyCount || 0;
                weeklyData[weekKey].typingTime += log.typingTime || 0;
                weeklyData[weekKey].totalChars += log.totalChars || 0;
                weeklyData[weekKey].sessions += 1;
                
                // 정확도 - 가중 평균 계산
                if (log.accuracy) {
                    const prevTotal = weeklyData[weekKey].accuracy * (weeklyData[weekKey].sessions - 1);
                    weeklyData[weekKey].accuracy = (prevTotal + log.accuracy) / weeklyData[weekKey].sessions;
                }
            });
            return Object.values(weeklyData);
        } else {
            // 월별 데이터 집계
            const monthlyData: Record<string, { month: string; keyCount: number; typingTime: number; totalChars: number; accuracy: number; sessions: number }> = {};
            logs.forEach(log => {
                const date = new Date(log.timestamp);
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                const monthKey = `${year}년 ${month}월`;
                
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        month: monthKey,
                        keyCount: 0,
                        typingTime: 0,
                        totalChars: 0,
                        accuracy: 0,
                        sessions: 0
                    };
                }
                monthlyData[monthKey].keyCount += log.keyCount || 0;
                monthlyData[monthKey].typingTime += log.typingTime || 0;
                monthlyData[monthKey].totalChars += log.totalChars || 0;
                monthlyData[monthKey].sessions += 1;
                
                // 정확도 - 가중 평균 계산
                if (log.accuracy) {
                    const prevTotal = monthlyData[monthKey].accuracy * (monthlyData[monthKey].sessions - 1);
                    monthlyData[monthKey].accuracy = (prevTotal + log.accuracy) / monthlyData[monthKey].sessions;
                }
            });
            return Object.values(monthlyData);
        }
    }, [logs, chartType]);
    
    // 앱별 통계 데이터
    const appStats = useMemo(() => {
        if (!logs || logs.length === 0) return [];
        
        const appData: Record<string, { name: string; keyCount: number; typingTime: number; value: number }> = {};
        logs.forEach(log => {
            const appName = log.app || log.browser || '알 수 없음';
            if (!appData[appName]) {
                appData[appName] = {
                    name: appName,
                    keyCount: 0,
                    typingTime: 0,
                    value: 0
                };
            }
            appData[appName].keyCount += log.keyCount || 0;
            appData[appName].typingTime += log.typingTime || 0;
        });
        
        // value 필드에 선택된 데이터 타입 값 할당
        Object.values(appData).forEach(app => {
            if (dataType === 'keyCount') {
                app.value = app.keyCount;
            } else if (dataType === 'typingTime') {
                app.value = app.typingTime;
            }
        });
        
        return Object.values(appData).sort((a, b) => b.value - a.value);
    }, [logs, dataType]);
    
    // 주차 계산 함수
    function getWeekNumber(date: Date): number {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }

    // 선택된 차트 유형에 따른 X축 키 가져오기
    const getXAxisKey = (): string => {
        switch(chartType) {
            case 'daily': return 'date';
            case 'hourly': return 'hour';
            case 'weekly': return 'week';
            case 'monthly': return 'month';
            default: return 'date';
        }
    };
    
    // 데이터 유형에 따른 레이블 가져오기
    const getDataTypeLabel = (): string => {
        switch(dataType) {
            case 'keyCount': return '타자수';
            case 'typingTime': return '타이핑 시간(초)';
            case 'totalChars': return '총 문자수';
            case 'accuracy': return '정확도(%)';
            default: return '값';
        }
    };
    
    // 차트 색상 가져오기
    const getChartColor = (): string => {
        switch(dataType) {
            case 'keyCount': return '#8884d8';
            case 'typingTime': return '#82ca9d';
            case 'totalChars': return '#ffc658';
            case 'accuracy': return '#ff8042';
            default: return '#8884d8';
        }
    };

    return (
        <div className={styles.statsChartContainer}>
            <h2>타이핑 통계 분석</h2>
            
            <div className={styles.chartControls}>
                <div className={styles.controlGroup}>
                    <span>기간 선택:</span>
                    <div className={styles.buttonGroup}>
                        <button 
                            className={chartType === 'hourly' ? styles.active : ''}
                            onClick={() => setChartType('hourly')}
                        >
                            시간별
                        </button>
                        <button 
                            className={chartType === 'daily' ? styles.active : ''}
                            onClick={() => setChartType('daily')}
                        >
                            일별
                        </button>
                        <button 
                            className={chartType === 'weekly' ? styles.active : ''}
                            onClick={() => setChartType('weekly')}
                        >
                            주별
                        </button>
                        <button 
                            className={chartType === 'monthly' ? styles.active : ''}
                            onClick={() => setChartType('monthly')}
                        >
                            월별
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
                        <button 
                            className={dataType === 'accuracy' ? styles.active : ''}
                            onClick={() => setDataType('accuracy')}
                        >
                            정확도
                        </button>
                    </div>
                </div>
                
                <div className={styles.controlGroup}>
                    <span>차트 유형:</span>
                    <div className={styles.buttonGroup}>
                        <button 
                            className={viewMode === 'bar' ? styles.active : ''}
                            onClick={() => setViewMode('bar')}
                        >
                            막대 차트
                        </button>
                        <button 
                            className={viewMode === 'line' ? styles.active : ''}
                            onClick={() => setViewMode('line')}
                        >
                            선 차트
                        </button>
                        <button 
                            className={viewMode === 'pie' ? styles.active : ''}
                            onClick={() => setViewMode('pie')}
                        >
                            파이 차트
                        </button>
                    </div>
                </div>
            </div>
            
            <div className={styles.chartWrapper}>
                {viewMode === 'bar' && (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey={getXAxisKey()}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar 
                                dataKey={dataType}
                                name={getDataTypeLabel()}
                                fill={getChartColor()} 
                            />
                        </BarChart>
                    </ResponsiveContainer>
                )}
                
                {viewMode === 'line' && (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey={getXAxisKey()}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey={dataType} 
                                name={getDataTypeLabel()}
                                stroke={getChartColor()} 
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
                
                {viewMode === 'pie' && (
                    <div className={styles.pieChartContainer}>
                        <h3 className={styles.pieChartTitle}>앱별 {getDataTypeLabel()} 분포</h3>
                        <ResponsiveContainer width="100%" height={400}>
                            <PieChart>
                                <Pie
                                    data={appStats}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={true}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={150}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {appStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [value, getDataTypeLabel()]} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
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
                    
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>평균 타자 속도</span>
                        <span className={styles.statValue}>
                            {calculateAvgTypingSpeed(logs)} 타/분
                        </span>
                    </div>
                    
                    <div className={styles.statCard}>
                        <span className={styles.statLabel}>최고 타자 속도</span>
                        <span className={styles.statValue}>
                            {calculateMaxTypingSpeed(logs)} 타/분
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

// 평균 타자 속도 계산
function calculateAvgTypingSpeed(logs: Log[]): number {
    if (logs.length === 0) return 0;
    
    const totalKeyCount = logs.reduce((sum, log) => sum + (log.keyCount || 0), 0);
    const totalTypingTime = logs.reduce((sum, log) => sum + (log.typingTime || 0), 0);
    
    if (totalTypingTime === 0) return 0;
    
    return Math.round((totalKeyCount / totalTypingTime) * 60);
}

// 최고 타자 속도 계산
function calculateMaxTypingSpeed(logs: Log[]): number {
    if (logs.length === 0) return 0;
    
    let maxSpeed = 0;
    
    logs.forEach(log => {
        if (log.typingTime && log.typingTime > 0) {
            const speed = Math.round((log.keyCount / log.typingTime) * 60);
            if (speed > maxSpeed) {
                maxSpeed = speed;
            }
        }
    });
    
    return maxSpeed;
}