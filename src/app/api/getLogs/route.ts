import { NextResponse } from 'next/server';
import pool from '@/lib/mysql';

// 동적 라우트로 변경
export const dynamic = 'force-dynamic';

// 로그 항목 인터페이스 정의
interface LogEntry {
  id?: number;
  timestamp: string;
  keyCount: number;
  typingTime: number;
  totalChars: number;
  totalWords: number;
  accuracy: number;
  application: string;
  browser?: string;
  website?: string;
}

export async function GET() {
  try {
    // SQL 쿼리 직접 실행
    const [rows] = await pool.query(`
      SELECT * FROM typing_logs 
      ORDER BY timestamp DESC
    `);
    
    return NextResponse.json({ success: true, logs: rows }, { status: 200 });
  } catch (error: unknown) {
    console.error('DB 조회 오류:', error);
    
    // 에러 발생 시 빈 배열 반환
    return NextResponse.json(
      { success: true, logs: [] },
      { status: 200 }
    );
  }
}
