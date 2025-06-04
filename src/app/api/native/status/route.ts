import { NextResponse } from 'next/server';
// @ts-ignore - 타입 체크를 우회하기 위해 any 타입으로 임포트
import nativeModule from '../../../../server/native';

// dynamic 설정을 변경하여 API 라우트가 제대로 동작하도록 함
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// 기본 모듈 상태 타입 (타입 체크 오류 방지용)
interface ModuleStatus {
  available: boolean;
  fallbackMode: boolean;
  version: string;
  features: {
    memory: boolean;
    gpu: boolean;
    worker: boolean;
  };
  timestamp: number;
  [key: string]: any; // 추가적인 속성을 허용하기 위한 인덱스 시그니처
}

// 네이티브 모듈 상태 조회
export async function GET() {
  try {
    // 기본 상태 정의
    const status: ModuleStatus = {
      available: false,
      fallbackMode: true,
      version: 'Unknown',
      features: {
        memory: false,
        gpu: false,
        worker: false
      },
      timestamp: Date.now()
    };
    
    // 네이티브 모듈 가용성 확인
    if (nativeModule) {
      try {
        // 모듈 상태 정보
        const moduleState = typeof (nativeModule as any).getModuleState === 'function'
          ? await (nativeModule as any).getModuleState()
          : { available: false, isFallback: true };
        
        // 모듈 정보
        const moduleInfo = typeof (nativeModule as any).getModuleInfo === 'function'
          ? await (nativeModule as any).getModuleInfo()
          : null;
          
        // 결과 정보 구성
        status.available = moduleState?.available || false;
        status.fallbackMode = moduleState?.isFallback || true;
        status.version = (moduleInfo?.version as string) || 'Unknown';
        
        // 추가 정보 설정 (인덱스 시그니처를 통해 가능)
        if (moduleInfo) {
          status.info = moduleInfo;
    }

        // 기능 가용성 설정
        status.features = {
          memory: typeof (nativeModule as any).getMemoryInfo === 'function' || false,
          gpu: typeof (nativeModule as any).getGpuInfo === 'function' || false,
          worker: typeof (nativeModule as any).executeWorkerTask === 'function' || false
        };
        
        status.timestamp = Date.now();
      } catch (error) {
        console.error('네이티브 모듈 상태 확인 중 오류:', error);
      }
    }
    
    // any로 타입 캐스팅하여 반환
    return NextResponse.json(status as any);
  } catch (error) {
    console.error('API 상태 처리 오류:', error);
    return NextResponse.json(
      {
      available: false,
      fallbackMode: true,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
      } as any,
      { status: 500 }
    );
  }
}
