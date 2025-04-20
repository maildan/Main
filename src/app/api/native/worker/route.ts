import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkerPoolStats as getPoolStats, // 이름 변경
  submitTask,
  shutdownWorkerPool as shutdownPool // 이름 변경
} from '@/main/workers'; // import 경로 수정
// import nativeModule from '@/server/native'; // native 모듈은 워커 로직에 직접 사용되지 않음
// 모듈 경로 수정 (가능한 대안들)
// import { workerPool } from '@/utils/worker-pool';
// 또는 아래 경로들 중 적합한 것 사용
// import { workerPool } from '@/app/lib/worker-pool';
// import { workerPool } from '@/lib/worker-pool';
// import { workerPool } from '../../../utils/worker-pool';

// 또는 임시로 workerPool 모듈을 직접 정의
const workerPool = {
  initialize: (threadCount: number = 2) => true,
  shutdown: () => true,
  submitTask: async (taskType: string, data: string) => ({ success: true }),
  getStats: () => ({ activeWorkers: 0, pendingTasks: 0, completedTasks: 0 })
};

// 기존 코드는 동일하게 유지
const {
  initialize: initializeWorkerPool,
  shutdown: shutdownWorkerPool,
  submitTask: workerPoolSubmitTask,
  getStats: getWorkerPoolStats
} = workerPool;

/**
 * 워커 풀 상태 확인 API
 */
export async function GET(): Promise<NextResponse> {
  try {
    // const threadCount = nativeModule.getWorkerThreadCount(); // 사용하지 않음
    const stats = getPoolStats(); // 변경된 이름 사용
    return NextResponse.json({
      success: true,
      stats,
      timestamp: Date.now()
    });
  } catch (error: any) {
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
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { taskType, data } = await request.json();

    if (!taskType || !data) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 요청 파라미터',
        timestamp: Date.now()
      }, { status: 400 });
    }

    const result = await submitTask(taskType, data); // 원래 함수 호출로 복원 (data는 JSON 객체 그대로 전달 가정)

    return NextResponse.json({
      success: true,
      result,
      timestamp: Date.now()
    });
  } catch (error: any) {
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

/**
 * 워커 종료 API (모든 워커 종료)
 */
export async function DELETE(_request: NextRequest): Promise<NextResponse> {
  try {
    await shutdownPool(); // 변경된 이름 사용
    return NextResponse.json({
      success: true,
      message: '모든 워커 종료됨',
    });
  } catch (error: any) {
    console.error('워커 종료 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
