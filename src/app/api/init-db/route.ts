import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/mysql';

// 동적 라우트로 변경
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initializeDatabase();
    return NextResponse.json({ 
      success: true, 
      message: 'DB 초기화 성공' 
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('DB 초기화 오류:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}