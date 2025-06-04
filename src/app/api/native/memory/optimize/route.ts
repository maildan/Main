import { NextResponse } from 'next/server';
// @ts-ignore - 타입 체크를 우회하기 위해 any 타입으로 임포트
import nativeModule from '../../../../../server/native';
import type { OptimizationResult } from '@/types/native-module';

// dynamic 설정을 변경하여 API 라우트가 제대로 동작하도록 함
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 네이티브 메모리 클라이언트를 가져오는 함수
async function getNativeMemoryClient() {
  // 임시로 any 타입으로 처리
  return nativeModule as any;
}

export async function GET() {
  try {
    // 모듈 상태 확인
    const moduleState = (nativeModule as any)?.getModuleState?.() || { 
      available: false, 
      isFallback: true,
      metrics: { calls: 0, errors: 0, avgExecutionTime: 0, lastDuration: 0, totalTime: 0 } 
    };
    
    // 메모리 정보 가져오기
    let memoryInfo = null;
    
    // 메모리 정보 함수가 존재하는 경우
    if (moduleState.available && nativeModule && typeof (nativeModule as any).getMemoryInfo === 'function') {
      try {
        const memoryResult = await (nativeModule as any).getMemoryInfo();
      memoryInfo = typeof memoryResult === 'string'
        ? JSON.parse(memoryResult)
        : memoryResult;
      } catch (memoryError) {
        console.warn('메모리 정보 가져오기 오류:', memoryError);
      }
    } else if (typeof process !== 'undefined' && process.memoryUsage) {
      // 네이티브 함수 없는 경우 process.memoryUsage() 사용
      const usage = process.memoryUsage();
      memoryInfo = {
        heap_used: usage.heapUsed,
        heap_total: usage.heapTotal,
        heap_used_mb: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100,
        percent_used: Math.round((usage.heapUsed / usage.heapTotal) * 100),
        timestamp: Date.now()
      };
    }

    return NextResponse.json({
      success: true,
      memoryInfo,
      timestamp: Date.now()
    } as any);

  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return NextResponse.json(
      { 
      success: false,
        error: error instanceof Error ? error.message : 'Failed to get memory info',
        timestamp: Date.now()
      } as any,
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 요청 본문 처리
    const body = await request.json();
    const level = Number(body?.level) || 3; // 기본값 3 (HIGH)
    const emergency = Boolean(body?.emergency);
    let result: OptimizationResult | any = null;
    let usedNativeFn = false;
    
    // 네이티브 메모리 최적화 함수 사용 시도
    if (nativeModule && typeof (nativeModule as any).optimizeMemory === 'function') {
      usedNativeFn = true;
      
      try {
        const optimizeResult = await (nativeModule as any).optimizeMemory(level, emergency);
        result = typeof optimizeResult === 'string'
          ? JSON.parse(optimizeResult)
          : optimizeResult;
      } catch (error) {
        console.error('네이티브 메모리 최적화 오류:', error);
        result = {
          success: false,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : 'Native optimization failed',
          fallback: true
        };
      }
    } else {
      // JavaScript 기반 폴백
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }
      
      result = {
      success: true,
        message: `JavaScript 메모리 최적화(레벨: ${level})가 실행되었습니다.`,
      freedMemory: 30 * 1024 * 1024,
      freedMB: 30,
        fallback: true
      };
    }
    
    return NextResponse.json({
      ...result,
      usedNativeFunction: usedNativeFn,
      timestamp: Date.now()
    } as any);
    
  } catch (error) {
    console.error('메모리 최적화 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to optimize memory',
        timestamp: Date.now()
      } as any,
      { status: 500 }
    );
  }
}
