import { NextRequest, NextResponse } from 'next/server';
import { 
  isGpuAccelerationAvailable,
  enableGpuAcceleration,
  disableGpuAcceleration,
  getGpuInfo,
  performGpuComputation
} from '@/server/native';

/**
 * GPU 정보 가져오기 API
 */
export async function GET(request: NextRequest) {
  try {
    const available = isGpuAccelerationAvailable();
    const gpuInfo = getGpuInfo();
    
    return NextResponse.json({
      success: true,
      available,
      gpuInfo,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 정보 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * GPU 가속 상태 변경 API
 */
export async function PUT(request: NextRequest) {
  try {
    const { enable } = await request.json();
    
    let result;
    if (enable === true) {
      result = enableGpuAcceleration();
    } else if (enable === false) {
      result = disableGpuAcceleration();
    } else {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 요청: enable 매개변수가 필요합니다',
        timestamp: Date.now()
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      enabled: enable,
      result
    });
  } catch (error) {
    console.error('GPU 가속 변경 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * GPU 계산 API
 */
export async function POST(request: NextRequest) {
  try {
    const { data, computationType = 'matrix' } = await request.json();
    
    if (!data) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 요청: data 매개변수가 필요합니다',
        timestamp: Date.now()
      }, { status: 400 });
    }
    
    const result = await performGpuComputation(data, computationType);
    
    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'GPU 계산을 수행할 수 없습니다',
        timestamp: Date.now()
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('GPU 계산 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
