import { NextRequest, NextResponse } from 'next/server';

// output: 'export'를 사용할 때 필요한 설정
export const dynamic = 'force-static';

/**
 * 메모리 설정 업데이트 API
 */
export async function POST(request: NextRequest) {
  try {
    const settingsJson = await request.text();
    
    // 더미 구현
    console.log('메모리 설정 업데이트 요청:', settingsJson);
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('메모리 설정 업데이트 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
