import { useState, useEffect, useCallback } from 'react';
import styles from './Settings.module.css';
import { useToast } from './ToastContext';
import SaveConfirmDialog from './dialogs/SaveConfirmDialog';

interface EnabledCategories {
  docs: boolean;
  office: boolean;
  coding: boolean;
  sns: boolean;
}

type WindowModeType = 'windowed' | 'fullscreen' | 'fullscreen-auto-hide';

export interface SettingsState {
  enabledCategories: EnabledCategories;
  autoStartMonitoring: boolean;
  darkMode: boolean;
  windowMode: WindowModeType;
  minimizeToTray: boolean;
  showTrayNotifications: boolean;
  reduceMemoryInBackground: boolean;
  enableMiniView: boolean;
  useHardwareAcceleration: boolean;
  useTypingAnalysisGpuAcceleration: boolean;
  processingMode: 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive';
  maxMemoryThreshold: number;
  resumeAfterIdle: boolean;
  showKeyCountInHeader: boolean;
  showRealtimeWPM: boolean;
  enableSoundEffects: boolean;
  enableAnimations: boolean;
  useCompactUI: boolean;
}

interface SettingsProps {
  onSave: (settings: SettingsState) => void;
  initialSettings: SettingsState;
  darkMode: boolean;
  onDarkModeChange: (enabled: boolean) => void;
  onWindowModeChange: (mode: WindowModeType) => void;
}

