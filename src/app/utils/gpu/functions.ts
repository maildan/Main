/**
 * GPU 작업 함수 모듈
 * Rust 네이티브 모듈과 통신하는 함수들을 제공합니다.
 */

import { performGpuComputation } from '../nativeModuleClient';
import { GpuTaskType } from '../nativeModuleClient';

/**
 * 행렬 곱셈 계산
 */
export async function performMatrixMultiplication(
  matrixA: number[][],
  matrixB: number[][],
  options: { size?: string } = {}
) {
  try {
    const data = {
      matrix_a: matrixA,
      matrix_b: matrixB,
      size: options.size || 'medium'
    };
    
    const result = await performGpuComputation(GpuTaskType.MatrixMultiplication, data);
    return result?.result;
  } catch (error) {
    console.error('행렬 곱셈 오류:', error);
    throw error;
  }
}

/**
 * 텍스트 분석 수행
 */
export async function performTextAnalysis(
  text: string,
  options: { size?: string } = {}
) {
  try {
    const data = {
      text,
      size: options.size || 'medium'
    };
    
    const result = await performGpuComputation(GpuTaskType.TextAnalysis, data);
    return result?.result;
  } catch (error) {
    console.error('텍스트 분석 오류:', error);
    throw error;
  }
}

/**
 * 타이핑 패턴 감지
 */
export async function performPatternDetection(
  keyPresses: string[],
  timestamps: number[]
) {
  try {
    const data = {
      keyPresses,
      timestamps
    };
    
    const result = await performGpuComputation(GpuTaskType.PatternDetection, data);
    return result?.result;
  } catch (error) {
    console.error('패턴 감지 오류:', error);
    throw error;
  }
}

/**
 * 타이핑 통계 계산
 */
export async function calculateTypingStatistics(
  keyCount: number,
  typingTime: number,
  errors: number,
  content: string
) {
  try {
    const data = {
      keyCount,
      typingTime,
      errors,
      content
    };
    
    const result = await performGpuComputation(GpuTaskType.TypingStatistics, data);
    return result?.result;
  } catch (error) {
    console.error('타이핑 통계 계산 오류:', error);
    throw error;
  }
}

/**
 * GPU 가용성 체크
 */
export async function checkGpuCapabilities() {
  try {
    // 간단한 행렬 계산으로 GPU 가용성 테스트
    const testMatrix = [
      [1, 2],
      [3, 4]
    ];
    
    const result = await performMatrixMultiplication(
      testMatrix,
      testMatrix,
      { size: 'small' }
    );
    
    return {
      available: true,
      computationTime: result?.computation_time_ms,
      gpuInfo: result?.gpu_info
    };
  } catch (error) {
    console.warn('GPU 기능 테스트 실패:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}
