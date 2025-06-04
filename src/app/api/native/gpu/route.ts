import { NextResponse } from 'next/server';
// @ts-ignore - 타입 체크를 우회하기 위해 any 타입으로 임포트
import nativeModule from '../../../../server/native';

// dynamic 설정을 변경하여 API 라우트가 제대로 동작하도록 함
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GPU 관련 네이티브 모듈 존재 여부 확인
function hasGpuNativeModule() {
  return nativeModule && typeof (nativeModule as any).getGpuInfo === 'function';
}

export async function GET() {
  try {
    let gpuInfo = null;
    let isAvailable = false;
    
    // 네이티브 모듈 존재 확인
    if (hasGpuNativeModule()) {
      try {
        // 네이티브 모듈에서 GPU 정보 가져오기
        const result = await (nativeModule as any).getGpuInfo();
        
        // 문자열인 경우 JSON 파싱
        gpuInfo = typeof result === 'string' ? JSON.parse(result) : result;
        isAvailable = gpuInfo && (gpuInfo.available || gpuInfo.acceleration_enabled || gpuInfo.accelerationEnabled);
      } catch (error) {
        console.error('GPU 정보 가져오기 오류:', error);
        // 오류 발생 시 기본값 사용
        gpuInfo = {
          available: false,
          accelerationEnabled: false,
          driver_version: 'unknown',
          device_name: 'unknown',
          error: error instanceof Error ? error.message : 'GPU 정보를 가져오는 중 오류 발생'
        };
      }
    } else {
      // 네이티브 모듈이 없는 경우 기본값
      gpuInfo = {
        available: false,
        accelerationEnabled: false,
        driver_version: 'not available',
        device_name: 'not available',
        message: '네이티브 GPU 모듈이 사용 불가능합니다'
      };
    }
    
    // 응답 반환
    return NextResponse.json({
      success: true,
      gpuInfo,
      hasNativeGpu: hasGpuNativeModule(),
      timestamp: Date.now()
    } as any);
    
  } catch (error) {
    console.error('GPU 정보 처리 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'GPU 정보를 가져오는 중 오류 발생',
        timestamp: Date.now()
      } as any,
      { status: 500 }
    );
  }
}

// GPU 계산 작업 수행
export async function POST(request: Request) {
  try {
    const { task, data } = await request.json();
    let result = null;
    let usedNativeGpu = false;
    
    // GPU 관련 네이티브 모듈 존재 확인
    if (hasGpuNativeModule() && typeof (nativeModule as any).executeGpuTask === 'function') {
      try {
        // 네이티브 모듈을 통해 GPU 작업 실행
        usedNativeGpu = true;
        const taskResult = await (nativeModule as any).executeGpuTask(task, data);
        result = typeof taskResult === 'string' ? JSON.parse(taskResult) : taskResult;
      } catch (error) {
        console.error(`GPU 작업 오류 (${task}):`, error);
        result = {
          success: false,
          task,
          error: error instanceof Error ? error.message : 'GPU 작업 중 오류 발생',
          fallback: true
        };
      }
    } else {
      // 네이티브 모듈이 없는 경우 CPU로 폴백
      console.warn('GPU 네이티브 모듈을 사용할 수 없어 CPU로 대체합니다.');
      result = {
        success: true,
        task,
        result: processCpuFallback(task, data),
        fallback: true,
        message: 'CPU로 처리되었습니다 (GPU 가속 없음)'
      };
    }
    
    return NextResponse.json({
      ...result,
      usedNativeGpu,
      timestamp: Date.now()
    } as any);
    
  } catch (error) {
    console.error('GPU 작업 처리 중 오류:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'GPU 작업 처리 중 오류 발생',
        timestamp: Date.now()
      } as any,
      { status: 500 }
    );
  }
}

// CPU 폴백 처리 함수
function processCpuFallback(task: string, data: any) {
  // 간단한 데이터 처리 로직
  switch (task) {
    case 'TEXT_ANALYSIS':
      return {
        processed: true,
        wordCount: data?.text?.split(/\s+/).length || 0,
        charCount: data?.text?.length || 0
      };
    case 'DATA_AGGREGATION':
      if (Array.isArray(data)) {
        return {
          count: data.length,
          sum: data.reduce((acc, val) => acc + (Number(val) || 0), 0)
        };
      }
      return { processed: true };
    default:
      return {
        processed: true,
        fallbackMode: true
      };
  }
}
