'use client';

import React, { useState, useEffect } from 'react';
import { 
  loadMemorySettings, 
  saveMemorySettings, 
  resetMemorySettings 
} from '../settings/memory-settings';
import { MemorySettings } from '@/types'; // @/types에서 MemorySettings 타입 가져오기
import { runComprehensiveBenchmark } from '../utils/performance-metrics';
// 메모리 유틸리티 가져오기
import { configureAutoOptimization } from '../utils/memory'; // 대체 함수 사용
import { getNativeModuleStatus } from '../utils/nativeModuleClient';
import styles from './MemorySettingsPanel.module.css';

interface MemorySettingsPanelProps {
  showPerformanceData?: boolean;
  onSettingsChange?: (settings: MemorySettings) => void;
}

// 메모리 매니저 상태 인터페이스 정의
interface MemoryManagerState {
  nativeAvailable: boolean;
  inFallbackMode: boolean;
  monitoringActive: boolean;
  lastNativeCheck: number | null;
  recentFailures: Array<{
    timestamp: number;
    operation: string;
    error: string;
  }>;
  optimizationHistory: Array<{
    timestamp: number;
    level: string;
    implementation: 'native' | 'js';
    success: boolean;
    freedMemory?: number;
  }>;
}

const MemorySettingsPanel: React.FC<MemorySettingsPanelProps> = ({
  showPerformanceData = true,
  onSettingsChange
}) => {
  // 설정 상태
  const [settings, setSettings] = useState<MemorySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [managerState, setManagerState] = useState<MemoryManagerState | null>(null);
  
  // 설정 초기 로딩
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // 메모리 유틸리티 초기화
        configureAutoOptimization({ enabled: true });
        
        // 네이티브 모듈 상태 확인
        const { available } = await getNativeModuleStatus();
        setIsNativeAvailable(available);
        
        // 메모리 설정 로딩
        const loadedSettings = loadMemorySettings();
        setSettings(loadedSettings);
        
        // 메모리 매니저 상태 직접 설정 (함수를 직접 호출하는 대신)
        setManagerState({
          nativeAvailable: available,
          inFallbackMode: !available,
          monitoringActive: true,
          lastNativeCheck: Date.now(),
          recentFailures: [],
          optimizationHistory: []
        });
      } catch (error) {
        console.error('설정 초기화 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeSettings();
  }, []);
  
  // 설정 변경 핸들러
  const handleSettingChange = <K extends keyof MemorySettings>(
    key: K, 
    value: MemorySettings[K]
  ) => {
    if (!settings) return;
    
    const updatedSettings = { ...settings, [key]: value };
    setSettings(updatedSettings);
    saveMemorySettings(updatedSettings);
    
    if (onSettingsChange) {
      onSettingsChange(updatedSettings);
    }
  };
  
  // 컴포넌트 설정 변경 핸들러
  const handleComponentSettingChange = (
    componentId: string,
    key: 'optimizeOnUnmount' | 'aggressiveCleanup',
    value: boolean
  ) => {
    if (!settings) return;
    
    // componentSpecificSettings가 없는 경우를 대비해 기본값 제공
    const currentComponentSettings = settings.componentSpecificSettings || {};
    
    const updatedSettings = { 
      ...settings,
      componentSpecificSettings: {
        ...currentComponentSettings,
        [componentId]: {
          ...(currentComponentSettings[componentId] || {
            optimizeOnUnmount: false,
            aggressiveCleanup: false
          }),
          [key]: value
        }
      }
    };
    
    setSettings(updatedSettings);
    saveMemorySettings(updatedSettings);
    
    if (onSettingsChange) {
      onSettingsChange(updatedSettings);
    }
  };
  
  // 설정 초기화 핸들러
  const handleResetSettings = () => {
    resetMemorySettings();
    const defaultSettings = loadMemorySettings();
    setSettings(defaultSettings);
    
    if (onSettingsChange) {
      onSettingsChange(defaultSettings);
    }
  };
  
  // 벤치마크 실행 핸들러
  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      await runComprehensiveBenchmark();
    } finally {
      setIsBenchmarking(false);
    }
  };
  
  // 로딩 중이거나 설정이 없는 경우 로딩 표시
  if (isLoading || !settings) {
    return <div className={styles.loading}>설정 로딩 중...</div>;
  }
  
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>메모리 최적화 설정</h2>
      
      <div className={styles.tabs}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'general' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('general')}
        >
          기본 설정
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'advanced' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          고급 설정
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'components' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('components')}
        >
          컴포넌트 설정
        </button>
        {showPerformanceData && (
          <button 
            className={`${styles.tabButton} ${activeTab === 'performance' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            성능 데이터
          </button>
        )}
      </div>
      
      <div className={styles.tabContent}>
        {/* 기본 설정 탭 */}
        {activeTab === 'general' && (
          <div className={styles.settingsGroup}>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>네이티브 구현 선호</div>
                <div className={styles.settingDescription}>
                  가능한 경우 JavaScript 대신 Rust 네이티브 모듈 사용
                </div>
              </div>
              <div className={styles.settingControl}>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={settings.preferNativeImplementation}
                    onChange={(e) => handleSettingChange('preferNativeImplementation', e.target.checked)}
                    disabled={!isNativeAvailable}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>자동 폴백 활성화</div>
                <div className={styles.settingDescription}>
                  네이티브 모듈 실패 시 자동으로 JavaScript 구현으로 전환
                </div>
              </div>
              <div className={styles.settingControl}>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={settings.enableAutomaticFallback}
                    onChange={(e) => handleSettingChange('enableAutomaticFallback', e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>자동 최적화 활성화</div>
                <div className={styles.settingDescription}>
                  메모리 사용량이 임계값을 초과할 때 자동으로 최적화 수행
                </div>
              </div>
              <div className={styles.settingControl}>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={settings.enableAutomaticOptimization}
                    onChange={(e) => handleSettingChange('enableAutomaticOptimization', e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>최적화 임계값 (MB)</div>
                <div className={styles.settingDescription}>
                  이 값을 초과하면 자동 최적화가 실행됩니다
                </div>
              </div>
              <div className={styles.settingControl}>
                <input 
                  type="number"
                  className={styles.numberInput}
                  min={50}
                  max={500}
                  value={settings.optimizationThreshold}
                  onChange={(e) => handleSettingChange('optimizationThreshold', Number(e.target.value))}
                  disabled={!settings.enableAutomaticOptimization}
                />
              </div>
            </div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>최적화 체크 간격 (초)</div>
                <div className={styles.settingDescription}>
                  자동 최적화 체크 주기
                </div>
              </div>
              <div className={styles.settingControl}>
                <input 
                  type="number"
                  className={styles.numberInput}
                  min={10}
                  max={300}
                  value={(settings.optimizationInterval || 30000) / 1000}
                  onChange={(e) => handleSettingChange('optimizationInterval', Number(e.target.value) * 1000)}
                  disabled={!settings.enableAutomaticOptimization}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* 고급 설정 탭 */}
        {activeTab === 'advanced' && (
          <div className={styles.settingsGroup}>
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>적극적 GC 사용</div>
                <div className={styles.settingDescription}>
                  더 빈번하고 강력한 가비지 컬렉션 수행 (성능 영향 있음)
                </div>
              </div>
              <div className={styles.settingControl}>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={settings.aggressiveGC}
                    onChange={(e) => handleSettingChange('aggressiveGC', e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
            
            {/* 처리 모드 선택 UI 추가 */}
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>처리 모드</div>
                <div className={styles.settingDescription}>
                  계산 작업에 사용할 자원 할당 방식을 선택합니다
                </div>
              </div>
              <div className={styles.settingControl}>
                <select
                  className={styles.selectInput}
                  value={settings.processingMode || 'auto'}
                  onChange={(e) => handleSettingChange('processingMode', e.target.value as any)}
                >
                  <option value="auto">자동 감지 (권장)</option>
                  <option value="normal">일반 모드</option>
                  <option value="cpu-intensive">CPU 집약적 모드</option>
                  <option value="gpu-intensive">GPU 집약적 모드 (하드웨어 가속)</option>
                </select>
                <div className={styles.modeDescription}>
                  {settings.processingMode === 'auto' && 
                    '시스템 상태에 따라 최적의 처리 모드를 자동으로 선택합니다.'}
                  {settings.processingMode === 'normal' && 
                    '기본 처리 모드로 일반적인 워크로드에 적합합니다.'}
                  {settings.processingMode === 'cpu-intensive' && 
                    'CPU를 더 많이 사용하여 처리 속도를 향상시킵니다.'}
                  {settings.processingMode === 'gpu-intensive' && 
                    '가능한 경우 GPU를 활용하여 계산 속도를 가속화합니다.'}
                </div>
              </div>
            </div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>상세 로깅 활성화</div>
                <div className={styles.settingDescription}>
                  메모리 사용 패턴 및 최적화 작업 상세 로깅
                </div>
              </div>
              <div className={styles.settingControl}>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={settings.enableLogging}
                    onChange={(e) => handleSettingChange('enableLogging', e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>성능 측정 활성화</div>
                <div className={styles.settingDescription}>
                  네이티브 및 JavaScript 구현 간 성능 비교 측정
                </div>
              </div>
              <div className={styles.settingControl}>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={settings.enablePerformanceMetrics}
                    onChange={(e) => handleSettingChange('enablePerformanceMetrics', e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>메모리 풀 사용</div>
                <div className={styles.settingDescription}>
                  객체 재사용을 위한 메모리 풀링 활성화
                </div>
              </div>
              <div className={styles.settingControl}>
                <label className={styles.switch}>
                  <input 
                    type="checkbox" 
                    checked={settings.useMemoryPool}
                    onChange={(e) => handleSettingChange('useMemoryPool', e.target.checked)}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>폴백 재시도 간격 (분)</div>
                <div className={styles.settingDescription}>
                  네이티브 모듈 폴백 후 재시도 대기 시간
                </div>
              </div>
              <div className={styles.settingControl}>
                <input 
                  type="number"
                  className={styles.numberInput}
                  min={1}
                  max={60}
                  value={(settings.fallbackRetryDelay || 300000) / 60000}
                  onChange={(e) => handleSettingChange('fallbackRetryDelay', Number(e.target.value) * 60000)}
                  disabled={!settings.enableAutomaticFallback}
                />
              </div>
            </div>
            
            <div className={styles.settingItem}>
              <div className={styles.settingLabel}>
                <div className={styles.settingTitle}>풀 정리 간격 (분)</div>
                <div className={styles.settingDescription}>
                  메모리 풀 정리 주기
                </div>
              </div>
              <div className={styles.settingControl}>
                <input 
                  type="number"
                  className={styles.numberInput}
                  min={1}
                  max={60}
                  value={(settings.poolCleanupInterval || 600000) / 60000}
                  onChange={(e) => handleSettingChange('poolCleanupInterval', Number(e.target.value) * 60000)}
                  disabled={!settings.useMemoryPool}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* 컴포넌트 설정 탭 */}
        {activeTab === 'components' && (
          <div className={styles.settingsGroup}>
            <div className={styles.componentSettings}>
              <h3>컴포넌트별 최적화 설정</h3>
              <p className={styles.componentDescription}>
                특정 컴포넌트에 대한 메모리 최적화 동작을 설정합니다.
              </p>
              
              {settings.componentSpecificSettings && Object.keys(settings.componentSpecificSettings).length > 0 ? (
                settings.componentSpecificSettings && Object.entries(settings.componentSpecificSettings).map(([id, compSettings]) => (
                  <div key={id} className={styles.componentItem}>
                    <div className={styles.componentHeader}>
                      <h4>{id}</h4>
                    </div>
                    <div className={styles.componentControls}>
                      <div className={styles.settingItem}>
                        <div className={styles.settingLabel}>언마운트 시 최적화</div>
                        <div className={styles.settingControl}>
                          <label className={styles.switch}>
                            <input 
                              type="checkbox" 
                              checked={compSettings.optimizeOnUnmount}
                              onChange={(e) => handleComponentSettingChange(
                                id, 'optimizeOnUnmount', e.target.checked
                              )}
                            />
                            <span className={styles.slider}></span>
                          </label>
                        </div>
                      </div>
                      <div className={styles.settingItem}>
                        <div className={styles.settingLabel}>적극적 정리</div>
                        <div className={styles.settingControl}>
                          <label className={styles.switch}>
                            <input 
                              type="checkbox" 
                              checked={compSettings.aggressiveCleanup}
                              onChange={(e) => handleComponentSettingChange(
                                id, 'aggressiveCleanup', e.target.checked
                              )}
                            />
                            <span className={styles.slider}></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  컴포넌트별 설정이 없습니다. 컴포넌트 마운트 시 자동으로 추가됩니다.
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 성능 데이터 탭 */}
        {activeTab === 'performance' && showPerformanceData && (
          <div className={styles.settingsGroup}>
            <div className={styles.performanceData}>
              <h3>성능 측정 데이터</h3>
              
              <div className={styles.benchmarkControls}>
                <button 
                  className={styles.benchmarkButton}
                  onClick={handleRunBenchmark}
                  disabled={isBenchmarking}
                >
                  {isBenchmarking ? '벤치마크 실행 중...' : '종합 벤치마크 실행'}
                </button>
                <p className={styles.benchmarkDesc}>
                  네이티브 및 JavaScript 구현 간의 성능을 측정합니다.
                </p>
              </div>
              
              {/* 메모리 매니저 상태 표시 */}
              {managerState && (
                <div className={styles.managerState}>
                  <h4>메모리 매니저 상태</h4>
                  <div className={styles.stateGrid}>
                    <div className={styles.stateItem}>
                      <div className={styles.stateLabel}>네이티브 모듈 가용성</div>
                      <div className={styles.stateValue}>
                        {managerState.nativeAvailable ? '사용 가능' : '사용 불가'}
                      </div>
                    </div>
                    <div className={styles.stateItem}>
                      <div className={styles.stateLabel}>폴백 모드</div>
                      <div className={styles.stateValue}>
                        {managerState.inFallbackMode ? '활성화됨' : '비활성화됨'}
                      </div>
                    </div>
                    <div className={styles.stateItem}>
                      <div className={styles.stateLabel}>모니터링 활성화</div>
                      <div className={styles.stateValue}>
                        {managerState.monitoringActive ? '활성화됨' : '비활성화됨'}
                      </div>
                    </div>
                    <div className={styles.stateItem}>
                      <div className={styles.stateLabel}>마지막 네이티브 체크</div>
                      <div className={styles.stateValue}>
                        {managerState.lastNativeCheck ? new Date(managerState.lastNativeCheck).toLocaleTimeString() : '없음'}
                      </div>
                    </div>
                  </div>
                  
                  {/* 최근 실패 기록 */}
                  {managerState.recentFailures.length > 0 && (
                    <div className={styles.failureLog}>
                      <h4>최근 실패 기록</h4>
                      <ul className={styles.failureList}>
                        {managerState.recentFailures.map((failure: any, index: number) => (
                          <li key={index} className={styles.failureItem}>
                            <div className={styles.failureTime}>
                              {new Date(failure.timestamp).toLocaleTimeString()}
                            </div>
                            <div className={styles.failureOperation}>
                              {failure.operation}
                            </div>
                            <div className={styles.failureError}>
                              {failure.error}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* 최적화 이력 */}
                  {managerState.optimizationHistory.length > 0 && (
                    <div className={styles.optimizationHistory}>
                      <h4>최근 최적화 이력</h4>
                      <div className={styles.historyTable}>
                        <table>
                          <thead>
                            <tr>
                              <th>시간</th>
                              <th>레벨</th>
                              <th>구현</th>
                              <th>결과</th>
                              <th>해제 메모리</th>
                            </tr>
                          </thead>
                          <tbody>
                            {managerState.optimizationHistory.map((record: any, index: number) => (
                              <tr key={index}>
                                <td>{new Date(record.timestamp).toLocaleTimeString()}</td>
                                <td>{record.level}</td>
                                <td>{record.implementation === 'native' ? '네이티브' : 'JS'}</td>
                                <td>{record.success ? '성공' : '실패'}</td>
                                <td>{record.freedMemory ? `${record.freedMemory.toFixed(2)}MB` : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className={styles.actions}>
        <button 
          className={styles.resetButton}
          onClick={handleResetSettings}
        >
          기본값으로 초기화
        </button>
      </div>
      
      <div className={styles.statusBar}>
        <div className={styles.statusItem}>
          네이티브 모듈: {isNativeAvailable ? (
            <span className={styles.statusAvailable}>사용 가능</span>
          ) : (
            <span className={styles.statusUnavailable}>사용 불가</span>
          )}
        </div>
        <div className={styles.statusItem}>
          설정 변경 시 즉시 적용됩니다
        </div>
      </div>
    </div>
  );
};

export default MemorySettingsPanel;
