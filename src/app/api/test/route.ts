import { NextRequest, NextResponse } from 'next/server';

/**
 * GET 요청 핸들러
 * API가 정상적으로 작동하는지 테스트하기 위한 엔드포인트
 * 
 * @param request NextRequest 객체
 * @returns JSON 응답
 */
export async function GET(request: NextRequest) {
  try {
    // 현재 시간을 포함한 응답 생성
    const response = {
      status: 'success',
      message: 'API가 정상적으로 동작 중입니다.',
      timestamp: new Date().toISOString(),
      method: 'GET',
      path: '/api/test'
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('API 테스트 오류:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: '서버 내부 오류가 발생했습니다.' 
      }, 
      { status: 500 }
    );
  }
}

/**
 * POST 요청 핸들러
 * 
 * @param request NextRequest 객체
 * @returns JSON 응답
 */
export async function POST(request: NextRequest) {
  try {
    let requestData: any = {};
    
    // 요청 본문 읽기 시도
    try {
      requestData = await request.json();
    } catch (e) {
      // 요청 본문이 없거나 JSON이 아닌 경우
    }

    // 요청 데이터를 에코하는 응답 생성
    const response = {
      status: 'success',
      message: '데이터가 성공적으로 수신되었습니다.',
      timestamp: new Date().toISOString(),
      method: 'POST',
      data: requestData,
      path: '/api/test'
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('API 테스트 오류:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: '서버 내부 오류가 발생했습니다.' 
      }, 
      { status: 500 }
    );
  }
}
