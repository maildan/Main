import { NextRequest, NextResponse } from 'next/server';

/**
 * GPU 정보 가져오기 API
 */
export async function GET(request: NextRequest) {
  try {
    // 서버 측에서 네이티브 모듈 불러오기
    const nativeModule = require('../../../../../../native-modules');
    
    // GPU 정보 가져오기
    const gpuInfoJson = nativeModule.get_gpu_info();
    const gpuInfo = JSON.parse(gpuInfoJson);
    
    return NextResponse.json({
      success: true,
      available: true,
      gpuInfo,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 정보 가져오기 API 오류:', error);
    return NextResponse.json({
      success: false,
      available: false,
      gpuInfo: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * GPU 계산 수행 API
 */
export async function POST(request: NextRequest) {
  try {
    const { data, computationType } = await request.json();
    
    if (!data || !computationType) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 요청: 데이터 또는 계산 유형 누락',
        timestamp: Date.now()
      }, { status: 400 });
    }
    
    // 서버 측에서 네이티브 모듈 불러오기
    const nativeModule = require('../../../../../../native-modules');
    
    // GPU 계산 수행
    const dataJson = JSON.stringify(data);
    const resultJson = nativeModule.perform_gpu_computation_sync(dataJson, computationType);
    const result = JSON.parse(resultJson);
    
    return NextResponse.json({
      success: true,
      result,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 계산 API 오류:', error);
    return NextResponse.json({
      success: false,
      result: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
