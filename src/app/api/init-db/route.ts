import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/mysql';

// output: 'export'를 사용할 때 필요한 설정
export const dynamic = 'force-static';

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