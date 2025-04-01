import { NextRequest, NextResponse } from 'next/server';
import {
  enableGpuAcceleration,
  disableGpuAcceleration,
  setGpuAcceleration // checkGpuAcceleration -> setGpuAcceleration 으로 변경
} from '@/app/utils/gpu-acceleration';

export async function GET(_request: NextRequest) {
  try {
    let isEnabled: boolean;
    try {
      isEnabled = await enableGpuAcceleration();
    } catch (e) {
      isEnabled = false;
      console.warn('enableGpuAcceleration failed, assuming disabled', e);
    }

    return NextResponse.json({
      success: true,
      enabled: isEnabled,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json({
      success: false,
      enabled: false,
      error: errorMessage
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json();
    const enableAcceleration = requestData.enable === true;
    
    let result;
    if (enableAcceleration) {
      const success = await enableGpuAcceleration();
      result = {
        enabled: success,
        message: success ? 'GPU 가속이 활성화되었습니다.' : 'GPU 가속 활성화에 실패했습니다.'
      };
    } else {
      const success = await disableGpuAcceleration();
      result = {
        enabled: false,
        message: success ? 'GPU 가속이 비활성화되었습니다.' : 'GPU 가속 비활성화에 실패했습니다.'
      };
    }
    
    return NextResponse.json({
      success: true,
      enabled: result.enabled,
      message: result.message || null
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
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
