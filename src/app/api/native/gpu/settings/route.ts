import { NextRequest, NextResponse } from 'next/server';
import { getGpuSettings, updateGpuSettings } from '@/app/utils/gpu-settings-manager';

/**
 * GPU 설정 가져오기 API
 */
export const dynamic = 'force-static';

export async function GET(request: NextRequest) {
  try {
    const settings = await getGpuSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GPU 설정 조회 오류:', error);
    return NextResponse.json(
      { error: 'Failed to get GPU settings' },
      { status: 500 }
    );
  }
}

/**
 * GPU 설정 업데이트 API
 */
export async function PUT(request: NextRequest) {
  try {
    const settings = await request.json();
    const result = await updateGpuSettings(settings);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GPU 설정 업데이트 오류:', error);
    return NextResponse.json(
      { error: 'Failed to update GPU settings' },
      { status: 500 }
    );
  }
}
