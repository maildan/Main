/**
 * 최적화 레벨 열거형 변환 유틸리티
 * 
 * 타입스크립트 네임스페이스에서 서로 다른 최적화 레벨 열거형 간의
 * 변환을 제공하는 유틸리티 함수들입니다.
 */

import { OptimizationLevel as AppOptimizationLevel } from '@/types';
import { OptimizationLevel as NativeOptimizationLevel } from '@/types/native-module';

/**
 * 애플리케이션 OptimizationLevel을 네이티브 OptimizationLevel로 변환
 */
export function toNativeOptimizationLevel(level: AppOptimizationLevel): NativeOptimizationLevel {
  // 숫자 값으로 변환 후 네이티브 OptimizationLevel 타입으로 캐스팅
  // 이렇게 하면 타입스크립트가 열거형 간의 구조적 차이를 무시함
  const numericLevel = level as number;
  
  switch (numericLevel) {
    case AppOptimizationLevel.NONE:
      return NativeOptimizationLevel.Normal;
    case AppOptimizationLevel.LOW:
      return NativeOptimizationLevel.Low;
    case AppOptimizationLevel.MEDIUM:
      return NativeOptimizationLevel.Medium;
    case AppOptimizationLevel.HIGH:
      return NativeOptimizationLevel.High;
    case AppOptimizationLevel.EXTREME:
      return NativeOptimizationLevel.Critical;
    default:
      return NativeOptimizationLevel.Medium;
  }
}

/**
 * 네이티브 OptimizationLevel을 애플리케이션 OptimizationLevel로 변환
 */
export function toAppOptimizationLevel(level: NativeOptimizationLevel): AppOptimizationLevel {
  // 숫자 값으로 변환 후 앱 OptimizationLevel 타입으로 캐스팅
  const numericLevel = level as number;
  
  switch (numericLevel) {
    case NativeOptimizationLevel.Normal:
      return AppOptimizationLevel.NONE;
    case NativeOptimizationLevel.Low:
      return AppOptimizationLevel.LOW;
    case NativeOptimizationLevel.Medium:
      return AppOptimizationLevel.MEDIUM;
    case NativeOptimizationLevel.High:
      return AppOptimizationLevel.HIGH;
    case NativeOptimizationLevel.Critical:
      return AppOptimizationLevel.EXTREME;
    default:
      return AppOptimizationLevel.MEDIUM;
  }
}
