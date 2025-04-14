/**
 * 새 세션 생성 API
 */
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * 새 세션 ID를 생성하고 반환합니다.
 */
export async function GET() {
  try {
    // 새 세션 ID 생성
    const sessionId = `session_${uuidv4()}`;
    const timestamp = Date.now();
    
    // 세션 데이터 구성
    const sessionData = {
      id: sessionId,
      createdAt: timestamp,
      expiresAt: timestamp + (7 * 24 * 60 * 60 * 1000), // 7일 후 만료
      status: 'active'
    };
    
    return NextResponse.json({
      success: true,
      session: sessionData
    });
  } catch (error) {
    console.error('새 세션 생성 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * 세션 ID와 함께 POST 요청으로 새 세션을 생성합니다.
 */
export async function POST(request: Request) {
  try {
    // 요청 본문에서 세션 정보 추출
    const body = await request.json().catch(() => ({}));
    const { sessionId: providedSessionId, metadata = {} } = body;
    
    // 세션 ID 생성 또는 제공된 ID 사용
    const sessionId = providedSessionId || `session_${uuidv4()}`;
    const timestamp = Date.now();
    
    // 세션 데이터 구성
    const sessionData = {
      id: sessionId,
      createdAt: timestamp,
      expiresAt: timestamp + (7 * 24 * 60 * 60 * 1000), // 7일 후 만료
      status: 'active',
      metadata
    };
    
    return NextResponse.json({
      success: true,
      session: sessionData
    });
  } catch (error) {
    console.error('새 세션 생성 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 