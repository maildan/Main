import { NextRequest } from 'next/server';
import { getNativeModuleInfo, isNativeModuleAvailable, isFallbackModuleAvailable } from '@/server/native';

/**
 * 네이티브 모듈 상태 확인 API
 */
export async function GET(request: NextRequest) {
  try {
    const available = isNativeModuleAvailable();
    const fallbackMode = !available && isFallbackModuleAvailable();
    const info = await getNativeModuleInfo();
    
    return Response.json({
      available,
      fallbackMode,
      version: process.env.APP_VERSION || '0.1.0',
      info,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('네이티브 모듈 상태 확인 중 오류:', error);
    
    return Response.json({
      available: false,
      fallbackMode: false,
      version: process.env.APP_VERSION || '0.1.0',
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
