import { NextRequest, NextResponse } from 'next/server';

/**
 * 메모리 설정 가져오기 API
 */
export async function GET() {
  try {
    // 서버 측에서 네이티브 모듈 불러오기
    const nativeModule = require('../../../../../../native-modules');
    
    const result = await nativeModule.get_memory_settings();
    let settings;
    
    try {
      settings = JSON.parse(result);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: '설정 파싱 실패',
        timestamp: Date.now()
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('메모리 설정 가져오기 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * 메모리 설정 초기화 API
 */
export async function POST(request: NextRequest) {
  try {
    const settingsJson = await request.text();
    
    // 서버 측에서 네이티브 모듈 불러오기
    const nativeModule = require('../../../../../../native-modules');
    
    const success = await nativeModule.initialize_memory_settings(settingsJson);
    
    return NextResponse.json({
      success: !!success,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('메모리 설정 초기화 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
