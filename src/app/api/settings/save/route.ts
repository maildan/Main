import { NextResponse } from 'next/server';
import { saveMemorySettings } from '../../../settings/memory-settings';
import { SettingsState } from '../../../components/Settings';

// 앱 설정 저장 (localStorage)
function saveAppSettings(settings: SettingsState): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      return false;
    }
    
    // 콘솔에 저장하려는 설정 출력 (디버깅용)
    console.log('설정 저장 전:', settings);
    
    // GPU 가속 관련 설정이 확실히 저장되도록 설정 객체에 명시적으로 포함
    const settingsToSave = {
      ...settings,
      useHardwareAcceleration: settings.useHardwareAcceleration || false,
      useTypingAnalysisGpuAcceleration: settings.useTypingAnalysisGpuAcceleration || false
    };
    
    localStorage.setItem('app_settings', JSON.stringify(settingsToSave));
    
    // 저장 후 확인 (디버깅용)
    const savedSettings = localStorage.getItem('app_settings');
    console.log('저장된 설정:', savedSettings);
    
    return true;
  } catch (error) {
    console.error('앱 설정 저장 오류:', error);
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { settings } = await request.json();
    
    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          error: '설정 데이터가 없습니다.'
        },
        { status: 400 }
      );
    }
    
    console.log('API에 전달된 설정:', settings);
    
    // 메모리 설정이 있는 경우 저장
    if (settings.memory) {
      saveMemorySettings(settings.memory);
    }
    
    // 앱 설정 저장
    const appSettingsSuccess = saveAppSettings(settings);
    
    if (!appSettingsSuccess) {
      console.warn('앱 설정 저장 실패');
    }
    
    return NextResponse.json({
      success: true,
      message: '설정이 저장되었습니다.',
      savedSettings: settings // 응답에 저장된 설정 포함
    });
  } catch (error) {
    console.error('API 설정 저장 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 