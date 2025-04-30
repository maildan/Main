import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/mysql';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      content, 
      keyCount, 
      typingTime, 
      timestamp, 
      windowTitle,
      // 아래 변수들은 현재 사용되지 않지만 나중에 사용될 수 있으므로 주석 처리합니다
      // totalChars,
      // totalCharsNoSpace,
      // totalWords,
      // pages,
      // accuracy
    } = body;

    // 데이터베이스에 추가 필드를 저장하기 위한 SQL 쿼리 (기존 테이블 구조에 따라 조정 필요)
    // 기존 테이블에 추가 필드가 없다면 알터 테이블을 실행하거나 기존 필드만 저장해야 함
    await pool.query(
      `INSERT INTO typing_logs (content, key_count, typing_time, window_title, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [content, keyCount, typingTime, windowTitle, new Date(timestamp)]
    );

    return NextResponse.json({ 
      success: true,
      message: '데이터가 성공적으로 저장되었습니다.' 
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('DB 저장 오류:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
