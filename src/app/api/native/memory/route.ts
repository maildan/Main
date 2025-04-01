/**
 * 메모리 정보를 제공하는 API 라우트
 */

import { NextResponse } from 'next/server';
import { optimizeMemory } from '../../../utils/memory-optimizer';
import { getMemoryUsage } from '../../../utils/memory/memory-info';
import { formatBytes } from '../../../utils/common-utils';

// OptimizationLevel 타입 대신 값으로 정의
const OPTIMIZATION_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EXTREME: 'extreme'
} as const;

type OptimizationLevelType = typeof OPTIMIZATION_LEVEL[keyof typeof OPTIMIZATION_LEVEL];

/**
 * GET 핸들러 - 메모리 사용량 정보 조회
 */
export async function GET() {
  try {
    const memoryInfo = await getMemoryUsage();
    
    // memoryInfo가 null인 경우 처리
    if (!memoryInfo) {
      return NextResponse.json({
        success: false,
        error: '메모리 정보를 가져올 수 없습니다.'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...memoryInfo,
        heapUsedFormatted: formatBytes(memoryInfo.heapUsed ?? 0),
        heapTotalFormatted: formatBytes(memoryInfo.heapTotal ?? 0),
        rssFormatted: formatBytes(memoryInfo.rss ?? 0)
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
    
    // 최적화 레벨 검증 - 값으로 정의된 OPTIMIZATION_LEVEL 사용
    const validLevels = Object.values(OPTIMIZATION_LEVEL);
    const optimizationLevel = validLevels.includes(level as OptimizationLevelType)
      ? level
      : OPTIMIZATION_LEVEL.MEDIUM;
    
    // 메모리 최적화 실행
    const result = await optimizeMemory(optimizationLevel, emergency);
    
    // 최적화 후 메모리 정보 조회
    const memoryInfo = await getMemoryUsage();
    
    // memoryInfo가 null인 경우 처리
    if (!memoryInfo) {
      return NextResponse.json({
        success: true,
        result,
        error: '최적화 후 메모리 정보를 가져올 수 없습니다.'
      });
    }
    
    return NextResponse.json({
      success: true,
      result,
      memoryInfo: {
        ...memoryInfo,
        heapUsedFormatted: formatBytes(memoryInfo.heapUsed ?? 0),
        heapTotalFormatted: formatBytes(memoryInfo.heapTotal ?? 0),
        rssFormatted: formatBytes(memoryInfo.rss ?? 0)
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
