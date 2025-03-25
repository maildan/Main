import { NextRequest, NextResponse } from 'next/server';

/**
 * 메모리 정보 가져오기 API
 */
export async function GET(request: NextRequest) {
  // 성능을 위해 요청 캐싱 구현
  const cacheKey = 'memory-info';
  const cachedData = globalThis.__memoryInfoCache?.get(cacheKey);
  const now = Date.now();
  
  // 최근 캐시된 데이터가 있으면 사용 (100ms 내)
  if (cachedData && (now - cachedData.timestamp < 100)) {
    return NextResponse.json(cachedData.data);
  }
  
  try {
    // 서버 측에서 네이티브 모듈 불러오기
    let nativeModule;
    try {
      nativeModule = require('../../../../../../native-modules');
    } catch (moduleError) {
      console.error('네이티브 모듈 로드 실패:', moduleError);
      return NextResponse.json({
        success: false,
        memoryInfo: null,
        optimizationLevel: 0,
        error: '네이티브 모듈을 로드할 수 없습니다',
        timestamp: Date.now(),
        fallback: true
      }, { status: 500 });
    }
    
    // 메모리 정보 가져오기
    let memoryInfoJson, memoryInfo;
    try {
      memoryInfoJson = nativeModule.get_memory_info();
      memoryInfo = JSON.parse(memoryInfoJson);
    } catch (parseError) {
      console.error('메모리 정보 파싱 실패:', parseError);
      return NextResponse.json({
        success: false,
        memoryInfo: null,
        optimizationLevel: 0,
        error: '메모리 정보를 파싱할 수 없습니다',
        timestamp: Date.now()
      }, { status: 500 });
    }
    
    // 최적화 수준 결정
    let optimizationLevel = 0;
    try {
      optimizationLevel = nativeModule.determine_optimization_level();
    } catch (optimizationError) {
      console.warn('최적화 레벨 결정 실패:', optimizationError);
      // 실패해도 계속 진행 (심각한 오류가 아님)
    }
    
    // 응답 생성
    const response = {
      success: true,
      memoryInfo,
      optimizationLevel,
      timestamp: Date.now()
    };
    
    // 캐시 저장
    if (!globalThis.__memoryInfoCache) {
      globalThis.__memoryInfoCache = new Map();
    }
    globalThis.__memoryInfoCache.set(cacheKey, {
      data: response,
      timestamp: now
    });
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('메모리 정보 가져오기 API 오류:', error);
    return NextResponse.json({
      success: false,
      memoryInfo: null,
      optimizationLevel: 0,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * 메모리 최적화 및 GC API
 */
export async function PUT(request: NextRequest) {
  try {
    const { type, level = 0, emergency = false } = await request.json();
    
    // 서버 측에서 네이티브 모듈 불러오기
    const nativeModule = require('../../../../../../native-modules');
    
    if (type === 'gc') {
      // 가비지 컬렉션 수행
      const gcResultJson = nativeModule.force_garbage_collection();
      const result = JSON.parse(gcResultJson);
      
      return NextResponse.json({
        success: true,
        result,
        timestamp: Date.now()
      });
    } else if (type === 'optimize') {
      // 메모리 최적화 수행
      const optimizationResultJson = nativeModule.optimize_memory(level, emergency);
      const result = JSON.parse(optimizationResultJson);
      
      return NextResponse.json({
        success: true,
        result,
        timestamp: Date.now()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 작업 유형',
        timestamp: Date.now()
      }, { status: 400 });
    }
  } catch (error) {
    console.error('메모리 최적화 API 오류:', error);
    return NextResponse.json({
      success: false,
      result: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
