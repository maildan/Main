import { NextResponse } from 'next/server';
import nativeModule from '../../../../server/native';

export async function GET() {
  try {
    // 네이티브 모듈 확인
    const isLoaded = !!nativeModule;
    const isFallback = nativeModule && typeof nativeModule.isFallbackMode === 'function'
      ? nativeModule.isFallbackMode()
      : true;

    // 사용 가능한 함수 목록 확인
    const availableFunctions = isLoaded
      ? Object.keys(nativeModule).filter(
        (key): key is keyof typeof nativeModule =>
          typeof nativeModule[key as keyof typeof nativeModule] === 'function'
      )
      : [];

    // 버전 확인
    let version = 'unknown';
    if (isLoaded && typeof nativeModule.getNativeModuleVersion === 'function') {
      try {
        version = await nativeModule.getNativeModuleVersion();
      } catch (err) {
        console.warn('버전 확인 실패:', err);
      }
    }

    // 메모리 정보 확인
    let memoryInfo = null;
    if (isLoaded && typeof nativeModule.getMemoryInfo === 'function') {
      try {
        const memoryResult = await nativeModule.getMemoryInfo();
        memoryInfo = typeof memoryResult === 'string'
          ? JSON.parse(memoryResult)
          : memoryResult;
      } catch (err) {
        console.warn('메모리 정보 확인 실패:', err);
      }
    }

    return NextResponse.json({
      success: true,
      moduleInfo: {
        isLoaded,
        isFallback,
        availableFunctions,
        version,
        timestamp: Date.now()
      },
      memoryInfo,
    });
  } catch (error) {
    console.error('네이티브 모듈 테스트 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
