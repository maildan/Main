import { NextRequest, NextResponse } from 'next/server';
import {
  enableGpuAcceleration,
  disableGpuAcceleration,
  setGpuAcceleration
} from '@/app/utils/gpu-acceleration';
import { getGpuStatus } from '@/app/utils/gpu-settings-manager';

// dynamic 설정을 변경하여 API 라우트가 제대로 동작하도록 함
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
      { error: 'Failed to get GPU status', success: false },
      { status: 500 }
    );
  }
}

/**
 * GPU 가속 설정 변경
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { enabled } = data;
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: enabled must be a boolean', success: false },
        { status: 400 }
      );
    }
    
    const result = await setGpuAcceleration(enabled);
    
    return NextResponse.json({
      success: true,
      enabled: enabled,
      result: result
    });
  } catch (error) {
    console.error('GPU 가속 설정 변경 오류:', error);
    return NextResponse.json(
      { error: 'Failed to update GPU acceleration setting', success: false },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const requestData = await request.json();
    const { settings } = requestData;
    
    if (!settings) {
      return NextResponse.json({
        success: false,
        error: 'Settings object is required'
      }, { status: 400 });
    }
    
    // 설정에 따라 GPU 가속 활성화/비활성화
    if (typeof settings.enabled === 'boolean') {
      const result = await setGpuAcceleration(settings.enabled);
      
      return NextResponse.json({
        success: result,
        message: result ? '설정이 적용되었습니다' : '설정 적용에 실패했습니다',
        enabled: settings.enabled
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid settings format'
    }, { status: 400 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
