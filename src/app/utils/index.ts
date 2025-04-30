/**
 * 유틸리티 모듈 통합 내보내기
 */

// 공통 유틸리티 함수
export * from './common-utils';

// 메모리 관련 유틸리티 (충돌 항목 제외하고 내보내기)
export * from './memory/hooks';
export * from './memory/gc-utils';
// export * from './memory'; 대신 아래와 같이 명시적 내보내기
import * as memoryModule from './memory';
export {
  // memory 모듈에서 필요한 것들만 선택적으로 내보내기
  // 충돌하는 이름은 제외
  memoryModule
};

// 파일 관련 유틸리티
export * from './file-utils';

// 타입 변환 유틸리티
export * from './type-converters';
// 명시적으로 별칭을 사용하여 내보내기
export { convertNativeMemoryInfo as typeConverterMemoryInfo } from './type-converters';

// 성능 측정 유틸리티
export * from './performance-metrics';

// GPU 가속 유틸리티
export * from './gpu-acceleration';

// 메모리 최적화 유틸리티
export * from './memory-optimizer';
// 명시적으로 별칭을 사용하여 내보내기
export { configureAutoOptimization as memoryOptimizerAutoConfig } from './memory-optimizer';

// 문제가 있던 참조 - 존재하는 모듈로 수정하거나 주석 처리
// export * from './storage-utils'; // 파일이 없으면 주석 처리
// export * from './scroll-utils'; // 파일이 없으면 주석 처리

// 네이티브 모듈 클라이언트
// 충돌 해결을 위해 명시적으로 내보내기
import * as nativeClient from './nativeModuleClient';
export { nativeClient };

// 시스템 모니터링
export * from './system-monitor';

// 추가로 필요한 모듈들이 있다면 여기에 추가

/**
 * 딥 클론 함수
 * 객체의 깊은 복사본을 생성합니다.
 * @param obj 복사할 객체
 * @returns 복사된 객체
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, deepClone(value)])
  ) as T;
}

/**
 * 디바운스 함수
 * 연속적인 함수 호출을 제한합니다.
 * @param fn 실행할 함수
 * @param delay 지연 시간 (ms)
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

/**
 * 쓰로틀 함수
 * 일정 시간 동안 함수 호출을 제한합니다.
 * @param fn 실행할 함수
 * @param limit 제한 시간 (ms)
 */
export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function (...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * 에러 로깅 및 처리
 * @param error 에러 객체
 * @param context 문맥 정보
 */
export function handleError(error: unknown, context = ''): string {
  const message = error instanceof Error
    ? error.message
    : String(error);

  console.error(`[${context}]`, error);

  return message;
}

/**
 * 비동기 대기 함수
 * @param ms 대기 시간 (ms)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 의존성 그래프 생성 유틸리티
 * 프로젝트의 모듈 간 의존성을 파악하기 위한 함수
 */

/**
 * 모듈 의존성 관계를 표현하는 타입
 */
export interface ModuleDependency {
  id: string;
  name: string;
  dependencies: string[];
  dependents: string[];
  type: 'core' | 'util' | 'component' | 'hook' | 'native' | 'other';
  category?: string;
  path: string;
  weight: number; // 의존성 수에 따른 가중치
}

/**
 * 모듈 간 연결 관계를 표현하는 타입
 */
export interface ModuleConnection {
  source: string;
  target: string;
  strength: number;
  type: 'direct' | 'indirect';
}

/**
 * 모듈 의존성 그래프를 생성하는 함수
 * 주의: 이 함수는 런타임이 아닌 빌드/분석 시에만 사용해야 함
 * 
 * @param modules 모듈 목록
 * @returns 의존성 그래프 데이터
 */
export function createDependencyGraph(modules: ModuleDependency[]): {
  nodes: ModuleDependency[];
  edges: ModuleConnection[];
} {
  // 노드 매핑 생성
  const nodeMap = new Map<string, ModuleDependency>();
  modules.forEach(module => {
    nodeMap.set(module.id, module);
  });

  // 엣지 생성
  const edges: ModuleConnection[] = [];
  modules.forEach(module => {
    module.dependencies.forEach(depId => {
      if (nodeMap.has(depId)) {
        edges.push({
          source: module.id,
          target: depId,
          strength: 1,
          type: 'direct'
        });
      }
    });
  });

  return {
    nodes: Array.from(nodeMap.values()),
    edges
  };
}

/**
 * 순환 의존성을 찾는 함수
 * @param graph 의존성 그래프
 * @returns 순환 의존성 목록
 */
export function findCircularDependencies(graph: {
  nodes: ModuleDependency[];
  edges: ModuleConnection[];
}): string[][] {
  const cycles: string[][] = [];
  const nodeMap = new Map<string, ModuleDependency>();
  
  graph.nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });

  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(nodeId: string, path: string[] = []): void {
    if (stack.has(nodeId)) {
      // 순환 의존성 발견
      const cycleStart = path.indexOf(nodeId);
      cycles.push(path.slice(cycleStart).concat(nodeId));
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);

    const node = nodeMap.get(nodeId);
    if (node) {
      node.dependencies.forEach(depId => {
        if (nodeMap.has(depId)) {
          dfs(depId, [...path]);
        }
      });
    }

    stack.delete(nodeId);
  }

  graph.nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  });

  return cycles;
}

/**
 * 모듈의 중심성(허브) 분석
 * 중요한 모듈(허브)을 식별하는 함수
 * 
 * @param graph 의존성 그래프
 * @returns 중요도 순으로 정렬된 모듈 목록
 */
export function analyzeModuleCentrality(graph: {
  nodes: ModuleDependency[];
  edges: ModuleConnection[];
}): Array<{ id: string; name: string; score: number }> {
  const inDegree = new Map<string, number>();
  const outDegree = new Map<string, number>();

  // 각 노드별 진입/진출 차수 계산
  graph.nodes.forEach(node => {
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  });

  graph.edges.forEach(edge => {
    outDegree.set(edge.source, (outDegree.get(edge.source) || 0) + 1);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // 중심성 점수 계산 (진입 차수와 진출 차수의 합)
  const result = graph.nodes.map(node => {
    const inScore = inDegree.get(node.id) || 0;
    const outScore = outDegree.get(node.id) || 0;
    return {
      id: node.id,
      name: node.name,
      score: inScore + outScore
    };
  });

  // 점수 기준 내림차순 정렬
  return result.sort((a, b) => b.score - a.score);
}
