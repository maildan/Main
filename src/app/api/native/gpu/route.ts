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
 * GPU 가속 활성화/비활성화 API
 */
export async function PUT(request: NextRequest) {
  try {
    const { enable = true } = await request.json();
    
    let result;
    if (enable) {
      result = enableGpuAcceleration();
    } else {
      result = disableGpuAcceleration();
    }
    
    return NextResponse.json({
      success: true,
      result,
      enabled: enable,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 활성화/비활성화 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * GPU 계산 수행 API
 */
export async function POST(request: NextRequest) {
  try {
    const { data, computationType } = await request.json();
    
    if (!data || !computationType) {
      return NextResponse.json({
        success: false,
        error: '유효하지 않은 요청 파라미터',
        timestamp: Date.now()
      }, { status: 400 });
    }
    
    const result = await performGpuComputation(data, computationType);
    
    return NextResponse.json({
      success: true,
      result,
      timestamp: Date.now()
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
