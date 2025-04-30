import { NextRequest, NextResponse } from 'next/server';

/**
 * GPU 설정 가져오기 API
 */
export async function GET(request: NextRequest) {
  try {
    // 서버 측에서 네이티브 모듈 불러오기
    const nativeModule = require('../../../../../../../native-modules');
    
    // GPU 설정 가져오기
    const settingsJson = nativeModule.get_gpu_settings_json();
    const settings = JSON.parse(settingsJson);
    
    return NextResponse.json({
      success: true,
      settings,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 설정 가져오기 API 오류:', error);
    return NextResponse.json({
      success: false,
      settings: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * GPU 설정 업데이트 API
 */
export async function PUT(request: NextRequest) {
  try {
    const settingsJson = await request.text();
    
    // 서버 측에서 네이티브 모듈 불러오기
    const nativeModule = require('../../../../../../../native-modules');
    
    // GPU 설정 업데이트
    const success = nativeModule.update_gpu_settings_json(settingsJson);
    
    return NextResponse.json({
      success,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 설정 업데이트 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
