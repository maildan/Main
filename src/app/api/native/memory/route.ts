import { NextResponse } from 'next/server';

// 메모리 정보 조회
export async function GET() {
  try {
    // 서버 측 네이티브 모듈 가져오기
    const nativeModule = await import('../../../../server/native');
    
    // 메모리 정보 가져오기
    const memoryInfo = nativeModule.default.getMemoryInfo();
    
    // 최적화 레벨 결정
    const optimizationLevel = nativeModule.default.determineOptimizationLevel();
    
    return NextResponse.json({
      success: true,
      memoryInfo,
      optimizationLevel,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('메모리 정보 가져오기 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '메모리 정보를 가져오는 중 오류가 발생했습니다',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

// 메모리 최적화 작업 수행
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    if (body.type === 'optimize') {
      // 최적화 레벨 (0-4)
      const level = parseInt(body.level || '2', 10);
      const emergency = body.emergency === true;
      
      // 서버 측 네이티브 모듈 가져오기
      const nativeModule = await import('../../../../server/native');
      
      // 메모리 최적화 요청
      const result = await nativeModule.default.optimizeMemory(level, emergency);
      
      return NextResponse.json({
        success: true,
        result,
        timestamp: Date.now()
      });
    } else if (body.type === 'gc') {
      // 가비지 컬렉션 강제 수행
      const nativeModule = await import('../../../../server/native');
      const result = await nativeModule.default.forceGarbageCollection();
      
      return NextResponse.json({
        success: true,
        result,
        timestamp: Date.now()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '지원되지 않는 작업 유형입니다',
        timestamp: Date.now()
      }, { status: 400 });
    }
  } catch (error) {
    console.error('메모리 작업 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '메모리 작업을 수행하는 중 오류가 발생했습니다',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
