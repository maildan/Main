/**
 * 메모리 정보를 제공하는 API 라우트
 */

import { NextResponse } from 'next/server';
import { optimizeMemory } from '../../../utils/memory-optimizer';
import { getMemoryUsage } from '../../../utils/memory/memory-info';
import { formatBytes } from '../../../utils/common-utils';

// @ts-ignore - 타입 체크를 우회하기 위해 any 타입으로 임포트
import nativeModule from '../../../../server/native';

// OptimizationLevel 타입 대신 값으로 정의
const OPTIMIZATION_LEVEL = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EXTREME: 'extreme'
} as const;

type OptimizationLevelType = typeof OPTIMIZATION_LEVEL[keyof typeof OPTIMIZATION_LEVEL];

// 동적 API 라우트 설정
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET 핸들러 - 메모리 사용량 정보 조회
 */
export async function GET() {
  try {
    // 기본 메모리 정보 
    let memoryInfo: any = {
      heap_used: 0,
      heap_total: 0,
      heap_used_mb: 0,
      percent_used: 0,
      available: false,
      error: null
    };
    
    // 네이티브 모듈 존재 여부 확인
    if (nativeModule && typeof (nativeModule as any).getMemoryInfo === 'function') {
      try {
        // 네이티브 모듈에서 메모리 정보 가져오기
        const memoryResult = await (nativeModule as any).getMemoryInfo();
        
        // 문자열인 경우 JSON으로 파싱
        memoryInfo = typeof memoryResult === 'string'
          ? JSON.parse(memoryResult)
          : memoryResult;
          
        memoryInfo.available = true;
      } catch (error) {
        console.error('네이티브 메모리 정보 가져오기 오류:', error);
        memoryInfo.error = error instanceof Error ? error.message : '네이티브 메모리 정보 조회 중 오류';
      }
    } else if (typeof process !== 'undefined' && process.memoryUsage) {
      // 네이티브 함수 없는 경우 process.memoryUsage() 사용
      try {
        const usage = process.memoryUsage();
        memoryInfo = {
          heap_used: usage.heapUsed,
          heap_total: usage.heapTotal,
          heap_used_mb: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100,
          percent_used: Math.round((usage.heapUsed / usage.heapTotal) * 100),
          available: true,
          nodeJS: true
        };
      } catch (error) {
        console.error('Node.js 메모리 정보 가져오기 오류:', error);
        memoryInfo.error = error instanceof Error ? error.message : 'Node.js 메모리 정보 조회 중 오류';
      }
    } else {
      memoryInfo.error = '메모리 정보를 가져올 수 있는 방법이 없습니다';
    }
    
    // 타임스탬프 추가
    memoryInfo.timestamp = Date.now();
    
    return NextResponse.json({
      success: !memoryInfo.error,
      memoryInfo,
      timestamp: Date.now()
    } as any);
    
  } catch (error) {
    console.error('메모리 정보 API 처리 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '메모리 정보 처리 중 오류 발생',
        timestamp: Date.now()
      } as any,
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
    
    // 모듈 상태 확인
    const moduleState = (nativeModule as any)?.getModuleState?.() || { 
      available: false, 
      isFallback: true,
      metrics: { calls: 0, errors: 0, avgExecutionTime: 0, lastDuration: 0, totalTime: 0 } 
    };
    
    // 최적화 레벨 검증 - 값으로 정의된 OPTIMIZATION_LEVEL 사용
    const validLevels = Object.values(OPTIMIZATION_LEVEL);
    const optimizationLevel = validLevels.includes(level as OptimizationLevelType)
      ? level
      : OPTIMIZATION_LEVEL.MEDIUM;
    
    let result;
    let usedNative = false;
    
    // 네이티브 모듈이 사용 가능하고 optimizeMemory 함수가 있는 경우 사용
    if (moduleState.available && nativeModule && typeof (nativeModule as any).optimizeMemory === 'function') {
      try {
        usedNative = true;
        // 레벨 매핑: low=1, medium=2, high=3, extreme=4
        const numericLevel = 
          level === OPTIMIZATION_LEVEL.LOW ? 1 :
          level === OPTIMIZATION_LEVEL.HIGH ? 3 :
          level === OPTIMIZATION_LEVEL.EXTREME ? 4 : 2;
        
        const optimizeResult = await (nativeModule as any).optimizeMemory(numericLevel, emergency);
        result = typeof optimizeResult === 'string' ? JSON.parse(optimizeResult) : optimizeResult;
      } catch (nativeError) {
        console.warn('네이티브 메모리 최적화 실패:', nativeError);
        // 폴백: 일반 optimizeMemory 사용
        result = await optimizeMemory(optimizationLevel, emergency);
      }
    } else {
      // 네이티브 모듈 없는 경우 일반 optimizeMemory 사용
      result = await optimizeMemory(optimizationLevel, emergency);
    }
    
    // 최적화 후 메모리 정보 조회
    let memoryInfo = null;
    
    // 네이티브 메모리 정보 가져오기 시도
    if (moduleState.available && nativeModule && typeof (nativeModule as any).getMemoryInfo === 'function') {
      try {
        const memoryResult = await (nativeModule as any).getMemoryInfo();
        memoryInfo = typeof memoryResult === 'string'
          ? JSON.parse(memoryResult)
          : memoryResult;
      } catch (memError) {
        console.warn('네이티브 메모리 정보 가져오기 실패:', memError);
        memoryInfo = await getMemoryUsage();
      }
    } else {
      memoryInfo = await getMemoryUsage();
    }
    
    // memoryInfo가 null인 경우 처리
    if (!memoryInfo) {
      return NextResponse.json({
        success: true,
        result,
        usedNative,
        error: '최적화 후 메모리 정보를 가져올 수 없습니다.',
        timestamp: Date.now()
      });
    }
    
    return NextResponse.json({
      success: true,
      result,
      usedNative,
      memoryInfo: {
        ...memoryInfo,
        heapUsedFormatted: formatBytes(memoryInfo.heapUsed ?? 0),
        heapTotalFormatted: formatBytes(memoryInfo.heapTotal ?? 0),
        rssFormatted: formatBytes(memoryInfo.rss ?? 0)
      },
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error optimizing memory:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
}
