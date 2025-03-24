import React, { useState, useEffect } from 'react';
import styles from './GPUSettingsPanel.module.css';
import { useToast } from './ToastContext';
import { 
  getGPURecommendations, 
  applyGPUSettings, 
  GPUSettings 
} from '../utils/gpu-settings-manager';
import { isGPUAccelerationEnabled, getGPUInfo } from '../utils/memory/gpu-accelerator';

interface GPUSettingsPanelProps {
  isDarkMode?: boolean;
  initialSettings?: {
    useHardwareAcceleration: boolean;
    processingMode: string;
  };
  onSettingsChange?: (settings: any) => void;
  onRestartNeeded?: () => void;
}

export function GPUSettingsPanel({
  isDarkMode = false,
  initialSettings,
  onSettingsChange,
  onRestartNeeded
}: GPUSettingsPanelProps) {
  const [gpuInfo, setGpuInfo] = useState<{ renderer: string; vendor: string; isAccelerated: boolean }>({
    renderer: '정보 로드 중...',
    vendor: '정보 로드 중...',
    isAccelerated: false
  });
  
  const [settings, setSettings] = useState<GPUSettings>({
    useHardwareAcceleration: initialSettings?.useHardwareAcceleration ?? false,
    processingMode: initialSettings?.processingMode ?? 'auto',
    optimizeForBattery: true,
    memoryOptimization: 'medium',
    threadCount: 4
  });
  
  const [gpuType, setGpuType] = useState<string>('알 수 없음');
  const [recommendation, setRecommendation] = useState<string>('GPU 정보를 가져오는 중...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [needsRestart, setNeedsRestart] = useState<boolean>(false);
  
  const { showToast } = useToast();
  
  // 컴포넌트 마운트 시 GPU 정보 로드
  useEffect(() => {
    async function loadGPUInfo() {
      try {
        setIsLoading(true);
        
        // GPU 가속화 상태 확인
        const isAccelerated = await isGPUAccelerationEnabled();
        
        // GPU 정보 가져오기
        const info = getGPUInfo();
        setGpuInfo({
          ...info,
          isAccelerated
        });
        
        // GPU 권장 설정 가져오기
        const recommendations = await getGPURecommendations();
        setGpuType(recommendations.gpuType);
        setRecommendation(recommendations.recommendation);
        
        // 초기 설정이 없는 경우 권장 설정 사용
        if (!initialSettings) {
          setSettings(recommendations.recommendedSettings);
        } else {
          // 초기 설정이 있는 경우 사용자 지정 설정과 권장 설정을 병합
          setSettings({
            ...recommendations.recommendedSettings,
            useHardwareAcceleration: initialSettings.useHardwareAcceleration,
            processingMode: initialSettings.processingMode
          });
        }
      } catch (error) {
        console.error('GPU 정보 로드 오류:', error);
        showToast('GPU 정보를 가져오는 중 오류가 발생했습니다', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadGPUInfo();
  }, [initialSettings, showToast]);
  
  // 설정 변경 처리 함수
  const handleSettingChange = (key: keyof GPUSettings, value: any) => {
    // 하드웨어 가속 변경 시 재시작 필요
    if (key === 'useHardwareAcceleration' && value !== settings.useHardwareAcceleration) {
      setNeedsRestart(true);
    }
    
    // 새 설정 적용
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // 변경 사항 기록
    setHasChanges(true);
  };
  
  // 설정 저장 처리 함수
  const handleSaveSettings = async () => {
    try {
      const success = await applyGPUSettings(settings);
      
      if (success) {
        showToast('GPU 설정이 저장되었습니다', 'success');
        
        // 부모 컴포넌트에 설정 변경 알림
        if (onSettingsChange) {
          onSettingsChange({
            useHardwareAcceleration: settings.useHardwareAcceleration,
            processingMode: settings.processingMode
          });
        }
        
        // 재시작 필요 여부 확인
        if (needsRestart && onRestartNeeded) {
          onRestartNeeded();
        }
        
        // 변경 사항 초기화
        setHasChanges(false);
      } else {
        showToast('GPU 설정 저장에 실패했습니다', 'error');
      }
    } catch (error) {
      console.error('설정 저장 오류:', error);
      showToast('설정을 저장하는 중 오류가 발생했습니다', 'error');
    }
  };
  
  // 최적 설정 적용 함수
  const applyOptimalSettings = async () => {
    try {
      const recommendations = await getGPURecommendations();
      const newSettings = recommendations.recommendedSettings;
      
      // 하드웨어 가속 변경 여부 확인
      if (newSettings.useHardwareAcceleration !== settings.useHardwareAcceleration) {
        setNeedsRestart(true);
      }
      
      // 새 설정 적용
      setSettings(newSettings);
      setHasChanges(true);
      
      showToast('최적 GPU 설정이 적용되었습니다. 저장하려면 저장 버튼을 클릭하세요.', 'info');
    } catch (error) {
      console.error('최적 설정 적용 오류:', error);
      showToast('최적 설정을 적용하는 중 오류가 발생했습니다', 'error');
    }
  };
  
  return (
    <div className={`${styles.container} ${isDarkMode ? styles.darkMode : ''}`}>
      <h2 className={styles.title}>GPU 설정</h2>
      
      {isLoading ? (
        <div className={styles.loading}>
          <p>GPU 정보 불러오는 중...</p>
        </div>
      ) : (
        <>
          <div className={styles.infoSection}>
            <h3>감지된 GPU 정보</h3>
            <div className={styles.gpuInfo}>
              <div className={styles.infoItem}>
                <span className={styles.label}>GPU 유형:</span>
                <span className={styles.value}>{gpuType}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>GPU 렌더러:</span>
                <span className={styles.value}>{gpuInfo.renderer}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>GPU 벤더:</span>
                <span className={styles.value}>{gpuInfo.vendor}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>하드웨어 가속:</span>
                <span className={styles.value}>
                  {gpuInfo.isAccelerated ? '사용 가능' : '사용 불가능'}
                </span>
              </div>
            </div>
            
            <div className={styles.recommendation}>
              <h4>권장 설정</h4>
              <p>{recommendation}</p>
              <button 
                className={styles.recommendButton}
                onClick={applyOptimalSettings}
              >
                최적 설정 적용
              </button>
            </div>
          </div>
          
          <div className={styles.settingsSection}>
            <h3>GPU 설정</h3>
            
            <div className={styles.settingItem}>
              <label>
                <input
                  type="checkbox"
                  checked={settings.useHardwareAcceleration}
                  onChange={(e) => handleSettingChange('useHardwareAcceleration', e.target.checked)}
                />
                <span>하드웨어 가속 사용 (재시작 필요)</span>
              </label>
              {needsRestart && (
                <div className={styles.restartNotice}>
                  이 설정을 적용하려면 앱을 재시작해야 합니다.
                </div>
              )}
            </div>
            
            <div className={styles.settingItem}>
              <label>처리 모드:</label>
              <select
                value={settings.processingMode}
                onChange={(e) => handleSettingChange('processingMode', e.target.value)}
                disabled={!settings.useHardwareAcceleration}
              >
                <option value="auto">자동 (시스템에 맞게 조정)</option>
                <option value="normal">일반 모드</option>
                <option value="cpu-intensive">CPU 중점 모드 (저사양 GPU)</option>
                <option value="gpu-intensive">GPU 중점 모드 (고사양 GPU)</option>
              </select>
              {!settings.useHardwareAcceleration && (
                <div className={styles.disabledNote}>
                  하드웨어 가속을 활성화하면 처리 모드를 선택할 수 있습니다.
                </div>
              )}
            </div>
            
            <div className={styles.settingItem}>
              <label>
                <input
                  type="checkbox"
                  checked={settings.optimizeForBattery}
                  onChange={(e) => handleSettingChange('optimizeForBattery', e.target.checked)}
                  disabled={!settings.useHardwareAcceleration}
                />
                <span>배터리 사용 시 전력 소모 최적화</span>
              </label>
            </div>
            
            <div className={styles.settingItem}>
              <label>메모리 최적화:</label>
              <select
                value={settings.memoryOptimization}
                onChange={(e) => handleSettingChange('memoryOptimization', e.target.value)}
              >
                <option value="low">낮음 (높은 성능, 많은 메모리 사용)</option>
                <option value="medium">중간 (균형 있는 설정)</option>
                <option value="high">높음 (낮은 메모리 사용, 낮은 성능)</option>
              </select>
            </div>
            
            <div className={styles.settingItem}>
              <label>스레드 수:</label>
              <select
                value={settings.threadCount}
                onChange={(e) => handleSettingChange('threadCount', parseInt(e.target.value))}
              >
                <option value="2">2 (저사양 CPU)</option>
                <option value="4">4 (균형)</option>
                <option value="8">8 (고사양 CPU)</option>
                <option value="16">16 (최고사양 CPU)</option>
              </select>
            </div>
          </div>
          
          <div className={styles.buttonSection}>
            <button
              className={`${styles.saveButton} ${!hasChanges ? styles.disabled : ''}`}
              onClick={handleSaveSettings}
              disabled={!hasChanges}
            >
              설정 저장
            </button>
            {needsRestart && (
              <button
                className={styles.restartButton}
                onClick={onRestartNeeded}
              >
                앱 재시작
              </button>
            )}
          </div>
          
          <div className={styles.noteSection}>
            <p className={styles.note}>
              <strong>참고:</strong> GPU 하드웨어 가속을 사용하면 그래픽 렌더링 및 일부 계산 작업의 성능이 향상될 수 있지만, 
              메모리 사용량이 증가하고 일부 시스템에서는 호환성 문제가 발생할 수 있습니다.
            </p>
            <p className={styles.note}>
              <strong>처리 모드:</strong> 자동 모드는 시스템 성능에 따라 최적의 설정을 선택합니다. 
              CPU 중점 모드는 저사양 GPU에 적합하며, GPU 중점 모드는 고성능 GPU에서 최상의 성능을 제공합니다.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
