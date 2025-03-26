import { NextResponse } from 'next/server';

// GPU 정보 조회
export async function GET() {
  try {
    // 서버 측 네이티브 모듈 가져오기
    const nativeModule = await import('../../../../server/native');
    
    // GPU 가용성 확인
    const isAvailable = nativeModule.default.isGpuAccelerationAvailable();
    
    // GPU 정보 가져오기
    const gpuInfo = nativeModule.default.getGpuInfo();
    
    return NextResponse.json({
      success: true,
      available: isAvailable,
      gpuInfo,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 정보 가져오기 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'GPU 정보를 가져오는 중 오류가 발생했습니다',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

// GPU 계산 작업 수행
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 서버 측 네이티브 모듈 가져오기
    const nativeModule = await import('../../../../server/native');
    
    // GPU 가용성 확인
    const isAvailable = nativeModule.default.isGpuAccelerationAvailable();
    
    if (!isAvailable) {
      return NextResponse.json({
        success: false,
        error: 'GPU 가속화를 사용할 수 없습니다',
        timestamp: Date.now()
      }, { status: 400 });
    }
    
    // GPU 계산 수행
    const result = await nativeModule.default.performGpuComputation(
      body.data || '{}',
      body.computationType || 'matrix'
    );
    
    return NextResponse.json({
      success: true,
      result,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 계산 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'GPU 계산을 수행하는 중 오류가 발생했습니다',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
