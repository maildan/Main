import { NextResponse } from 'next/server';

// 네이티브 모듈 상태 조회
export async function GET() {
  try {
    // 서버 측 네이티브 모듈 가져오기
    const nativeModule = await import('../../../../server/native');
    
    // 네이티브 모듈 가용성 확인
    const isAvailable = nativeModule.default.isNativeModuleAvailable();
    const isFallback = nativeModule.default.isFallbackMode();
    
    // 네이티브 모듈 버전 및 정보 가져오기
    let version = null;
    let info = null;
    
    if (isAvailable) {
      version = nativeModule.default.getNativeModuleVersion();
      info = nativeModule.default.getNativeModuleInfo();
    }
    
    // GPU 가용성 확인
    const gpuAvailable = nativeModule.default.isGpuAccelerationAvailable?.() || false;
    
    return NextResponse.json({
      success: true,
      available: isAvailable,
      fallbackMode: isFallback,
      version,
      info,
      features: {
        memory: isAvailable,
        gpu: gpuAvailable,
        worker: isAvailable && !isFallback
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('네이티브 모듈 상태 조회 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '네이티브 모듈 상태를 조회하는 중 오류가 발생했습니다',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
