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
  const [settings, setSettings] = useState<SettingsState>(initialSettings || {
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
    enableMiniView: true // 미니뷰 기본값 true
  });
  const { showToast } = useToast();

  // 초기 설정 변경 시 state 업데이트
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

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

  const handleSaveSettings = () => {
    onSave(settings);
    showToast('설정이 저장되었습니다.', 'success');
  };

  return (
    <div className={`${styles.settingsContainer} ${darkMode ? styles.darkMode : ''}`}>
      <h2>설정</h2>
      
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

      <div className={styles.settingSection}>
        <h3>일반 설정</h3>
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
            <span className={styles.radioText}>자동 숨김 모드 (마우스 가까이 가면 도구모음 표시)</span>
          </label>
        </div>
      </div>

      {/* 트레이 설정 섹션 추가 */}
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