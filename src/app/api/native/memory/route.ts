import { NextRequest, NextResponse } from 'next/server';
import { 
  getMemoryInfo, 
  determineOptimizationLevel,
  optimizeMemory,
  forceGarbageCollection
} from '@/server/native';

/**
 * 메모리 정보 가져오기 API
 */
export async function GET(request: NextRequest) {
  try {
    const memoryInfo = getMemoryInfo();
    
    if (!memoryInfo) {
      return NextResponse.json({
        success: false,
        error: '메모리 정보를 가져올 수 없습니다',
        timestamp: Date.now()
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      memoryInfo,
      optimizationLevel: determineOptimizationLevel()
    });
  } catch (error) {
    console.error('메모리 정보 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * 메모리 최적화 수행 API
 */
export async function POST(request: NextRequest) {
  try {
    const { level = 2, emergency = false } = await request.json();
    
    const result = await optimizeMemory(level, emergency);
    
    if (!result) {
      return NextResponse.json({
        success: false,
        error: '메모리 최적화를 수행할 수 없습니다',
        timestamp: Date.now()
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('메모리 최적화 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * 가비지 컬렉션 수행 API
 */
export async function PUT(request: NextRequest) {
  try {
    const result = forceGarbageCollection();
    
    if (!result) {
      return NextResponse.json({
        success: false,
        error: '가비지 컬렉션을 수행할 수 없습니다',
        timestamp: Date.now()
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('가비지 컬렉션 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
