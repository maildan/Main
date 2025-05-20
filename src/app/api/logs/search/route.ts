/**
 * 로그 검색 API 엔드포인트
 */

import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { LogEntry, LogSearchOptions, LogType } from '@/app/utils/log-utils';

// output: 'export'를 사용할 때 필요한 설정
export const dynamic = 'force-static';

/**
 * 로그를 검색합니다.
 * 
 * @param request - GET 요청
 * @returns 검색 결과
 */
export async function GET() {
  try {
    // 정적 내보내기를 위해 빈 결과 반환
    // 실제 검색은 클라이언트 측에서 처리
    return NextResponse.json({
      success: true,
      count: 0,
      data: [],
      message: '정적 내보내기 모드에서는 빈 결과가 반환됩니다. 실제 검색은 클라이언트에서 처리해야 합니다.'
    });
  } catch (error) {
    console.error('로그 검색 중 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '로그 검색 중 알 수 없는 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

/**
 * 파일 시스템에서 로그를 검색합니다.
 * 
 * @param options - 검색 옵션
 * @returns 검색된 로그 엔트리 배열
 */
async function searchLogsFromFiles(options: LogSearchOptions): Promise<LogEntry[]> {
  try {
    // 검색할 로그 타입 결정
    const types = Array.isArray(options.type) 
      ? options.type 
      : options.type 
        ? [options.type] 
        : Object.values(LogType);
    
    const allLogs: LogEntry[] = [];
    
    // 각 타입별로 로그 검색
    for (const type of types) {
      const typeDir = join(process.cwd(), 'public', 'logs', type);
      
      try {
        // 디렉토리 목록 가져오기 (날짜별 폴더)
        const dateDirs = await readdir(typeDir);
        
        // 날짜 범위 필터링
        const filteredDirs = dateDirs.filter(dirName => {
          // YYYY-MM-DD 형식의 디렉토리만 처리
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dirName)) return false;
          
          if (options.startTime || options.endTime) {
            const [year, month, day] = dirName.split('-').map(Number);
            const dirDate = new Date(year, month - 1, day).getTime();
            
            if (options.startTime && dirDate < options.startTime) return false;
            if (options.endTime && dirDate > options.endTime) return false;
          }
          
          return true;
        });
        
        // 각 날짜 디렉토리에서 로그 파일 가져오기
        for (const dateDir of filteredDirs) {
          const logsDir = join(typeDir, dateDir);
          
          try {
            const logFiles = await readdir(logsDir);
            
            // 각 로그 파일 처리
            for (const file of logFiles) {
              if (!file.endsWith('.json')) continue;
              
              try {
                const logContent = await readFile(join(logsDir, file), 'utf-8');
                const logEntry = JSON.parse(logContent) as LogEntry;
                
                // 시간 범위 필터링
                if (options.startTime && logEntry.timestamp < options.startTime) continue;
                if (options.endTime && logEntry.timestamp > options.endTime) continue;
                
                // 세션 ID 필터링
                if (options.sessionId && logEntry.sessionId !== options.sessionId) continue;
                
                // 태그 필터링
                if (options.tags && options.tags.length > 0) {
                  if (!logEntry.tags || !options.tags.some(tag => logEntry.tags?.includes(tag))) {
                    continue;
                  }
                }
                
                // 검색 쿼리 필터링
                if (options.query) {
                  const query = options.query.toLowerCase();
                  const content = (logEntry.content || '').toLowerCase();
                  const metadata = logEntry.metadata 
                    ? JSON.stringify(logEntry.metadata).toLowerCase() 
                    : '';
                  
                  if (!content.includes(query) && !metadata.includes(query)) {
                    continue;
                  }
                }
                
                allLogs.push(logEntry);
              } catch (error) {
                console.error(`로그 파일 읽기 오류 (${file}):`, error);
                // 개별 파일 오류는 무시하고 계속 진행
              }
            }
          } catch (error) {
            console.error(`날짜 디렉토리 처리 중 오류 (${dateDir}):`, error);
            // 개별 디렉토리 오류는 무시하고 계속 진행
          }
        }
      } catch (error) {
        console.error(`타입 디렉토리 처리 중 오류 (${type}):`, error);
        // 디렉토리가 없거나 접근할 수 없는 경우 무시하고 계속 진행
      }
    }
    
    // 결과를 타임스탬프 기준 최신순으로 정렬
    allLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    // 페이징 처리
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    
    return allLogs.slice(offset, offset + limit);
  } catch (error) {
    console.error('파일 시스템 로그 검색 중 오류:', error);
    throw error;
  }
}
