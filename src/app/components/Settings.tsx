import { useState, useEffect } from 'react';
import styles from './Settings.module.css';
import { useToast } from './ToastContext';

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
  // 트레이 관련 설정 추가
  minimizeToTray: boolean;
  showTrayNotifications: boolean;
  reduceMemoryInBackground: boolean;
  // 미니뷰 설정 추가
  enableMiniView: boolean;
  // GPU 가속 관련 설정 추가
  useHardwareAcceleration: boolean;
  processingMode: 'auto' | 'normal' | 'cpu-intensive' | 'gpu-intensive';
  maxMemoryThreshold: number;
  // 유휴 상태 관련 설정 추가
  resumeAfterIdle: boolean;
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
    enableMiniView: true, // 미니뷰 기본값 true
    // 수정: 타입 오류 해결을 위해 옵셔널 체이닝과 nullish 병합 연산자 수정
    useHardwareAcceleration: initialSettings && 'useHardwareAcceleration' in initialSettings 
      ? initialSettings.useHardwareAcceleration 
      : false,
    processingMode: initialSettings && 'processingMode' in initialSettings 
      ? initialSettings.processingMode 
      : 'auto',
    maxMemoryThreshold: initialSettings && 'maxMemoryThreshold' in initialSettings 
      ? initialSettings.maxMemoryThreshold 
      : 100,
    // resumeAfterIdle 속성 추가
    resumeAfterIdle: initialSettings && 'resumeAfterIdle' in initialSettings
      ? initialSettings.resumeAfterIdle
      : true
  });
  const [needsRestart, setNeedsRestart] = useState(false);
  const { showToast } = useToast();

  // 초기 설정 변경 시 state 업데이트
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  // 다크 모드 처리를 위한 효과 추가
  useEffect(() => {
    // 다크 모드 클래스가 서버 렌더링과 클라이언트 간에 일치하도록 함
    if (typeof window !== 'undefined') {
      const isDarkMode = settings.darkMode;
      if (isDarkMode) {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    }
  }, [settings.darkMode]);

  // Handler functions
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

  // 트레이 관련 핸들러 추가
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

  // 미니뷰 토글 핸들러 추가
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

  // GPU 가속 설정 변경 감지 함수 추가
  const handleHardwareAccelerationToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    // 이전 값과 다른 경우에만 재시작 필요 플래그 설정
    if (newValue !== initialSettings.useHardwareAcceleration) {
      setNeedsRestart(true);
    }
    handleSettingChange('useHardwareAcceleration', newValue);
  };

  const handleSaveSettings = () => {
    onSave(settings);
    
    if (needsRestart) {
      // 재시작이 필요한 경우 특별 메시지 표시
      showToast('GPU 가속 설정이 변경되었습니다. 변경 사항을 적용하려면 앱을 재시작하세요.', 'info');
      
      // 재시작 확인 대화상자 표시
      if (window.electronAPI && window.confirm('GPU 가속 설정이 변경되었습니다. 지금 앱을 재시작하시겠습니까?')) {
        window.electronAPI.restartApp();
      }
    } else {
      showToast('설정이 저장되었습니다.', 'success');
    }
  };

  return (
    <div className={`${styles.settingsContainer} ${darkMode ? styles.darkMode : ''}`}>
      <h2>설정</h2>
      
      {/* 자동 모니터링 설정 섹션 (새로 추가) */}
      <div className={`${styles.settingSection} ${styles.highlightedSetting}`}>
        <h3>모니터링 자동 시작</h3>
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
        
        <div className={styles.settingDescription}>
          자동 모니터링 설정을 통해 앱 시작 시 또는 일정 시간 사용하지 않다가 돌아왔을 때 
          자동으로 타이핑 모니터링을 시작할 수 있습니다.
        </div>
      </div>
      
      <div className={`${styles.settingSection}`}>
        <h3>일반 설정</h3>
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
              value="fullscreen-auto-hide"
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

      {/* 시스템 트레이 설정 섹션 */}
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
        
        {/* 미니뷰 설정 추가 */}
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
          트레이로 최소화 기능을 사용하면 창을 닫아도 앱이 백그라운드에서 계속 실행되어 타이핑을 모니터링합니다.
          메모리 사용 최적화 옵션은 백그라운드 실행 시 RAM 사용량을 줄여줍니다.
        </p>
        
        <p className={styles.settingDescription}>
          미니뷰를 활성화하면 트레이 아이콘을 클릭할 때 화면 상단에 작은 통계 창이 표시됩니다.
          이를 통해 앱을 최소화한 상태에서도 중요한 타이핑 통계를 확인할 수 있습니다.
        </p>
      </div>

      {/* 성능 섹션 */}
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
              <button 
                className={styles.restartButton}
                onClick={() => {
                  if (window.electronAPI) {
                    window.electronAPI.restartApp();
                  }
                }}
              >
                지금 재시작
              </button>
            </div>
          )}
        </div>
        
        <div className={styles.toggleItem}>
          <label className={styles.selectLabel}>처리 모드:</label>
          <select 
            className={styles.selectControl}
            value={settings.processingMode || 'auto'} 
            onChange={(e) => handleSettingChange('processingMode', e.target.value)}
          >
            <option value="auto">자동 (리소스에 따라 결정)</option>
            <option value="normal">일반 모드</option>
            <option value="cpu-intensive">CPU 집약적 모드 (메모리 최적화)</option>
            <option value="gpu-intensive">GPU 가속 모드 (실험적)</option>
          </select>
        </div>
        <p className={styles.settingDescription}>
          처리 모드에 따라 타이핑 통계 계산 방식이 달라집니다. 자동 모드는 시스템 리소스에 따라
          최적의 모드를 선택합니다. CPU 집약적 모드는 메모리 사용을 줄이고, GPU 가속 모드는
          GPU를 활용하여 계산 속도를 높입니다.
        </p>
        
        <div className={styles.toggleItem}>
          <label className={styles.selectLabel}>메모리 임계치 (MB):</label>
          <input 
            type="number" 
            className={styles.numberInput}
            value={settings.maxMemoryThreshold || 100} 
            onChange={(e) => handleSettingChange('maxMemoryThreshold', parseInt(e.target.value))}
            min={50}
            max={500}
          />
        </div>
        <p className={styles.settingDescription}>
          메모리 사용량이 이 임계치를 초과하면 메모리 최적화 모드로 전환됩니다.
          값이 높을수록 더 많은 메모리를 사용하지만 성능이 향상될 수 있습니다.
        </p>
      </div>

      <div className={styles.buttonRow}>
        <button 
          className={styles.saveButton}
          onClick={handleSaveSettings}
        >
          설정 저장
        </button>
      </div>
    </div>
  );
}