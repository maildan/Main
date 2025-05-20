/**
 * 로그 학습 API 엔드포인트
 */

import { NextResponse } from 'next/server';
import { 
  LearningModelType, 
  learnMemoryUsagePatterns,
  learnUserBehaviorPatterns,
  learnErrorPatterns,
  combineRecommendations
} from '@/app/utils/log-learning';

// output: 'export'를 사용할 때 필요한 설정
export const dynamic = 'force-static';

/**
 * 로그 데이터에서 학습을 수행합니다.
 * 
 * @param request - POST 요청
 * @returns 학습 결과
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { modelTypes, options } = body;
    
    // 요청된 모델 타입 확인
    if (!modelTypes || !Array.isArray(modelTypes) || modelTypes.length === 0) {
      return NextResponse.json(
        { success: false, error: '학습할 모델 타입이 지정되지 않았습니다.' },
        { status: 400 }
      );
    }
    
    const results = [];
    const errors = [];
    
    // 요청된 모든 모델 타입에 대해 학습 수행
    for (const modelType of modelTypes) {
      try {
        let result;
        
        switch (modelType) {
          case LearningModelType.MEMORY_OPTIMIZATION:
            result = await learnMemoryUsagePatterns(options?.memory);
            break;
            
          case LearningModelType.USER_BEHAVIOR:
            result = await learnUserBehaviorPatterns(options?.user);
            break;
            
          case LearningModelType.ERROR_PREDICTION:
            result = await learnErrorPatterns(options?.error);
            break;
            
          default:
            errors.push(`지원하지 않는 모델 타입: ${modelType}`);
            continue;
        }
        
        results.push(result);
      } catch (error) {
        console.error(`${modelType} 모델 학습 중 오류:`, error);
        errors.push(`${modelType} 학습 오류: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // 통합 추천사항 생성
    let combinedRecommendations: string[] = [];
    if (results.length > 1) {
      combinedRecommendations = combineRecommendations(results);
    }
    
    return NextResponse.json({
      success: true,
      results,
      combinedRecommendations: combinedRecommendations.length > 0 ? combinedRecommendations : undefined,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('로그 학습 중 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '로그 학습 중 알 수 없는 오류가 발생했습니다.' 
      },
      { status: 500 }
    );
  }
}

/**
 * 학습 진행 상태를 조회합니다.
 * 
 * @returns 학습 상태
 */
export async function GET() {
  try {
    // 학습 상태 정보를 반환합니다.
    // 실제 구현에서는 학습 진행 상태를 추적하는 로직이 필요합니다.
    return NextResponse.json({
      success: true,
      status: {
        isLearning: false,  // 현재 학습 중인지 여부
        lastLearningTime: null,  // 마지막 학습 완료 시간
        availableModels: Object.values(LearningModelType)  // 사용 가능한 모델 타입
      }
    });
  } catch (error) {
    console.error('학습 상태 조회 중 오류:', error);
    
    return NextResponse.json(
      { success: false, error: '학습 상태 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
