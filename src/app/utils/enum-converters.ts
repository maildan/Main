/**
 * 최적화 레벨 열거형 변환 유틸리티
 */
import {
  OptimizationLevel
} from '@/types';
import {
  NativeOptimizationLevel,
  APP_TO_NATIVE_LEVEL_MAP,
  NATIVE_TO_APP_LEVEL_MAP
} from '@/types/optimization-level';
import { MemoryUsageLevel } from '@/types';

// MemoryEventType 열거형 선언
export enum MemoryEventType {
  PERIODIC_CHECK = 'periodic_check',
  PAGE_NAVIGATION = 'page_navigation',
  OPTIMIZATION = 'optimization',
  COMPONENT_MOUNT = 'component_mount',
  COMPONENT_UNMOUNT = 'component_unmount',
  USER_ACTION = 'user_action',
  GARBAGE_COLLECTION = 'garbage_collection',
  RESOURCE_LOADING = 'resource_loading',
  ERROR = 'error',
  WARNING = 'warning',
  CUSTOM = 'custom'
}

// GpuTaskType 열거형 선언
export enum GpuTaskType {
  MATRIX_MULTIPLICATION = 0,
  TEXT_ANALYSIS = 1,
  PATTERN_DETECTION = 2,
  IMAGE_PROCESSING = 3,
  DATA_AGGREGATION = 4,
  TYPING_STATISTICS = 5,
  CUSTOM = 6
}

/**
 * 최적화 레벨 문자열을 열거형으로 변환
 * @param level 레벨 문자열 또는 숫자
 */
export function parseOptimizationLevel(level: string | number): OptimizationLevel {
  if (typeof level === 'number') {
    if (level >= 0 && level <= 4) {
      return level as OptimizationLevel;
    }
    return OptimizationLevel.NORMAL;
  }

  switch (level.toLowerCase()) {
    case 'normal':
      return OptimizationLevel.NORMAL;
    case 'low':
      return OptimizationLevel.LOW;
    case 'medium':
      return OptimizationLevel.MEDIUM;
    case 'high':
      return OptimizationLevel.HIGH;
    case 'critical':
      return OptimizationLevel.CRITICAL;
    default:
      // 숫자 문자열인 경우 변환 시도
      const num = parseInt(level, 10);
      if (!isNaN(num) && num >= 0 && num <= 4) {
        return num as OptimizationLevel;
      }
      return OptimizationLevel.NORMAL;
  }
}

/**
 * 최적화 레벨을 사람이 읽기 쉬운 문자열로 변환
 * @param level 최적화 레벨
 */
export function formatOptimizationLevel(level: OptimizationLevel): string {
  switch (level) {
    case OptimizationLevel.NORMAL:
      return '일반';
    case OptimizationLevel.LOW:
      return '낮음';
    case OptimizationLevel.MEDIUM:
      return '중간';
    case OptimizationLevel.HIGH:
      return '높음';
    case OptimizationLevel.CRITICAL:
      return '위험';
    default:
      return '알 수 없음';
  }
}

/**
 * 메모리 이벤트 타입 포맷팅
 */
export function formatMemoryEventType(eventType: MemoryEventType): string {
  switch (eventType) {
    case MemoryEventType.PERIODIC_CHECK:
      return '주기적 확인';
    case MemoryEventType.PAGE_NAVIGATION:
      return '페이지 탐색';
    case MemoryEventType.OPTIMIZATION:
      return '최적화';
    case MemoryEventType.COMPONENT_MOUNT:
      return '컴포넌트 마운트';
    case MemoryEventType.COMPONENT_UNMOUNT:
      return '컴포넌트 언마운트';
    case MemoryEventType.USER_ACTION:
      return '사용자 액션';
    case MemoryEventType.GARBAGE_COLLECTION:
      return '가비지 컬렉션';
    case MemoryEventType.RESOURCE_LOADING:
      return '리소스 로딩';
    case MemoryEventType.ERROR:
      return '오류';
    case MemoryEventType.WARNING:
      return '경고';
    case MemoryEventType.CUSTOM:
      return '사용자 정의';
    default:
      return '알 수 없음';
  }
}

/**
 * GPU 작업 타입 정규화
 */
export function normalizeGpuTaskType(taskType: string | GpuTaskType): string {
  if (typeof taskType === 'number') {
    // 열거형에서 문자열로 변환
    switch (taskType) {
      case GpuTaskType.MATRIX_MULTIPLICATION:
        return 'matrix';
      case GpuTaskType.TEXT_ANALYSIS:
        return 'text';
      case GpuTaskType.PATTERN_DETECTION:
        return 'pattern';
      case GpuTaskType.IMAGE_PROCESSING:
        return 'image';
      case GpuTaskType.DATA_AGGREGATION:
        return 'data';
      case GpuTaskType.TYPING_STATISTICS:
        return 'typing';
      case GpuTaskType.CUSTOM:
        return 'custom';
      default:
        return 'matrix'; // 기본값
    }
  }

  // 이미 문자열인 경우 표준화
  switch (taskType.toLowerCase()) {
    case 'matrix':
    case 'matrixmultiplication':
    case 'matrix-multiplication':
      return 'matrix';
    case 'text':
    case 'textanalysis':
    case 'text-analysis':
      return 'text';
    case 'pattern':
    case 'patterndetection':
    case 'pattern-detection':
      return 'pattern';
    case 'image':
    case 'imageprocessing':
    case 'image-processing':
      return 'image';
    case 'data':
    case 'dataaggregation':
    case 'data-aggregation':
      return 'data';
    case 'typing':
    case 'typingstatistics':
    case 'typing-statistics':
      return 'typing';
    case 'custom':
      return 'custom';
    default:
      return 'matrix'; // 기본값
  }
}

