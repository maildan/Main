import { NextResponse } from 'next/server';
import { loadMemorySettings } from '../../../settings/memory-settings';
import { SettingsState } from '../../../components/Settings';
import { NextRequest } from 'next/server';

// 앱 설정 불러오기 (localStorage)
function loadAppSettings(): SettingsState | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const settingsJson = localStorage.getItem('app_settings');
    if (!settingsJson) {
      return null;
    }

    const settings = JSON.parse(settingsJson);

    // GPU 가속 관련 설정이 없는 경우 기본값 추가
    const settingsWithDefaults = {
      ...settings,
      // GPU 가속 설정이 없으면 기본값 설정
      useHardwareAcceleration: settings.useHardwareAcceleration !== undefined
        ? settings.useHardwareAcceleration
        : false,
      useTypingAnalysisGpuAcceleration: settings.useTypingAnalysisGpuAcceleration !== undefined
        ? settings.useTypingAnalysisGpuAcceleration
        : false
    };

    // 로드된 설정 로깅 (디버깅용)
    console.log('로드된 앱 설정:', settingsWithDefaults);

    return settingsWithDefaults;
  } catch (error) {
    console.error('앱 설정 불러오기 오류:', error);
    return null;
  }
}

/**
 * 설정 가져오기 API
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    // 메모리 설정 불러오기
    const memorySettings = loadMemorySettings();

    // 앱 설정 불러오기
    const appSettings = loadAppSettings();

    // 기본 설정 정의
    const defaultSettings: Partial<SettingsState> = {
      darkMode: false,
      windowMode: 'windowed',
      useHardwareAcceleration: false,
      useTypingAnalysisGpuAcceleration: false,
      minimizeToTray: true,
      showTrayNotifications: true,
      enabledCategories: {
        docs: true,
        office: true,
        coding: true,
        sns: true
      }
    };

    // 통합 설정 구성 (기본값과 병합)
    const settings = {
      ...defaultSettings,
      ...appSettings,
      memory: memorySettings,
    };

    // 응답에서 설정 확인 (디버깅용)
    console.log('API 응답 설정:', settings);

    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('API 설정 불러오기 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 