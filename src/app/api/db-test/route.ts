import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

// output: 'export'를 사용할 때 필요한 설정
export const dynamic = 'force-static';

export async function GET() {
  try {
    const [rows] = await pool.query('SELECT 1+1 AS result');
    return NextResponse.json({ 
      success: true, 
      message: 'DB 연결 성공', 
      result: rows 
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('DB 연결 오류:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}