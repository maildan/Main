import nativeModule from '@/server/native';
import { NextResponse } from 'next/server';

// 네이티브 모듈 상태 조회
export async function GET() {
  try {
    // 안전하게 함수 존재 여부 확인
    const isAvailable = typeof nativeModule.isNativeModuleAvailable === 'function'
      ? nativeModule.isNativeModuleAvailable()
      : false;

    const isFallback = typeof nativeModule.isFallbackMode === 'function'
      ? nativeModule.isFallbackMode()
      : true;

    let version = null;
    let info = null;

    // 안전하게 함수 호출
    if (typeof nativeModule.getNativeModuleVersion === 'function') {
      version = await nativeModule.getNativeModuleVersion();
    }

    if (typeof nativeModule.getNativeModuleInfo === 'function') {
      info = await nativeModule.getNativeModuleInfo();
    }

    // GPU 가용성 확인
    const gpuAvailable = typeof nativeModule.isGpuAccelerationAvailable === 'function'
      ? await nativeModule.isGpuAccelerationAvailable()
      : false;

    return NextResponse.json({
      success: true,
      available: isAvailable,
      fallbackMode: isFallback,
      version,
      info,
      gpuAvailable,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('네이티브 모듈 상태 확인 오류:', error);
    return NextResponse.json({
      success: false,
      available: false,
      fallbackMode: true,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
