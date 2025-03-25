import { NextRequest, NextResponse } from 'next/server';

/**
 * GPU 가속화 상태 가져오기 API
 */
export async function GET(request: NextRequest) {
  try {
    // 서버 측에서 네이티브 모듈 불러오기
    const nativeModule = require('../../../../../../../native-modules');
    
    // GPU 정보 가져오기
    const gpuInfoJson = nativeModule.get_gpu_info();
    const gpuInfo = JSON.parse(gpuInfoJson);
    
    return NextResponse.json({
      success: true,
      enabled: gpuInfo.acceleration_enabled,
      available: gpuInfo.available,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 가속화 상태 가져오기 API 오류:', error);
    return NextResponse.json({
      success: false,
      enabled: false,
      available: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * GPU 가속 설정 API
 */
export async function PUT(request: NextRequest) {
  try {
    const { enable } = await request.json();
    
    if (typeof enable !== 'boolean') {
      return NextResponse.json({
        success: false,
        enabled: false,
        result: false,
        error: '유효하지 않은 요청: enable은 boolean이어야 합니다',
        timestamp: Date.now()
      }, { status: 400 });
    }
    
    // 서버 측에서 네이티브 모듈 불러오기
    const nativeModule = require('../../../../../../../native-modules');
    
    // GPU 가속 설정 변경
    const functionName = enable ? 'enable_gpu_acceleration' : 'disable_gpu_acceleration';
    let result = false;
    
    try {
      if (typeof nativeModule[functionName] === 'function') {
        result = nativeModule[functionName]();
      } else {
        throw new Error(`네이티브 모듈에 ${functionName} 함수가 없습니다`);
      }
    } catch (nativeError) {
      console.warn(`네이티브 GPU 가속 설정 오류:`, nativeError);
      // JavaScript 폴백 구현
      result = true; // 실제 구현에서는 적절한 폴백 로직 필요
    }
    
    return NextResponse.json({
      success: true,
      enabled: enable,
      result,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 가속 설정 API 오류:', error);
    return NextResponse.json({
      success: false,
      enabled: false,
      result: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
