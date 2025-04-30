import { NextResponse } from 'next/server';
import nativeModule from '../../../../server/native';

export async function GET() {
  try {
    // GPU 가속 가능 여부 확인
    let gpuAvailable = false;
    let gpuInfo = null;
    let error = null;

    // 네이티브 모듈이 있고 GPU 확인 함수가 존재하는 경우
    if (nativeModule && typeof nativeModule.isGpuAccelerationAvailable === 'function') {
      try {
        gpuAvailable = await nativeModule.isGpuAccelerationAvailable();
        
        // GPU 정보 가져오기
        if (typeof nativeModule.getGpuInfo === 'function') {
          const gpuInfoResult = await nativeModule.getGpuInfo();
          gpuInfo = typeof gpuInfoResult === 'string' 
            ? JSON.parse(gpuInfoResult) 
            : gpuInfoResult;
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'GPU 정보 확인 중 오류 발생';
        console.error('GPU 가속 확인 오류:', err);
      }
    } else {
      error = '네이티브 모듈 또는 GPU 확인 함수를 사용할 수 없습니다';
    }

    return NextResponse.json({
      success: !error,
      available: gpuAvailable,
      gpuInfo,
      error,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU API 처리 중 오류:', error);
    return NextResponse.json({
      success: false,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

// GPU 계산 작업 수행
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 런타임에 서버 측에서만 모듈 가져오기
    const nativeModule = process.env.NODE_ENV === 'development'
      ? (await import('../../../../server/native')).default
      : null;

    // 네이티브 모듈이 로드되었는지 확인
    if (!nativeModule) {
      return NextResponse.json({
        success: false,
        error: '네이티브 모듈을 로드할 수 없습니다.',
        timestamp: Date.now()
      }, { status: 400 });
    }

    // GPU 가용성 확인
    const isAvailable = typeof nativeModule.isGpuAccelerationAvailable === 'function'
      ? await nativeModule.isGpuAccelerationAvailable()
      : false;

    if (!isAvailable) {
      return NextResponse.json({
        success: false,
        error: 'GPU 가속화를 사용할 수 없습니다',
        timestamp: Date.now()
      }, { status: 400 });
    }

    // GPU 계산 수행
    const result = await nativeModule.performGpuComputation(
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
