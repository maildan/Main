import { NextRequest, NextResponse } from 'next/server';
import { 
  isNativeModuleAvailable,
  isFallbackMode,
  getNativeModuleVersion,
  getNativeModuleInfo
} from '@/server/native';

/**
 * 네이티브 모듈 상태 확인 API
 */
export async function GET(request: NextRequest) {
  try {
    const available = isNativeModuleAvailable();
    const fallbackMode = isFallbackMode();
    const version = getNativeModuleVersion();
    const info = getNativeModuleInfo();
    
    return NextResponse.json({
      available,
      fallbackMode,
      version,
      info,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('네이티브 모듈 상태 확인 API 오류:', error);
    return NextResponse.json({
      available: false,
      fallbackMode: true,
      version: null,
      info: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
