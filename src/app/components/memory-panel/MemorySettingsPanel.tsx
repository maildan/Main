import React, { useEffect, useState } from 'react';
import {
  getMemorySettings,
  saveMemorySettings,
  resetMemorySettings,
  type MemorySettings,
} from '../../utils/memory-settings-manager';
// UI 컴포넌트 임포트 제거 및 사용자 정의 컴포넌트 사용
// import { Switch } from '@/components/ui/switch';
// import { Slider } from '@/components/ui/slider';
// import { Button } from '@/components/ui/button';

// 사용자 정의 UI 컴포넌트 만들기
// Switch 컴포넌트
type SwitchProps = {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
};

const Switch: React.FC<SwitchProps> = ({ id, checked, onCheckedChange, disabled }) => {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        id={id}
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={e => onCheckedChange(e.target.checked)}
        disabled={disabled}
      />
      <div
        className={`
        w-11 h-6 bg-gray-200 rounded-full peer 
        dark:bg-gray-700 peer-checked:after:translate-x-full 
        peer-checked:after:border-white after:content-[''] 
        after:absolute after:top-[2px] after:left-[2px] 
        after:bg-white after:border-gray-300 after:border 
        after:rounded-full after:h-5 after:w-5 after:transition-all 
        dark:border-gray-600 peer-checked:bg-blue-600
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      ></div>
    </label>
  );
};

// Slider 컴포넌트
type SliderProps = {
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number[];
  onValueChange: (value: number[]) => void;
  disabled?: boolean;
};

const Slider: React.FC<SliderProps> = ({
  id,
  min = 0,
  max = 100,
  step = 1,
  value,
  onValueChange,
  disabled,
}) => {
  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={e => onValueChange([parseInt(e.target.value, 10)])}
      disabled={disabled}
      className={`
        w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer 
        dark:bg-gray-700 accent-blue-600
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    />
  );
};

// Button 컴포넌트
type ButtonProps = {
  variant?: 'default' | 'outline' | 'destructive';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
};

const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  onClick,
  disabled,
  children,
  className = '',
}) => {
  const baseClasses =
    'px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = {
    default: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    outline:
      'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses} 
        ${variantClasses[variant]} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
};

