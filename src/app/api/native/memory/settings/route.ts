import { NextRequest, NextResponse } from 'next/server';
// import nativeModule from '@/server/native'; // 사용하지 않으므로 주석 처리

/**
 * 메모리 설정 가져오기 API (임시)
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    // 네이티브 모듈 및 함수 확인 (현재 관련 함수 없음)
    // if (!nativeModule || typeof nativeModule.getMemorySettings !== 'function') {
    //   throw new Error('네이티브 모듈 또는 메모리 설정 가져오기 함수를 사용할 수 없습니다.');
    // }

    // 네이티브 함수 호출 (현재 관련 함수 없음)
    // const result = await nativeModule.getMemorySettings();
    // const settings = typeof result === 'string' ? JSON.parse(result) : result;

    // 임시 설정 데이터 반환
    const settings = {
      optimizationLevel: 2,
      autoOptimization: true,
      thresholdMB: 200,
      // ... 기타 임시 설정값
    };
    console.warn('메모리 설정 가져오기 API는 현재 임시 데이터를 반환합니다.');

    return NextResponse.json({
      success: true,
      settings,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('메모리 설정 가져오기 API 오류:', error);
    return NextResponse.json({
      success: false,
      settings: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * 메모리 설정 업데이트 API (다른 라우트로 분리 권장)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const settingsData = await request.json();
    console.log('수신된 메모리 설정 업데이트 요청:', settingsData); // 로그 추가

    // 네이티브 모듈 및 함수 확인 (현재 관련 함수 없음)
    // if (!nativeModule || typeof nativeModule.updateMemorySettings !== 'function') {
    //   throw new Error('네이티브 모듈 또는 메모리 설정 업데이트 함수를 사용할 수 없습니다.');
    // }

    // 네이티브 함수 호출 (현재 관련 함수 없음)
    // const result = await nativeModule.updateMemorySettings(settingsData);
    // const success = (result as { success?: boolean })?.success ?? false;

    // 임시로 항상 성공 반환
    const success = true;
    console.warn('메모리 설정 업데이트 API는 현재 구현되지 않았습니다.');

    return NextResponse.json({ success, timestamp: Date.now() });
  } catch (error) {
    console.error('메모리 설정 업데이트 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }, { status: 500 });
  }
}
