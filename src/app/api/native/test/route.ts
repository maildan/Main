import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import nativeModule from '@/server/native';

export async function GET() {
  try {
    // 네이티브 모듈 동적 임포트 (타입 에러 해결)
    // const nativeModuleImport = await import('../../../../server/native').catch(() => ({})); // 상대 경로 주석 처리
    const nativeModuleImport = await import('@/server/native').catch(() => ({})); // 절대 경로 별칭 사용
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

/**
 * 네이티브 모듈 테스트 실행 API (임시)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { testType = 'basic', params = {} } = await request.json();

    if (!nativeModule || typeof nativeModule.getNativeModuleInfo !== 'function') { // getNativeModuleInfo 함수 확인
      throw new Error('네이티브 모듈 또는 테스트 함수를 사용할 수 없습니다.');
    }

    // 임시로 getNativeModuleInfo 호출
    const result = await nativeModule.getNativeModuleInfo(testType, params); // 파라미터는 유지

    return NextResponse.json({ // 성공 응답 반환
      success: true, // 임시로 true 반환
      result
    });
  } catch (error: any) {
    console.error('네이티브 모듈 테스트 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
