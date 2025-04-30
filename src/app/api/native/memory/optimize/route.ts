import { NextResponse } from 'next/server';
import nativeModule from '../../../../../server/native';

export async function GET() {
  try {
    let result;
    let usedNativeFn = false;

    // 네이티브 최적화 함수 사용 시도
    if (nativeModule && typeof nativeModule.optimizeMemory === 'function') {
      try {
        usedNativeFn = true;
        const level = 2; // 중간 수준 최적화
        const emergency = false;

        // 네이티브 최적화 함수 호출
        const optimizeResult = await nativeModule.optimizeMemory(level, emergency);

        // 결과가 JSON 문자열인 경우 파싱
        if (typeof optimizeResult === 'string') {
          result = JSON.parse(optimizeResult);
        } else {
          result = optimizeResult;
        }
      } catch (nativeError) {
        console.error('네이티브 메모리 최적화 오류:', nativeError);
        // 네이티브 함수 실패 시 기본 JavaScript GC 호출
        if (typeof global !== 'undefined' && global.gc) {
          global.gc();
          result = {
            usedJsGc: true,
            timestamp: Date.now()
          };
        } else {
          throw new Error('네이티브 최적화 실패 및 JavaScript GC를 사용할 수 없음');
        }
      }
    } else if (typeof global !== 'undefined' && global.gc) {
      // 네이티브 함수 없는 경우 JavaScript GC 사용
      global.gc();
      result = {
        usedJsGc: true,
        timestamp: Date.now()
      };
    } else {
      result = {
        usedJsGc: false,
        message: 'GC를 직접 호출할 수 없습니다. 기본 메모리 최적화만 수행합니다.',
        timestamp: Date.now()
      };
    }

    // 최적화 후 메모리 정보 가져오기
    let memoryInfo = null;
    if (nativeModule && typeof nativeModule.getMemoryInfo === 'function') {
      const memoryResult = await nativeModule.getMemoryInfo();
      memoryInfo = typeof memoryResult === 'string'
        ? JSON.parse(memoryResult)
        : memoryResult;
    } else if (typeof process !== 'undefined' && process.memoryUsage) {
      // 네이티브 함수 없는 경우 process.memoryUsage() 사용
      const usage = process.memoryUsage();
      memoryInfo = {
        heap_used: usage.heapUsed,
        heap_total: usage.heapTotal,
        heap_used_mb: Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100,
        percent_used: Math.round((usage.heapUsed / usage.heapTotal) * 100)
      };
    }

    return NextResponse.json({
      success: true,
      result,
      memoryInfo,
      usedNativeFunction: usedNativeFn,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('메모리 최적화 처리 중 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
