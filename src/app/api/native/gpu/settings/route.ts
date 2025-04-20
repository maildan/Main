import { NextRequest, NextResponse } from 'next/server';
// 절대 경로 별칭 사용
import nativeModule from '@/server/native';

/**
 * GPU 설정 가져오기 API
 */
export async function GET(_request: Request): Promise<NextResponse> {
  try {
    // 서버 측에서 네이티브 모듈 불러오기
    // const nativeModule = require('../../../../../../../native-modules'); // 상대 경로 require 제거

    // GPU 설정 가져오기 (nativeModule이 로드되었는지 확인)
    if (!nativeModule || typeof nativeModule.getGpuInfo !== 'function') { // getGpuInfo 대신 네이티브 모듈에 실제 있는 함수명으로 변경해야 할 수 있음
      throw new Error('네이티브 모듈 또는 GPU 설정 함수를 사용할 수 없습니다.');
    }

    // 실제 네이티브 함수 호출 (함수명 확인 필요)
    // const settingsJson = nativeModule.get_gpu_settings_json(); // 예시 함수명, 실제 함수명으로 변경 필요
    // const settings = JSON.parse(settingsJson);
    const settings = await nativeModule.getGpuInfo(); // getGpuInfo 사용 예시

    return NextResponse.json({
      success: true,
      settings,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 설정 가져오기 API 오류:', error);
    return NextResponse.json({
      success: false,

      settings: null,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

/**
 * GPU 설정 업데이트 API
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const settings = await request.json();

    // 서버 측에서 네이티브 모듈 불러오기
    // const nativeModule = require('../../../../../../../native-modules'); // 상대 경로 require 제거

    // GPU 설정 업데이트 (nativeModule 및 함수 확인)
    if (!nativeModule || typeof nativeModule.performGpuComputation !== 'function') { // performGpuComputation 대신 실제 함수명으로 변경 필요
      throw new Error('네이티브 모듈 또는 GPU 설정 업데이트 함수를 사용할 수 없습니다.');
    }

    // 실제 네이티브 함수 호출 (함수명 및 파라미터 확인 필요)
    // const success = nativeModule.update_gpu_settings_json(settingsJson); // 예시 함수명
    // 예시: GPU 설정을 업데이트하는 특정 계산 수행
    const result = await nativeModule.performGpuComputation(settings, 'updateSettings');
    // 타입 단언 추가: result가 success 속성을 가질 수 있는 객체라고 가정
    const success = (result as { success?: boolean })?.success ?? false;

    return NextResponse.json({
      success,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('GPU 설정 업데이트 API 오류:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
      timestamp: Date.now()
    }, { status: 500 });
  }
}