// 메모리 설정 패널 컴포넌트
export const MemorySettingsPanel: React.FC = () => {
  // 메모리 설정 상태
  const [settings, setSettings] = useState<MemorySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // 컴포넌트 마운트 시 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const currentSettings = await getMemorySettings();
        setSettings(currentSettings);
      } catch (error) {
        console.error('메모리 설정을 로드하는 중 오류 발생:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 설정 변경 핸들러
  const handleSettingChange = <K extends keyof MemorySettings>(
    key: K,
    value: MemorySettings[K]
  ) => {
    if (!settings) return;

    setSettings({
      ...settings,
      [key]: value,
    });
  };

  // 설정 저장 핸들러
  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaveStatus('saving');
    try {
      const success = await saveMemorySettings(settings);
      setSaveStatus(success ? 'success' : 'error');

      // 3초 후 상태 초기화
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('설정 저장 중 오류 발생:', error);
      setSaveStatus('error');
    }
  };

  // 설정 초기화 핸들러
  const handleResetSettings = async () => {
    setSaveStatus('saving');
    try {
      const success = await resetMemorySettings();
      if (success) {
        const defaultSettings = await getMemorySettings();
        setSettings(defaultSettings);
        setSaveStatus('success');
      } else {
        setSaveStatus('error');
      }

      // 3초 후 상태 초기화
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('설정 초기화 중 오류 발생:', error);
      setSaveStatus('error');
    }
  };

  // 로딩 중 표시
  if (loading) {
    return <div className="flex justify-center items-center p-4">설정을 로드하는 중...</div>;
  }

  // 설정이 없는 경우
  if (!settings) {
    return (
      <div className="flex flex-col items-center p-4 gap-2">
        <p className="text-red-500">설정을 로드할 수 없습니다.</p>
        <Button onClick={() => setLoading(true)}>다시 시도</Button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">메모리 최적화 설정</h2>

      {/* 기본 설정 섹션 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">기본 설정</h3>

        <div className="space-y-4">
          {/* 자동 최적화 토글 */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="auto-optimization" className="text-sm font-medium">
                자동 메모리 최적화
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                성능 저하 없이 메모리 사용량을 자동으로 최적화합니다.
              </p>
            </div>
            <Switch
              id="auto-optimization"
              checked={settings.enableAutomaticOptimization}
              onCheckedChange={(checked: boolean) =>
                handleSettingChange('enableAutomaticOptimization', checked)
              }
            />
          </div>

          {/* 최적화 임계값 슬라이더 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="threshold-slider" className="text-sm font-medium">
                최적화 임계값 ({settings.optimizationThreshold} MB)
              </label>
            </div>
            <Slider
              id="threshold-slider"
              min={50}
              max={500}
              step={10}
              value={[settings.optimizationThreshold]}
              onValueChange={(value: number[]) =>
                handleSettingChange('optimizationThreshold', value[0])
              }
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              이 임계값을 초과하면 메모리 최적화가 트리거됩니다.
            </p>
          </div>

          {/* 최적화 간격 슬라이더 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="interval-slider" className="text-sm font-medium">
                최적화 간격 ({settings.optimizationInterval / 1000} 초)
              </label>
            </div>
            <Slider
              id="interval-slider"
              min={10000}
              max={300000}
              step={10000}
              value={[settings.optimizationInterval]}
              onValueChange={(value: number[]) =>
                handleSettingChange('optimizationInterval', value[0])
              }
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              메모리 사용량을 확인하는 주기를 설정합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 고급 설정 섹션 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">고급 설정</h3>

        <div className="space-y-4">
          {/* 적극적인 GC 토글 */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="aggressive-gc" className="text-sm font-medium">
                적극적인 가비지 컬렉션
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                더 빈번하게 메모리를 정리합니다. (일부 성능 저하 가능)
              </p>
            </div>
            <Switch
              id="aggressive-gc"
              checked={settings.aggressiveGC}
              onCheckedChange={(checked: boolean) => handleSettingChange('aggressiveGC', checked)}
            />
          </div>

          {/* 로깅 활성화 토글 */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="enable-logging" className="text-sm font-medium">
                메모리 로깅 활성화
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                메모리 사용량 및 최적화 작업 로그를 기록합니다.
              </p>
            </div>
            <Switch
              id="enable-logging"
              checked={settings.enableLogging}
              onCheckedChange={(checked: boolean) => handleSettingChange('enableLogging', checked)}
            />
          </div>

          {/* 성능 측정 토글 */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="performance-metrics" className="text-sm font-medium">
                성능 지표 수집
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                메모리 사용량 및 최적화 효과에 대한 통계를 수집합니다.
              </p>
            </div>
            <Switch
              id="performance-metrics"
              checked={settings.enablePerformanceMetrics}
              onCheckedChange={(checked: boolean) =>
                handleSettingChange('enablePerformanceMetrics', checked)
              }
            />
          </div>
        </div>
      </div>

      {/* GPU 관련 설정 섹션 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">하드웨어 가속 설정</h3>

        <div className="space-y-4">
          {/* 하드웨어 가속 토글 */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="hardware-accel" className="text-sm font-medium">
                하드웨어 가속 사용
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                GPU를 활용하여 일부 작업을 가속화합니다.
              </p>
            </div>
            <Switch
              id="hardware-accel"
              checked={settings.useHardwareAcceleration}
              onCheckedChange={(checked: boolean) =>
                handleSettingChange('useHardwareAcceleration', checked)
              }
            />
          </div>

          {/* 처리 모드 선택 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">처리 모드</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={settings.processingMode === 'auto' ? 'default' : 'outline'}
                onClick={() => handleSettingChange('processingMode', 'auto')}
                className="w-full"
              >
                자동
              </Button>
              <Button
                variant={settings.processingMode === 'normal' ? 'default' : 'outline'}
                onClick={() => handleSettingChange('processingMode', 'normal')}
                className="w-full"
              >
                일반
              </Button>
              <Button
                variant={settings.processingMode === 'cpu-intensive' ? 'default' : 'outline'}
                onClick={() => handleSettingChange('processingMode', 'cpu-intensive')}
                className="w-full"
              >
                CPU 집중
              </Button>
              <Button
                variant={settings.processingMode === 'gpu-intensive' ? 'default' : 'outline'}
                onClick={() => handleSettingChange('processingMode', 'gpu-intensive')}
                className="w-full"
              >
                GPU 집중
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 메모리 풀 설정 섹션 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">메모리 풀 설정</h3>

        <div className="space-y-4">
          {/* 메모리 풀 사용 토글 */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="memory-pool" className="text-sm font-medium">
                메모리 풀 사용
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                객체 재사용을 통해 메모리 할당 및 가비지 컬렉션을 최적화합니다.
              </p>
            </div>
            <Switch
              id="memory-pool"
              checked={settings.useMemoryPool}
              onCheckedChange={(checked: boolean) => handleSettingChange('useMemoryPool', checked)}
            />
          </div>

          {/* 풀 정리 간격 슬라이더 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="pool-cleanup-slider" className="text-sm font-medium">
                풀 정리 간격 ({settings.poolCleanupInterval / 60000} 분)
              </label>
            </div>
            <Slider
              id="pool-cleanup-slider"
              min={60000}
              max={3600000}
              step={60000}
              value={[settings.poolCleanupInterval]}
              onValueChange={(value: number[]) =>
                handleSettingChange('poolCleanupInterval', value[0])
              }
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              미사용 객체를 메모리 풀에서 제거하는 주기를 설정합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 컴포넌트별 설정 섹션 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">컴포넌트별 설정</h3>

        <div className="space-y-4">
          {/* 네이티브 구현 선호 토글 */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="native-impl" className="text-sm font-medium">
                네이티브 구현 선호
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                가능한 경우 네이티브 최적화를 사용합니다.
              </p>
            </div>
            <Switch
              id="native-impl"
              checked={settings.preferNativeImplementation}
              onCheckedChange={(checked: boolean) =>
                handleSettingChange('preferNativeImplementation', checked)
              }
            />
          </div>

          {/* 자동 폴백 활성화 토글 */}
          <div className="flex items-center justify-between">
            <div>
              <label htmlFor="auto-fallback" className="text-sm font-medium">
                자동 폴백 활성화
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                네이티브 구현 실패 시 자동으로 자바스크립트 구현으로 전환합니다.
              </p>
            </div>
            <Switch
              id="auto-fallback"
              checked={settings.enableAutomaticFallback}
              onCheckedChange={(checked: boolean) =>
                handleSettingChange('enableAutomaticFallback', checked)
              }
            />
          </div>

          {/* 폴백 재시도 간격 슬라이더 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="fallback-retry-slider" className="text-sm font-medium">
                폴백 재시도 간격 ({settings.fallbackRetryDelay / 60000} 분)
              </label>
            </div>
            <Slider
              id="fallback-retry-slider"
              min={60000}
              max={3600000}
              step={60000}
              value={[settings.fallbackRetryDelay]}
              onValueChange={(value: number[]) =>
                handleSettingChange('fallbackRetryDelay', value[0])
              }
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              네이티브 구현 사용 재시도 간격을 설정합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 버튼 섹션 */}
      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={handleResetSettings} disabled={saveStatus === 'saving'}>
          기본값으로 초기화
        </Button>
        <Button onClick={handleSaveSettings} disabled={saveStatus === 'saving'}>
          {saveStatus === 'idle' && '설정 저장'}
          {saveStatus === 'saving' && '저장 중...'}
          {saveStatus === 'success' && '저장 완료!'}
          {saveStatus === 'error' && '저장 실패!'}
        </Button>
      </div>
    </div>
  );
};
