import { NextRequest, NextResponse } from 'next/server';
import { 
  initializeWorkerPool,
  shutdownWorkerPool,
  submitTask,
  getWorkerPoolStats
} from '@/server/native';

/**
 * 워커 풀 상태 확인 API
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getWorkerPoolStats();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('워커 풀 상태 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * 작업 제출 API
 */
export async function POST(request: NextRequest) {
  try {
    const { taskType, data } = await request.json();
    
    if (!taskType || !data) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 요청 파라미터',
        timestamp: Date.now()
      }, { status: 400 });
    }
    
    const result = await submitTask(taskType, JSON.stringify(data));
    
    return NextResponse.json({
      success: true,
      result,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('작업 제출 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * 워커 풀 초기화/종료 API
 */
export async function PUT(request: NextRequest) {
  try {
    const { action, threadCount } = await request.json();
    
    if (action === 'initialize') {
      const result = initializeWorkerPool(threadCount || 0);
      return NextResponse.json({
        success: result,
        action: 'initialize',
        timestamp: Date.now()
      });
    } else if (action === 'shutdown') {
      const result = shutdownWorkerPool();
      return NextResponse.json({
        success: result,
        action: 'shutdown',
        timestamp: Date.now()
      });
    } else {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 액션',
        timestamp: Date.now()
      }, { status: 400 });
    }
  } catch (error) {
    console.error('워커 풀 제어 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
