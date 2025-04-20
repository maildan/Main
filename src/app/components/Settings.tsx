import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './Settings.module.css';
import { useToast } from './ToastContext';
import { useTheme } from './ThemeProvider';
import { useColorScheme } from './ThemeProvider';
import SaveConfirmDialog from './dialogs/SaveConfirmDialog';
import { useElectronApi } from '@/app/hooks/useElectronApi';

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
  colorScheme: 'default' | 'blue' | 'green' | 'purple' | 'high-contrast';
  useSystemTheme: boolean;
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

const InfoTooltip = ({ text }: { text: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div 
      className={styles.infoIcon}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      i
      {showTooltip && (
        <div className={`${styles.tooltip} ${styles.show}`} ref={tooltipRef}>
          <div className={styles.tooltipArrow}></div>
          {text}
        </div>
      )}
    </div>
  );
};

export function Settings({ 
  onSave, 
  initialSettings, 
  darkMode,
  onDarkModeChange, 
  onWindowModeChange 
}: SettingsProps) {
  const { isDarkMode, setDarkMode } = useTheme();
  const { colorScheme, setColorScheme, isSystemTheme, setSystemTheme } = useColorScheme();
  const { electronAPI, isElectron } = useElectronApi();
  const [settings, setSettings] = useState<SettingsState>({
    enabledCategories: {
      docs: true,
      office: true,
      coding: true,
      sns: true
    },
    autoStartMonitoring: true,
    darkMode: isDarkMode,
    colorScheme: colorScheme || 'default',
    useSystemTheme: isSystemTheme || false,
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
  const [_apiDebugInfo, setApiDebugInfo] = useState<string>('');
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);

  useEffect(() => {
    if (initialSettings) {
      setSettings(prevSettings => ({
        ...prevSettings,
        ...initialSettings,
        darkMode: isDarkMode,
        showKeyCountInHeader: initialSettings.showKeyCountInHeader ?? prevSettings.showKeyCountInHeader,
        showRealtimeWPM: initialSettings.showRealtimeWPM ?? prevSettings.showRealtimeWPM,
        enableSoundEffects: initialSettings.enableSoundEffects ?? prevSettings.enableSoundEffects,
        enableAnimations: initialSettings.enableAnimations ?? prevSettings.enableAnimations,
        useCompactUI: initialSettings.useCompactUI ?? prevSettings.useCompactUI,
      }));
    }
  }, [initialSettings, isDarkMode]);

  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      darkMode: isDarkMode
    }));
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (settings.useCompactUI) {
        document.documentElement.classList.add('compact-ui');
        document.body.classList.add('compact-ui');
      } else {
        document.documentElement.classList.remove('compact-ui');
        document.body.classList.remove('compact-ui');
      }
    }
  }, [settings.useCompactUI]);

  useEffect(() => {
    if (settings.enableSoundEffects) {
      document.documentElement.classList.add('sound-effects');
    } else {
      document.documentElement.classList.remove('sound-effects');
    }
    
    if (settings.enableAnimations) {
      document.documentElement.classList.add('enable-animations');
    } else {
      document.documentElement.classList.remove('enable-animations');
    }
  }, [settings.enableSoundEffects, settings.enableAnimations]);

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
    const newValue = !settings.darkMode;
    setSettings(prev => ({
      ...prev,
      darkMode: newValue
    }));
    
    if (onDarkModeChange) {
      onDarkModeChange(newValue);
    }
    
    setDarkMode(newValue);
  };

  const handleWindowModeChange = (mode: WindowModeType) => {
    setSettings(prev => ({
      ...prev,
      windowMode: mode
    }));
    
    // Electron API를 사용하여 창 모드 변경
    if (electronAPI && electronAPI.setWindowMode) {
      try {
        electronAPI.setWindowMode(mode)
          .catch((error: any) => {
            console.error('창 모드 변경 중 오류:', error);
            showToast('창 모드 변경 중 오류가 발생했습니다.', 'error');
          });
      } catch (error) {
        console.error('창 모드 변경 함수 호출 중 오류:', error);
        showToast('창 모드 변경 기능을 사용할 수 없습니다.', 'error');
      }
    }
    
    if (onWindowModeChange) {
    onWindowModeChange(mode);
    }
  };

  const _handleMinimizeToTrayToggle = () => {
    setSettings(prev => ({
      ...prev,
      minimizeToTray: !prev.minimizeToTray
    }));
  };
  
  const _handleShowTrayNotificationsToggle = () => {
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
    setSettings(prev => {
      const newValue = !prev[key];
      
      if (key === 'useCompactUI') {
        if (newValue) {
          document.documentElement.classList.add('compact-ui');
          document.body.classList.add('compact-ui');
        } else {
          document.documentElement.classList.remove('compact-ui');
          document.body.classList.remove('compact-ui');
        }
      }
      
      if (key === 'enableSoundEffects') {
        if (newValue) {
          document.documentElement.classList.add('sound-effects');
        } else {
          document.documentElement.classList.remove('sound-effects');
        }
      }
      
      if (key === 'enableAnimations') {
        if (newValue) {
          document.documentElement.classList.add('enable-animations');
        } else {
          document.documentElement.classList.remove('enable-animations');
        }
      }
      
      return {
        ...prev,
        [key]: newValue
      };
    });
  };

  const handleHardwareAccelerationToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
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
    
    if (electronAPI && typeof electronAPI.saveSettings === 'function') {
      try {
        console.log('IPC: saveSettings 호출', settings);
        electronAPI.saveSettings(settings);
      } catch (error) {
        console.error('설정 저장 IPC 호출 오류:', error);
        showToast('설정 저장 중 오류가 발생했습니다.', 'error');
      }
    } else {
      console.warn('electronAPI.saveSettings 함수를 사용할 수 없습니다.');
      if (onSave) {
        onSave(settings);
        showToast('설정이 임시 저장되었습니다 (Electron API 없음).', 'info');
      } else {
        showToast('설정 저장 기능을 사용할 수 없습니다.', 'error');
      }
    }
  };
  
  const cancelSaveSettings = () => {
    setShowSaveConfirm(false);
  };

  const handleRestartClick = useCallback(() => {
    try {
      if (!electronAPI) {
        showToast('Electron API를 찾을 수 없습니다. preload 스크립트가 올바르게 로드되었는지 확인하세요.', 'error');
        return;
      }
      const apiInfo = Object.keys(electronAPI)
        .map(key => `${key}: ${typeof (electronAPI as any)[key]}`)
        .join('\n');
      console.log('사용 가능한 API 목록:', apiInfo);
      setApiDebugInfo(apiInfo);
      if (typeof electronAPI.restartApp === 'function') {
        electronAPI.restartApp();
        return;
      } 
      if (typeof electronAPI.showRestartPrompt === 'function') {
        electronAPI.showRestartPrompt();
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
  }, [electronAPI, showToast]);

  const _toggleDebugInfo = () => {
    setShowDebugInfo(prev => !prev);
    
    // 디버그 정보를 가져오는 로직
    if (!showDebugInfo && electronAPI && electronAPI.getSystemInfo) {
      electronAPI.getSystemInfo().then((info: string) => {
        setApiDebugInfo(info);
      }).catch((error: any) => {
        console.error('시스템 정보 가져오기 실패:', error);
        setApiDebugInfo('시스템 정보를 가져올 수 없습니다');
      });
    }
  };

  // 여기에 컬러 스키마 변경 핸들러 추가
  const handleColorSchemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newScheme = event.target.value as 'default' | 'blue' | 'green' | 'purple' | 'high-contrast';
    setSettings(prev => ({
      ...prev,
      colorScheme: newScheme
    }));
    setColorScheme(newScheme);
  };

  // 시스템 테마 사용 토글 핸들러 추가
  const handleSystemThemeToggle = () => {
    const newValue = !settings.useSystemTheme;
    setSettings(prev => ({
      ...prev,
      useSystemTheme: newValue
    }));
    setSystemTheme(newValue);
  };

  // 설정 저장 결과 처리 (IPC 응답 수신)
  useEffect(() => {
    if (!isElectron) return;

    const handleSettingsSaved = (_event: any, result: { success: boolean; settings: SettingsState; restartRequired?: boolean; error?: string }) => {
      console.log('IPC 응답: settings-saved', result);
      if (result.success) {
        // 저장 성공 시 needsRestart 상태 업데이트
        setNeedsRestart(result.restartRequired || false);
        // 성공 토스트 메시지 (IPC 핸들러에서 재시작 프롬프트 띄우므로 여기선 단순 저장 메시지)
        if (!result.restartRequired) {
           showToast('설정이 저장되었습니다.', 'success');
        }
        // 필요한 경우 부모 컴포넌트에 알림 (onSave 유지 시)
        if (onSave) {
           onSave(result.settings);
        }
      } else {
        showToast(`설정 저장 실패: ${result.error || '알 수 없는 오류'}`, 'error');
      }
    };

    // 이벤트 리스너 등록 (타입 오류 방지를 위해 any 사용)
    const ipcRenderer = (window as any).electron?.ipcRenderer || (window as any).ipcRenderer;
    if (ipcRenderer) {
      ipcRenderer.on('settings-saved', handleSettingsSaved);
      console.log('\'settings-saved\' IPC 리스너 등록됨');
    } else {
      console.warn('ipcRenderer를 찾을 수 없어 \'settings-saved\' 리스너를 등록할 수 없습니다.');
    }

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      if (ipcRenderer) {
        ipcRenderer.removeListener('settings-saved', handleSettingsSaved);
        console.log('\'settings-saved\' IPC 리스너 제거됨');
      }
    };
  }, [isElectron, showToast, onSave]);

  return (
    <div className={`${styles.settingsContainer} ${isDarkMode ? styles.darkMode : ''} ${settings.useCompactUI ? styles.compactUI : ''}`}>
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
                <h3>테마 설정</h3>
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
                        checked={settings.useSystemTheme} 
                        onChange={handleSystemThemeToggle}
                      />
                      <span className={styles.toggleLabel}>시스템 테마 사용</span>
                    </label>
                  </div>
                </div>

                <div className={styles.settingRow}>
                  <label className={styles.settingLabel}>
                    <span>색상 스키마:</span>
                    <select 
                      value={settings.colorScheme} 
                      onChange={handleColorSchemeChange}
                      className={styles.selectInput}
                      disabled={settings.useSystemTheme}
                    >
                      <option value="default">기본</option>
                      <option value="blue">블루</option>
                      <option value="green">그린</option>
                      <option value="purple">퍼플</option>
                      <option value="high-contrast">고대비</option>
                    </select>
                  </label>
                  <div className={styles.themePreview}>
                    <div className={`${styles.previewSwatch} ${styles[`swatch-${settings.colorScheme}`]} ${settings.darkMode ? styles.darkSwatch : ''}`}></div>
                  </div>
                </div>

                <div className={styles.settingDescription}>
                  테마 설정을 통해 사용자 인터페이스의 색상과 스타일을 조정할 수 있습니다.
                  시스템 테마 사용 시 운영체제의 다크/라이트 모드 설정을 따릅니다.
                </div>
              </div>

              <div className={styles.settingSection}>
                <h3>UI 설정</h3>
                <div className={styles.settingGrid}>
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
                </div>

                <div className={styles.settingGrid}>
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
                
                {/* 타이핑 분석 통계 섹션 추가 */}
                <div className={styles.analysisStats}>
                  <h4>타이핑 분석 통계</h4>
                  <div className={styles.statsDescription}>
                    타이핑 분석은 입력 속도, 정확도, 일관성 등을 추적하여 입력 패턴을 분석합니다.
                    이 기능을 통해 타이핑 습관을 개선하고 효율성을 높일 수 있습니다.
                  </div>
                  <div className={styles.statItems}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>WPM</span>
                      <span className={styles.statValue}>분당 단어 수 측정</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>정확도</span>
                      <span className={styles.statValue}>오타율 및 정확도 분석</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>일관성</span>
                      <span className={styles.statValue}>타이핑 리듬 및 일관성 측정</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>피로도</span>
                      <span className={styles.statValue}>타이핑 피로도 추적 및 휴식 추천</span>
                    </div>
                  </div>
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
        <h3>성능 설정</h3>
                <div className={styles.settingGrid}>
                  <div className={styles.settingItem}>
                    <div className={styles.settingLabel}>
          <label>
            <input 
              type="checkbox" 
              checked={settings.useHardwareAcceleration} 
              onChange={handleHardwareAccelerationToggle}
            />
                        <span className={styles.toggleLabel}>GPU 하드웨어 가속 사용 (재시작 필요)</span>
                      </label>
                      <InfoTooltip text="GPU 하드웨어 가속을 활성화하면 그래픽 렌더링과 일부 계산이 더 빨라질 수 있지만, 일부 시스템에서는 불안정할 수 있습니다. 변경 후 앱 재시작이 필요합니다." />
                    </div>
                  </div>

                  <div className={styles.settingItem}>
                    <div className={styles.settingLabel}>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={settings.useTypingAnalysisGpuAcceleration}
                          onChange={handleTypingAnalysisGpuToggle}
                          disabled={!settings.useHardwareAcceleration}
                        />
                        <span className={styles.toggleLabel}>GPU 기반 타이핑 분석 (베타)</span>
                      </label>
                      <InfoTooltip text="타이핑 분석에 GPU 가속을 사용합니다. 하드웨어 가속이 활성화된 경우에만 사용 가능합니다. 복잡한 분석이 많은 경우 성능이 향상될 수 있습니다." />
                    </div>
                    {!settings.useHardwareAcceleration && (
                      <div className={styles.disabledMessage}>
                        GPU 기반 타이핑 분석을 사용하려면 먼저 GPU 하드웨어 가속을 활성화하세요.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.settingSection}>
                <h3>메모리 설정</h3>
                <div className={styles.settingGrid}>
                  <div className={styles.settingItem}>
                    <div className={styles.settingLabel}>
                      <label>
                        <input 
                          type="checkbox" 
                          checked={settings.reduceMemoryInBackground} 
                          onChange={handleReduceMemoryToggle}
                        />
                        <span className={styles.toggleLabel}>백그라운드에서 메모리 사용 최적화</span>
                      </label>
                      <InfoTooltip text="앱이 백그라운드에 있을 때 메모리 사용량을 줄이기 위해 일부 기능을 비활성화합니다. 배터리 수명과 시스템 성능을 향상시킵니다." />
                    </div>
                  </div>
                  
                  <div className={styles.rangeItem}>
                    <div className={styles.settingLabel}>
                      <label htmlFor="memoryThreshold">
                        <span className={styles.rangeLabel}>최대 메모리 사용량 임계값: {settings.maxMemoryThreshold}MB</span>
                      </label>
                      <InfoTooltip text="앱의 메모리 사용량이 이 임계값을 초과하면 자동으로 메모리 정리를 수행합니다." />
                    </div>
                    <input
                      type="range"
                      id="memoryThreshold"
                      min="50"
                      max="500"
                      step="10"
                      value={settings.maxMemoryThreshold}
                      onChange={(e) => handleSettingChange('maxMemoryThreshold', parseInt(e.target.value, 10))}
                      className={styles.rangeSlider}
                      disabled={!settings.reduceMemoryInBackground}
                    />
                  </div>
                </div>
              </div>
              
              <div className={styles.settingSection}>
                <h3>처리 모드</h3>
                <div className={styles.settingLabel} style={{ marginBottom: '10px' }}>
                  <span>처리 모드 선택</span>
                  <InfoTooltip text="처리 모드에 따라 앱의 성능과 리소스 사용량이 조정됩니다. 자동 모드는 시스템 환경에 따라 최적의 설정을 선택합니다." />
                </div>
                <div className={styles.radioGroup}>
                  <label>
                    <input
                      type="radio"
                      name="processingMode"
                      value="auto"
                      checked={settings.processingMode === 'auto'}
                      onChange={() => handleSettingChange('processingMode', 'auto')}
                    />
                    <span className={styles.radioLabel}>자동</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="processingMode"
                      value="normal"
                      checked={settings.processingMode === 'normal'}
                      onChange={() => handleSettingChange('processingMode', 'normal')}
                    />
                    <span className={styles.radioLabel}>일반</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="processingMode"
                      value="cpu-intensive"
                      checked={settings.processingMode === 'cpu-intensive'}
                      onChange={() => handleSettingChange('processingMode', 'cpu-intensive')}
                    />
                    <span className={styles.radioLabel}>CPU 집중</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="processingMode"
                      value="gpu-intensive"
                      checked={settings.processingMode === 'gpu-intensive'}
                      onChange={() => handleSettingChange('processingMode', 'gpu-intensive')}
                      disabled={!settings.useHardwareAcceleration}
                    />
                    <span className={styles.radioLabel}>GPU 집중 (하드웨어 가속 필요)</span>
          </label>
                </div>
              </div>
              
          {needsRestart && (
            <div className={styles.restartNotice}>
              <p>일부 설정이 변경되었습니다. 변경 사항을 적용하려면 앱을 재시작해야 합니다.</p>
                <button 
                  className={styles.restartButton}
                  onClick={handleRestartClick}
                >
                  지금 재시작
                </button>
                </div>
              )}
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
        isDarkMode={isDarkMode}
      />
    </div>
  );
}