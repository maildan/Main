/**
 * GPU 작업 함수 모듈
 * Rust 네이티브 모듈과 통신하는 함수들을 제공합니다.
 */

import { GpuTaskType } from '@/types';
import { nativeModuleClient } from '../nativeModuleClient';

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

    const result = await nativeModuleClient.performGpuComputation(data, GpuTaskType.MATRIX_MULTIPLICATION);
    return result;
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

    const result = await nativeModuleClient.performGpuComputation(data, GpuTaskType.TEXT_ANALYSIS);
    return result;
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

    const result = await nativeModuleClient.performGpuComputation(data, GpuTaskType.PATTERN_DETECTION);
    return result;
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

    const result = await nativeModuleClient.performGpuComputation(data, GpuTaskType.TYPING_STATISTICS);
    return result;
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
    const testMatrix = [
      [1, 2],
      [3, 4]
    ];

    const computationResult = await nativeModuleClient.performGpuComputation(
      {
        matrix_a: testMatrix,
        matrix_b: testMatrix,
        size: 'small'
      },
      GpuTaskType.MATRIX_MULTIPLICATION
    );

    if (computationResult.success) {
      return {
        available: true,
      };
    } else {
      throw new Error(computationResult.error || 'GPU computation for capability check failed');
    }

  } catch (error) {
    console.warn('GPU 기능 테스트 실패:', error);
    return {
      available: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
}

export async function processDataWithGPU(data: any, taskType: string): Promise<any | null> {
  if (!nativeModuleClient) {
    console.warn('Native module client is not available for GPU processing.');
    return null;
  }

  try {
    const result = await nativeModuleClient.performGpuComputation(data, taskType as unknown as GpuTaskType);
    if (result && result.success) {
      return result;
    } else {
      console.error('GPU computation failed or returned no result:', result?.error);
      return null;
    }
  } catch (error) {
    console.error('Error during GPU computation:', error);
    return null;
  }
}
