/**
 * GPU 설정 브릿지
 * 
 * 이 모듈은 네이티브 GPU 설정과 애플리케이션 간의 인터페이스를 제공합니다.
 */

// GPU 설정 인터페이스
export interface GpuSettings {
  hardware_acceleration_enabled: boolean;
  shader_cache_enabled: boolean;
  compute_mode: string;
  power_preference: string;
  max_resource_size: number;
  debug_mode: boolean;
  profile_name: string;
}

// 애플리케이션 GPU 설정 인터페이스 (JS 친화적인 필드명)
export interface AppGpuSettings {
  hardwareAccelerationEnabled: boolean;
  shaderCacheEnabled: boolean;
  computeMode: string;
  powerPreference: string;
  maxResourceSize: number;
  debugMode: boolean;
  profileName: string;
}

/**
 * GPU 설정 가져오기
 * @returns Promise<AppGpuSettings>
 */
export async function getGpuSettings(): Promise<AppGpuSettings | null> {
  try {
    const response = await fetch('/api/native/gpu/settings', {
      method: 'GET',
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error(`GPU 설정 요청 실패: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.settings) {
      throw new Error(data.error || 'GPU 설정을 가져올 수 없습니다');
    }
    
    // Rust 스타일 필드명을 JS 스타일로 변환
    return {
      hardwareAccelerationEnabled: data.settings.hardware_acceleration_enabled,
      shaderCacheEnabled: data.settings.shader_cache_enabled,
      computeMode: data.settings.compute_mode,
      powerPreference: data.settings.power_preference,
      maxResourceSize: data.settings.max_resource_size,
      debugMode: data.settings.debug_mode,
      profileName: data.settings.profile_name
    };
  } catch (error) {
    console.error('GPU 설정 가져오기 오류:', error);
    return null;
  }
}

/**
 * GPU 설정 업데이트
 * @param settings GPU 설정
 * @returns Promise<boolean>
 */
export async function updateGpuSettings(settings: AppGpuSettings): Promise<boolean> {
  try {
    // JS 스타일 필드명을 Rust 스타일로 변환
    const nativeSettings: GpuSettings = {
      hardware_acceleration_enabled: settings.hardwareAccelerationEnabled,
      shader_cache_enabled: settings.shaderCacheEnabled,
      compute_mode: settings.computeMode,
      power_preference: settings.powerPreference,
      max_resource_size: settings.maxResourceSize,
      debug_mode: settings.debugMode,
      profile_name: settings.profileName
    };
    
    const response = await fetch('/api/native/gpu/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nativeSettings)
    });
    
    if (!response.ok) {
      throw new Error(`GPU 설정 업데이트 실패: ${response.status}`);
    }
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('GPU 설정 업데이트 오류:', error);
    return false;
  }
}

/**
 * 성능 프로필 적용
 * @param profileName 프로필 이름 ('high-performance', 'balanced', 'power-save')
 * @returns Promise<boolean>
 */
export async function applyGpuPerformanceProfile(profileName: string): Promise<boolean> {
  try {
    // 현재 설정 가져오기
    const currentSettings = await getGpuSettings();
    
    if (!currentSettings) {
      return false;
    }
    
    // 프로필에 맞게 설정 업데이트
    let updatedSettings: AppGpuSettings;
    
    switch (profileName) {
      case 'high-performance':
        updatedSettings = {
          ...currentSettings,
          hardwareAccelerationEnabled: true,
          shaderCacheEnabled: true,
          computeMode: 'performance',
          powerPreference: 'high-performance',
          profileName: 'high-performance'
        };
        break;
        
      case 'balanced':
        updatedSettings = {
          ...currentSettings,
          hardwareAccelerationEnabled: true,
          shaderCacheEnabled: true,
          computeMode: 'auto',
          powerPreference: 'default',
          profileName: 'balanced'
        };
        break;
        
      case 'power-save':
        updatedSettings = {
          ...currentSettings,
          hardwareAccelerationEnabled: false,
          shaderCacheEnabled: true,
          computeMode: 'power-save',
          powerPreference: 'low-power',
          profileName: 'power-save'
        };
        break;
        
      default:
        console.warn(`알 수 없는 프로필: ${profileName}, 기본 설정 사용`);
        updatedSettings = {
          ...currentSettings,
          profileName
        };
    }
    
    // 업데이트된 설정 적용
    return await updateGpuSettings(updatedSettings);
  } catch (error) {
    console.error('GPU 성능 프로필 적용 오류:', error);
    return false;
  }
}

/**
 * GPU 가속화 설정
 * @param enabled 활성화 여부
 * @returns Promise<boolean>
 */
export async function setGpuAcceleration(enabled: boolean): Promise<boolean> {
  try {
    // 현재 설정 가져오기
    const currentSettings = await getGpuSettings();
    
    if (!currentSettings) {
      return false;
    }
    
    // GPU 가속화 설정 변경
    const updatedSettings = {
      ...currentSettings,
      hardwareAccelerationEnabled: enabled
    };
    
    // 업데이트된 설정 적용
    return await updateGpuSettings(updatedSettings);
  } catch (error) {
    console.error('GPU 가속화 설정 오류:', error);
    return false;
  }
}
