import { NextRequest, NextResponse } from 'next/server';

// output: 'export'를 사용할 때 필요한 설정
export const dynamic = 'force-static';

/**
 * 메모리 설정 가져오기 API
 */
export async function GET(request: NextRequest) {
  try {
    // 서버 측에서 네이티브 모듈 불러오기 시도
    let settings = null;
    let error = null;
    
    try {
      // 실제 구현에서는 서버 측 네이티브 모듈 로드
      // 여기서는 더미 데이터 반환
      settings = {
        gcInterval: 60000,
        memoryLimit: 512,
        aggressive: false
      };
    } catch (e) {
      error = e instanceof Error ? e.message : '네이티브 모듈 로드 실패';
      console.error('메모리 설정 네이티브 모듈 로드 오류:', e);
    }
    
    return NextResponse.json({
      success: !error,
      settings,
      error,
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
 * 메모리 설정 초기화 API
 */
export async function POST(request: NextRequest) {
  try {
    const settingsJson = await request.text();
    let success = false;
    let error = null;
    
    try {
      // 실제 구현에서는 네이티브 모듈 호출
      console.log('메모리 설정 초기화:', settingsJson);
      success = true;
    } catch (e) {
      error = e instanceof Error ? e.message : '네이티브 모듈 호출 실패';
      console.error('메모리 설정 초기화 오류:', e);
    }
    
    return NextResponse.json({
      success,
      error,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('메모리 설정 초기화 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