export function Settings({ 
  onSave, 
  initialSettings, 
  darkMode, 
  onDarkModeChange, 
  onWindowModeChange 
}: SettingsProps) {
  const [settings, setSettings] = useState<SettingsState>({
    enabledCategories: {
      docs: true,
      office: true,
      coding: true,
      sns: true
    },
    autoStartMonitoring: true,
    darkMode: false,
    windowMode: 'windowed',
    minimizeToTray: true,
    showTrayNotifications: true,
    reduceMemoryInBackground: true,
    enableMiniView: true,
    useHardwareAcceleration: initialSettings?.useHardwareAcceleration ?? false,
    useTypingAnalysisGpuAcceleration: initialSettings?.useTypingAnalysisGpuAcceleration ?? false,
    processingMode: initialSettings?.processingMode ?? 'auto',
    maxMemoryThreshold: initialSettings?.maxMemoryThreshold ?? 100,
    resumeAfterIdle: initialSettings?.resumeAfterIdle ?? true,
    showKeyCountInHeader: initialSettings?.showKeyCountInHeader ?? true,
    showRealtimeWPM: initialSettings?.showRealtimeWPM ?? true,
    enableSoundEffects: initialSettings?.enableSoundEffects ?? false,
    enableAnimations: initialSettings?.enableAnimations ?? true,
    useCompactUI: initialSettings?.useCompactUI ?? false,
  });
  const [needsRestart, setNeedsRestart] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'advanced' | 'display'>('general');
  const [apiDebugInfo, setApiDebugInfo] = useState<string>('');
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);

  useEffect(() => {
    if (initialSettings) {
      setSettings(prevSettings => ({
        ...prevSettings,
        ...initialSettings,
        showKeyCountInHeader: initialSettings.showKeyCountInHeader ?? prevSettings.showKeyCountInHeader,
        showRealtimeWPM: initialSettings.showRealtimeWPM ?? prevSettings.showRealtimeWPM,
        enableSoundEffects: initialSettings.enableSoundEffects ?? prevSettings.enableSoundEffects,
        enableAnimations: initialSettings.enableAnimations ?? prevSettings.enableAnimations,
        useCompactUI: initialSettings.useCompactUI ?? prevSettings.useCompactUI,
      }));
    }
  }, [initialSettings]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDarkMode = settings.darkMode;
      if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    }
  }, [settings.darkMode]);

  const handleCategoryToggle = (category: keyof typeof settings.enabledCategories) => {
    setSettings(prev => ({
      ...prev,
      enabledCategories: {
        ...prev.enabledCategories,
        [category]: !prev.enabledCategories[category]
      }
    }));
  };

  const handleAutoStartToggle = () => {
    setSettings(prev => ({
      ...prev, 
      autoStartMonitoring: !prev.autoStartMonitoring
    }));
  };

  const handleDarkModeToggle = () => {
    const newDarkMode = !settings.darkMode;
    setSettings(prev => ({
      ...prev,
      darkMode: newDarkMode
    }));
    onDarkModeChange(newDarkMode);
  };

  const handleWindowModeChange = (mode: WindowModeType) => {
    setSettings(prev => ({
      ...prev,
      windowMode: mode
    }));
    onWindowModeChange(mode);
  };

  const handleMinimizeToTrayToggle = () => {
    setSettings(prev => ({
      ...prev,
      minimizeToTray: !prev.minimizeToTray
    }));
  };
  
  const handleShowTrayNotificationsToggle = () => {
    setSettings(prev => ({
      ...prev,
      showTrayNotifications: !prev.showTrayNotifications
    }));
  };
  
  const handleReduceMemoryToggle = () => {
    setSettings(prev => ({
      ...prev,
      reduceMemoryInBackground: !prev.reduceMemoryInBackground
    }));
  };

  const handleMiniViewToggle = () => {
    setSettings(prev => ({
      ...prev,
      enableMiniView: !prev.enableMiniView
    }));
  };

  const handleSettingChange = (key: keyof SettingsState, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleToggleSetting = (key: keyof SettingsState) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleHardwareAccelerationToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    if (newValue !== initialSettings?.useHardwareAcceleration) {
      setNeedsRestart(true);
    }
    setSettings(prev => ({
      ...prev,
      useHardwareAcceleration: newValue
    }));
  };

  const handleTypingAnalysisGpuToggle = () => {
    const newValue = !settings.useTypingAnalysisGpuAcceleration;
    setSettings(prev => ({
      ...prev,
      useTypingAnalysisGpuAcceleration: newValue
    }));
    console.log('타이핑 분석 GPU 가속 설정 변경:', newValue);
  };
  
  const handleSaveSettings = () => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);
    if (hasChanges) {
      console.log('저장할 설정:', settings);
      setShowSaveConfirm(true);
    } else {
      showToast('변경된 설정이 없습니다.', 'info');
    }
  };
  
  const confirmSaveSettings = () => {
    setShowSaveConfirm(false);
    onSave(settings);
    if (needsRestart) {
      showToast('GPU 가속 설정이 변경되었습니다. 변경 사항을 적용하려면 앱을 재시작하세요.', 'info');
      if (window.electronAPI) {
        if (typeof window.electronAPI.showRestartPrompt === 'function') {
          window.electronAPI.showRestartPrompt();
        } else {
          if (window.confirm('GPU 가속 설정이 변경되었습니다. 지금 앱을 재시작하시겠습니까?')) {
            if (typeof window.electronAPI.restartApp === 'function') {
              window.electronAPI.restartApp();
            } else {
              console.error('restartApp 함수를 찾을 수 없습니다.');
              showToast('앱을 수동으로 재시작해 주세요.', 'warning');
            }
          }
        }
      }
    } else {
      showToast('설정이 저장되었습니다.', 'success');
    }
  };
  
  const cancelSaveSettings = () => {
    setShowSaveConfirm(false);
  };

  const handleRestartClick = useCallback(() => {
    try {
      if (!window.electronAPI) {
        showToast('Electron API를 찾을 수 없습니다. preload 스크립트가 올바르게 로드되었는지 확인하세요.', 'error');
        return;
      }
      const apiInfo = Object.keys(window.electronAPI)
        .map(key => `${key}: ${typeof (window.electronAPI as any)[key]}`)
        .join('\n');
      console.log('사용 가능한 API 목록:', apiInfo);
      setApiDebugInfo(apiInfo);
      if (typeof window.electronAPI.restartApp === 'function') {
        window.electronAPI.restartApp();
        return;
      } 
      if (typeof window.electronAPI.showRestartPrompt === 'function') {
        window.electronAPI.showRestartPrompt();
        return;
      }
      if (window.electron && typeof window.electron.restartApp === 'function') {
        window.electron.restartApp();
        return;
      }
      showToast('재시작 기능을 사용할 수 없습니다. 앱을 수동으로 재시작하세요.', 'warning');
      setShowDebugInfo(true);
    } catch (error) {
      console.error('앱 재시작 시도 중 오류:', error);
      showToast(`재시작 중 오류: ${(error as Error).message}`, 'error');
      setApiDebugInfo(String(error));
      setShowDebugInfo(true);
    }
  }, [showToast]);

  const toggleDebugInfo = () => {
    if (window.electronAPI) {
      const apiInfo = Object.keys(window.electronAPI)
        .map(key => {
          const type = typeof (window.electronAPI as any)[key];
          return `${key}: ${type}`;
        })
        .join('\n');
      setApiDebugInfo(apiInfo);
    } else {
      setApiDebugInfo('electronAPI가 정의되지 않았습니다');
    }
    setShowDebugInfo(!showDebugInfo);
  };

  return (
    <div className={`${styles.settingsContainer} ${darkMode ? styles.darkMode : ''}`}>
      <h2>설정</h2>

      <div className={styles.settingsLayout}>
        <div className={styles.settingsTabs}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'general' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('general')}
          >
            일반
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'display' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('display')}
          >
            표시
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'advanced' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            고급
          </button>
        </div>
        
        <div className={styles.settingsContent}>
          {activeTab === 'general' && (
            <div className={styles.tabContent}>
              <div className={`${styles.settingSection} ${styles.highlightedSetting}`}>
                <h3>모니터링 자동 시작</h3>
                <div className={styles.settingGrid}>
                  <div className={styles.toggleItem}>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.autoStartMonitoring} 
                        onChange={handleAutoStartToggle}
                      />
                      <span className={styles.toggleLabel}>앱 시작 시 자동으로 모니터링 시작</span>
                    </label>
                  </div>
                  
                  <div className={styles.toggleItem}>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.resumeAfterIdle || false} 
                        onChange={(e) => handleSettingChange('resumeAfterIdle', e.target.checked)}
                      />
                      <span className={styles.toggleLabel}>일정 시간 사용하지 않다가 돌아왔을 때 자동 재시작</span>
                    </label>
                  </div>
                </div>
                
                <div className={styles.settingDescription}>
                  자동 모니터링 설정을 통해 앱 시작 시 또는 일정 시간 사용하지 않다가 돌아왔을 때 
                  자동으로 타이핑 모니터링을 시작할 수 있습니다.
                </div>
              </div>
              
              <div className={styles.settingSection}>
                <h3>일반 설정</h3>
                <div className={styles.settingGrid}>
                  <div className={styles.toggleItem}>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.darkMode} 
                        onChange={handleDarkModeToggle}
                      />
                      <span className={styles.toggleLabel}>다크 모드</span>
                    </label>
                  </div>

                  <div className={styles.toggleItem}>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.enableSoundEffects} 
                        onChange={() => handleToggleSetting('enableSoundEffects')}
                      />
                      <span className={styles.toggleLabel}>소리 효과 활성화</span>
                    </label>
                  </div>
                </div>

                <div className={styles.settingGrid}>
                  <div className={styles.toggleItem}>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.enableAnimations} 
                        onChange={() => handleToggleSetting('enableAnimations')}
                      />
                      <span className={styles.toggleLabel}>애니메이션 효과 활성화</span>
                    </label>
                  </div>

                  <div className={styles.toggleItem}>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.useCompactUI} 
                        onChange={() => handleToggleSetting('useCompactUI')}
                      />
                      <span className={styles.toggleLabel}>압축 UI 사용 (작은 버튼 및 요소)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.settingSection}>
                <h3>화면 모드</h3>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      name="windowMode" 
                      checked={settings.windowMode === 'windowed'} 
                      onChange={() => handleWindowModeChange('windowed')}
                    />
                    <span className={styles.radioText}>창 모드</span>
                  </label>
                  
                  <label className={styles.radioLabel}>
                    <input 
                      type="radio" 
                      name="windowMode" 
                      checked={settings.windowMode === 'fullscreen'} 
                      onChange={() => handleWindowModeChange('fullscreen')}
                    />
                    <span className={styles.radioText}>전체화면 모드</span>
                  </label>

                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="windowMode"
                      checked={settings.windowMode === 'fullscreen-auto-hide'}
                      onChange={() => handleWindowModeChange('fullscreen-auto-hide')}
                    />
                    <span className={styles.radioText}>자동 숨김 모드</span>
                  </label>
                </div>
                
                <p className={styles.settingDescription}>
                  자동 숨김 모드에서는 마우스를 화면 상단에 가져가면 도구모음이 자동으로 표시됩니다.
                </p>
              </div>
              
              <div className={styles.settingSection}>
                <h3>모니터링 대상 카테고리</h3>
                <div className={styles.categoryToggles}>
                  <div className={styles.toggleGrid}>
                    <div className={styles.toggleItem}>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={settings.enabledCategories.docs} 
                          onChange={() => handleCategoryToggle('docs')}
                        />
                        <span className={styles.toggleLabel}>문서 작업 (Notion, Google Docs 등)</span>
                      </label>
                    </div>

                    <div className={styles.toggleItem}>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={settings.enabledCategories.office} 
                          onChange={() => handleCategoryToggle('office')}
                        />
                        <span className={styles.toggleLabel}>오피스 웹앱 (Microsoft Office, 한컴오피스 등)</span>
                      </label>
                    </div>
                  </div>

                  <div className={styles.toggleGrid}>
                    <div className={styles.toggleItem}>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={settings.enabledCategories.coding} 
                          onChange={() => handleCategoryToggle('coding')}
                        />
                        <span className={styles.toggleLabel}>코딩 관련 (GitHub, GitLab 등)</span>
                      </label>
                    </div>

                    <div className={styles.toggleItem}>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={settings.enabledCategories.sns} 
                          onChange={() => handleCategoryToggle('sns')}
                        />
                        <span className={styles.toggleLabel}>SNS/메신저 (Discord, Slack 등)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className={styles.settingDescription}>
                  선택한 카테고리에 해당하는 애플리케이션 및 웹사이트에서의 타이핑만 모니터링합니다.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'display' && (
            <div className={styles.tabContent}>
              <div className={styles.settingSection}>
                <h3>통계 표시 설정</h3>
                <div className={styles.settingGrid}>
                  <div className={styles.toggleItem}>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.showKeyCountInHeader} 
                        onChange={() => handleToggleSetting('showKeyCountInHeader')}
                      />
                      <span className={styles.toggleLabel}>헤더에 키 카운트 표시</span>
                    </label>
                  </div>
                  
                  <div className={styles.toggleItem}>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.showRealtimeWPM} 
                        onChange={() => handleToggleSetting('showRealtimeWPM')}
                      />
                      <span className={styles.toggleLabel}>실시간 WPM(분당 단어 수) 표시</span>
                    </label>
                  </div>
                </div>

                <div className={styles.settingDescription}>
                  통계 표시 설정을 통해 앱이 표시하는 정보의 종류와 위치를 조정할 수 있습니다.
                  실시간 데이터를 표시하면 더 정확한 타이핑 분석이 가능하지만 시스템 자원을 더 사용합니다.
                </div>
              </div>

              <div className={styles.settingSection}>
                <h3>타이핑 분석 설정</h3>
                <div className={styles.toggleItem}>
                  <label>
                    <input 
                      type="checkbox" 
                      checked={settings.useTypingAnalysisGpuAcceleration} 
                      onChange={handleTypingAnalysisGpuToggle}
                    />
                    <span className={styles.toggleLabel}>타이핑 분석 GPU 가속 사용</span>
                  </label>
                  <p className={styles.settingDescription}>
                    GPU 가속을 활성화하면 타이핑 분석 계산이 더 빨라질 수 있습니다.
                    시스템에 호환되는 GPU가 있는 경우에만 작동합니다.
                  </p>
                </div>
              </div>

              <div className={styles.settingSection}>
                <h3>미니뷰 설정</h3>
                <div className={styles.toggleItem}>
                  <label>
                    <input 
                      type="checkbox" 
                      checked={settings.enableMiniView} 
                      onChange={handleMiniViewToggle}
                      disabled={!settings.minimizeToTray}
                    />
                    <span className={styles.toggleLabel}>
                      트레이 아이콘 클릭 시 미니뷰(PiP) 표시
                      {!settings.minimizeToTray && (
                        <small className={styles.disabledNote}> (트레이로 최소화 옵션이 활성화되어야 함)</small>
                      )}
                    </span>
                  </label>
                </div>
                
                <p className={styles.settingDescription}>
                  미니뷰를 활성화하면 트레이 아이콘을 클릭할 때 화면 상단에 작은 통계 창이 표시됩니다.
                  이를 통해 앱을 최소화한 상태에서도 중요한 타이핑 통계를 확인할 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className={styles.tabContent}>
              <div className={styles.settingSection}>
                <h3>시스템 트레이 설정</h3>
                <div className={styles.toggleItem}>
                  <label>
                    <input 
                      type="checkbox" 
                      checked={settings.minimizeToTray} 
                      onChange={handleMinimizeToTrayToggle}
                    />
                    <span className={styles.toggleLabel}>창 닫기 시 트레이로 최소화 (백그라운드 실행)</span>
                  </label>
                </div>
                
                <div className={styles.settingGrid}>
                  <div className={styles.toggleItem}>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.showTrayNotifications} 
                        onChange={handleShowTrayNotificationsToggle}
                        disabled={!settings.minimizeToTray}
                      />
                      <span className={styles.toggleLabel}>
                        트레이 알림 표시
                        {!settings.minimizeToTray && (
                          <small className={styles.disabledNote}> (트레이로 최소화 옵션이 활성화되어야 함)</small>
                        )}
                      </span>
                    </label>
                  </div>
                  
                  <div className={styles.toggleItem}>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={settings.reduceMemoryInBackground} 
                        onChange={handleReduceMemoryToggle}
                        disabled={!settings.minimizeToTray}
                      />
                      <span className={styles.toggleLabel}>
                        백그라운드에서 메모리 사용 최적화
                        {!settings.minimizeToTray && (
                          <small className={styles.disabledNote}> (트레이로 최소화 옵션이 활성화되어야 함)</small>
                        )}
                      </span>
                    </label>
                  </div>
                </div>
                
                <p className={styles.settingDescription}>
                  트레이로 최소화 기능을 사용하면 창을 닫아도 앱이 백그라운드에서 계속 실행되어 타이핑을 모니터링합니다.
                  메모리 사용 최적화 옵션은 백그라운드 실행 시 RAM 사용량을 줄여줍니다.
                </p>
              </div>

              <div className={styles.settingSection}>
                <h3>성능 설정</h3>
                
                <div className={styles.toggleItem}>
                  <label>
                    <input 
                      type="checkbox" 
                      checked={settings.useHardwareAcceleration} 
                      onChange={handleHardwareAccelerationToggle}
                    />
                    <span className={styles.toggleLabel}>
                      GPU 하드웨어 가속 사용 (재시작 필요)
                    </span>
                  </label>
                  <p className={styles.settingDescription}>
                    GPU 하드웨어 가속을 활성화하면 그래픽 렌더링과 일부 계산이 더 빨라질 수 있지만,
                    일부 시스템에서는 불안정할 수 있습니다. 변경 후 앱 재시작이 필요합니다.
                  </p>
                  {needsRestart && (
                    <div className={styles.restartNotice}>
                      <p>GPU 가속 설정이 변경되었습니다. 변경 사항을 적용하려면 앱을 재시작해야 합니다.</p>
                      <div className={styles.buttonGroup}>
                        <button 
                          className={styles.restartButton}
                          onClick={handleRestartClick}
                        >
                          지금 재시작
                        </button>
                        <button 
                          className={styles.debugButton}
                          onClick={toggleDebugInfo}
                        >
                          API 디버그 정보
                        </button>
                      </div>
                      
                      {showDebugInfo && (
                        <div className={styles.debugInfo}>
                          <h4>API 디버그 정보</h4>
                          <pre>{apiDebugInfo || '정보 없음'}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className={styles.settingGroup}>
                  <div className={styles.settingRow}>
                    <label className={styles.selectLabel}>처리 모드:</label>
                    <select 
                      className={styles.selectControl}
                      value={settings.processingMode} 
                      onChange={(e) => handleSettingChange('processingMode', e.target.value as any)}
                    >
                      <option value="auto">자동 (리소스에 따라 결정)</option>
                      <option value="normal">일반 모드</option>
                      <option value="cpu-intensive">CPU 집약적 모드 (메모리 최적화)</option>
                      <option value="gpu-intensive">GPU 가속 모드 (실험적)</option>
                    </select>
                  </div>
                  <p className={styles.settingDescription}>
                    처리 모드에 따라 타이핑 통계 계산 방식이 달라집니다. 자동 모드는 시스템 리소스에 따라
                    최적의 모드를 선택합니다.
                  </p>
                </div>
                
                <div className={styles.settingRow}>
                  <label className={styles.selectLabel}>메모리 임계치 (MB):</label>
                  <input 
                    type="number" 
                    className={styles.numberInput}
                    value={settings.maxMemoryThreshold} 
                    onChange={(e) => handleSettingChange('maxMemoryThreshold', parseInt(e.target.value))}
                    min={50}
                    max={500}
                  />
                </div>
                <p className={styles.settingDescription}>
                  메모리 사용량이 이 임계치를 초과하면 메모리 최적화 모드로 전환됩니다.
                  너무 낮게 설정하면 잦은 최적화로 성능이 저하될 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.buttonRow}>
        <button 
          className={styles.saveButton}
          onClick={handleSaveSettings}
        >
          설정 저장
        </button>
      </div>
      
      <SaveConfirmDialog 
        isOpen={showSaveConfirm}
        onConfirm={confirmSaveSettings}
        onCancel={cancelSaveSettings}
        isDarkMode={darkMode}
      />
    </div>
  );
}