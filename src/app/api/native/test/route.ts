import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 네이티브 모듈 동적 임포트 (타입 에러 해결)
    const nativeModuleImport = await import('../../../../server/native').catch(() => ({}));
    // 타입 오류 수정: 객체에 default 속성이 있는지 확인 후 접근
    const nativeModule = 'default' in nativeModuleImport
      ? nativeModuleImport.default
      : nativeModuleImport;

    // 네이티브 모듈 확인
    const isLoaded = !!nativeModule;
    // 타입 안전하게 속성 확인 및 함수 호출
    const isFallback = isLoaded &&
      typeof (nativeModule as any).isFallbackMode === 'function'
      ? (nativeModule as any).isFallbackMode()
      : true;

    // 사용 가능한 함수 목록 확인
    const availableFunctions = isLoaded
      ? Object.keys(nativeModule).filter(
        (key) => typeof nativeModule[key as keyof typeof nativeModule] === 'function'
      )
      : [];

    // 버전 확인
    let version = 'unknown';
    if (isLoaded &&
      typeof (nativeModule as any).getNativeModuleVersion === 'function') {
      try {
        version = await (nativeModule as any).getNativeModuleVersion();
      } catch (err) {
        console.warn('버전 확인 실패:', err);
      }
    }

    // 메모리 정보 확인
    let memoryInfo = null;
    if (isLoaded &&
      typeof (nativeModule as any).getMemoryInfo === 'function') {
      try {
        const memoryResult = await (nativeModule as any).getMemoryInfo();
        memoryInfo = typeof memoryResult === 'string'
          ? JSON.parse(memoryResult)
          : memoryResult;
      } catch (error) {
        console.warn('메모리 정보 확인 실패:', error);
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
