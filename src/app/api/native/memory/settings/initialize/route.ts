import { NextRequest, NextResponse } from 'next/server';

/**
 * 메모리 설정 초기화 API
 */
export const dynamic = 'force-static';

export async function POST(request: NextRequest) {
  try {
    const settingsJson = await request.text();
    
    // 더미 구현
    console.log('메모리 설정 초기화 요청:', settingsJson);
    
    return NextResponse.json({
      success: true,
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
