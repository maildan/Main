/**
 * 로그 저장 API 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { LogEntry } from '@/app/utils/log-utils';

// 정적 내보내기 설정 추가
export const dynamic = 'force-static';

/**
 * 로그를 저장합니다.
 * 
 * @param request - POST 요청
 * @returns 저장 결과
 */
export async function POST(request: Request) {
  try {
    // 요청 검증
    if (!request.body) {
      return NextResponse.json(
        { success: false, error: '요청 본문이 없습니다.' },
        { status: 400 }
      );
    }
    
    // 로그 데이터 파싱
    const logEntry = await request.json() as LogEntry;
    
    if (!logEntry.type || !logEntry.timestamp) {
      return NextResponse.json(
        { success: false, error: '필수 로그 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // 로그 저장
    const savedLog = await saveLogToFile(logEntry);
    
    return NextResponse.json({
      success: true,
      message: '로그가 성공적으로 저장되었습니다.',
      data: savedLog
    });
  } catch (error) {
    console.error('로그 저장 중 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '로그 저장 중 알 수 없는 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

/**
 * 로그를 파일 시스템에 저장합니다.
 * 
 * @param logEntry - 저장할 로그 엔트리
 * @returns 저장된 로그 엔트리
 */
async function saveLogToFile(logEntry: LogEntry): Promise<LogEntry> {
  // 로그 저장 디렉토리 경로 생성
  const date = new Date(logEntry.timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // 로그 파일 저장 경로 구성 (public 폴더 하위에 저장)
  const logDir = join(process.cwd(), 'public', 'logs', logEntry.type, `${year}-${month}-${day}`);
  
  // 디렉토리가 없으면 생성
  try {
    await mkdir(dirname(logDir), { recursive: true });
  } catch (error) {
    // 디렉토리가 이미 존재하면 무시
  }
  
  // 파일명 생성 (timestamp + id)
  const fileName = `${logEntry.timestamp}-${logEntry.id || Date.now()}.json`;
  const filePath = join(logDir, fileName);
  
  // 로그를 JSON 형식으로 저장
  await writeFile(filePath, JSON.stringify(logEntry, null, 2), 'utf-8');
  
  return {
    ...logEntry,
    id: logEntry.id || `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
  };
}
