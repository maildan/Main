import { NextRequest, NextResponse } from 'next/server';
import { enableGpuAcceleration, disableGpuAcceleration, getGpuAccelerationStatus } from '@/app/utils/gpu-acceleration';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const status = await getGpuAccelerationStatus();
    
    return NextResponse.json({ 
      success: true, 
      enabled: status.enabled,
      available: status.available,
      info: status.info || null
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
      result = await enableGpuAcceleration();
    } else {
      result = await disableGpuAcceleration();
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
    const { settings } = requestData;
    
    // 설정 적용 로직 구현 (임시)
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