/**
 * 메모리 사용량 레벨 가져오기
 */
export function getMemoryUsageLevel(percentUsed: number): MemoryUsageLevel {
  if (percentUsed >= 90) {
    return MemoryUsageLevel.CRITICAL;
  } else if (percentUsed >= 70) {
    return MemoryUsageLevel.HIGH;
  } else if (percentUsed >= 50) {
    return MemoryUsageLevel.MEDIUM;
  } else {
    return MemoryUsageLevel.LOW;
  }
}

/**
 * 애플리케이션 OptimizationLevel을 네이티브 OptimizationLevel로 변환
 */
export function toNativeOptimizationLevel(level: OptimizationLevel): NativeOptimizationLevel {
  // 매핑 테이블에서 바로 조회 (더 안전하고 직관적임)
  const nativeLevel = APP_TO_NATIVE_LEVEL_MAP[level];

  // 매핑 테이블에 없는 경우 기본값 반환
  if (nativeLevel === undefined) {
    console.warn(`알 수 없는 최적화 레벨 (${level}), 기본값 사용`);
    return NativeOptimizationLevel.Medium;
  }

  return nativeLevel;
}

/**
 * 네이티브 OptimizationLevel을 애플리케이션 OptimizationLevel로 변환
 */
export function toAppOptimizationLevel(level: NativeOptimizationLevel): OptimizationLevel {
  // 매핑 테이블에서 바로 조회 (더 안전하고 직관적임)
  const appLevel = NATIVE_TO_APP_LEVEL_MAP[level];

  // 매핑 테이블에 없는 경우 기본값 반환
  if (appLevel === undefined) {
    console.warn(`알 수 없는 네이티브 최적화 레벨 (${level}), 기본값 사용`);
    return OptimizationLevel.MEDIUM;
  }

  return appLevel as OptimizationLevel;
}

/**
 * 숫자를 적절한 최적화 레벨로 안전하게 변환
 */
export function safeOptimizationLevel(level: number): OptimizationLevel {
  switch (level) {
    case 0: return OptimizationLevel.NORMAL;
    case 1: return OptimizationLevel.LOW;
    case 2: return OptimizationLevel.MEDIUM;
    case 3: return OptimizationLevel.HIGH;
    case 4: return OptimizationLevel.CRITICAL;
    default:
      console.warn(`유효하지 않은 최적화 레벨 (${level}), 기본값 사용`);
      return OptimizationLevel.MEDIUM;
  }
}

/**
 * 타입 변환 유틸리티 - 네이티브 메모리 정보를 앱 메모리 정보로 변환
 */
export function convertNativeMemoryInfo(nativeInfo: any): any {
  if (!nativeInfo) return null;

  return {
    timestamp: nativeInfo.timestamp || Date.now(),
    heap_used: nativeInfo.heap_used,
    heapUsed: nativeInfo.heap_used,
    heap_total: nativeInfo.heap_total,
    heapTotal: nativeInfo.heap_total,
    heap_used_mb: nativeInfo.heap_used_mb,
    heapUsedMB: nativeInfo.heap_used_mb,
    rss: nativeInfo.rss,
    rss_mb: nativeInfo.rss_mb,
    rssMB: nativeInfo.rss_mb,
    percent_used: nativeInfo.percent_used,
    percentUsed: nativeInfo.percent_used,
    heap_limit: nativeInfo.heap_limit,
    heapLimit: nativeInfo.heap_limit
  };
}

/**
 * 타입 변환 유틸리티 - 네이티브 GC 결과를 앱 GC 결과로 변환
 */
export function convertNativeGCResult(nativeResult: any): any {
  if (!nativeResult) return null;

  return {
    success: nativeResult.success,
    timestamp: nativeResult.timestamp || Date.now(),
    freedMemory: nativeResult.freed_memory,
    freed_memory: nativeResult.freed_memory,
    freedMB: nativeResult.freed_mb,
    freed_mb: nativeResult.freed_mb,
    error: nativeResult.error
  };
}

/**
 * 최적화 레벨 변환 함수들
 */
export function getOptimizationLevelFromNumber(level: number): OptimizationLevel {
  switch (level) {
    case 0:
      return OptimizationLevel.NONE;
    case 1:
      return OptimizationLevel.LOW;
    case 2:
      return OptimizationLevel.MEDIUM;
    case 3:
      return OptimizationLevel.HIGH;
    case 4:
      return OptimizationLevel.AGGRESSIVE;
    default:
      return OptimizationLevel.MEDIUM;
  }
}

export function getOptimizationLevelFromString(level: string): OptimizationLevel {
  switch (level.toLowerCase()) {
    case 'none':
      return OptimizationLevel.NONE;
    case 'low':
      return OptimizationLevel.LOW;
    case 'medium':
      return OptimizationLevel.MEDIUM;
    case 'high':
      return OptimizationLevel.HIGH;
    case 'aggressive':
      return OptimizationLevel.AGGRESSIVE;
    default:
      return OptimizationLevel.MEDIUM;
  }
}

// 인덱스 식이 'number' 형식이 아니므로 발생하는 오류 수정
export function getOptimizationLevelName(level: OptimizationLevel): string {
  const names: Record<OptimizationLevel, string> = {
    [OptimizationLevel.NONE]: '없음',
    [OptimizationLevel.LOW]: '낮음',
    [OptimizationLevel.MEDIUM]: '중간',
    [OptimizationLevel.HIGH]: '높음',
    [OptimizationLevel.AGGRESSIVE]: '적극적'
  };

  return names[level] || '중간';
}
