/**
 * 메모리 정보를 제공하는 API 라우트
 */

import { NextResponse } from 'next/server';
import { optimizeMemory } from '../../../utils/memory-optimizer';
import { getMemoryUsage } from '../../../utils/memory/memory-info';
import { formatBytes } from '../../../utils/common-utils';
import { OptimizationLevel } from '../../../../types';

/**
 * GET 핸들러 - 메모리 사용량 정보 조회
 */
export async function GET() {
  try {
    const memoryInfo = await getMemoryUsage();
    
    return NextResponse.json({
      success: true,
      data: {
        ...memoryInfo,
        heapUsedFormatted: formatBytes(memoryInfo.heapUsed),
        heapTotalFormatted: formatBytes(memoryInfo.heapTotal),
        rssFormatted: formatBytes(memoryInfo.rss)
      }
    });
  } catch (error) {
    console.error('Error fetching memory info:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST 핸들러 - 메모리 최적화 요청 처리
 */
export async function POST(request: Request) {
  try {
    const { level = 'medium', emergency = false } = await request.json();
    
    // 최적화 레벨 검증
    const optimizationLevel = Object.values(OptimizationLevel).includes(level as OptimizationLevel)
      ? level as OptimizationLevel
      : OptimizationLevel.MEDIUM;
    
    // 메모리 최적화 실행
    const result = await optimizeMemory(optimizationLevel, emergency);
    
    // 최적화 후 메모리 정보 조회
    const memoryInfo = await getMemoryUsage();
    
    return NextResponse.json({
      success: true,
      result,
      memoryInfo: {
        ...memoryInfo,
        heapUsedFormatted: formatBytes(memoryInfo.heapUsed),
        heapTotalFormatted: formatBytes(memoryInfo.heapTotal),
        rssFormatted: formatBytes(memoryInfo.rss)
      }
    });
  } catch (error) {
    console.error('Error optimizing memory:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
