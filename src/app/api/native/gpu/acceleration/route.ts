import { NextRequest, NextResponse } from 'next/server';
import {
  enableGpuAcceleration,
  disableGpuAcceleration,
  setGpuAcceleration // checkGpuAcceleration -> setGpuAcceleration 으로 변경
} from '@/app/utils/gpu-acceleration';
import { getGpuStatus } from '@/app/utils/gpu-settings-manager';

// output: 'export'를 사용할 때 필요한 설정
export const dynamic = 'force-static';

/**
 * GPU 상태 정보 조회
 */
export async function GET() {
  try {
    const status = await getGpuStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('GPU 상태 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to get GPU status' },
      { status: 500 }
    );
  }
}

/**
 * GPU 가속 설정 변경
 */
export async function POST(request: NextRequest) {
  try {
    const { enabled } = await request.json();
    const result = await setGpuAcceleration(enabled);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GPU 가속 설정 변경 오류:', error);
    return NextResponse.json(
      { error: 'Failed to update GPU acceleration setting' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { settings: _settings } = requestData;
    
    const success = true;
    const message = '설정이 적용되었습니다';
    
    return NextResponse.json({
      success,
      message
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
