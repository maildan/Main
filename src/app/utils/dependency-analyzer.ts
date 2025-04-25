/**
 * 모듈 종속성 분석 유틸리티
 * 
 * 이 파일은 프로젝트 내 모듈 종속성을 분석하고 시각화하는 유틸리티 함수들을 제공합니다.
 * 프로젝트 모듈의 종속성 그래프를 생성하고, 순환 참조를 감지하며, 모듈 간의 관계를
 * 분석하는 데 사용됩니다.
 */

import type { ModuleDependency, ModuleConnection } from './index';

/**
 * 모듈 종속성 분석 결과 인터페이스
 */
export interface DependencyAnalysisResult {
  // 총 모듈 수
  totalModules: number;
  // 순환 참조 수
  circularDependencies: number;
  // 허브 모듈 (많은 모듈에 의해 사용되는 모듈)
  hubModules: Array<{ id: string; name: string; usageCount: number }>;
  // 높은 결합도를 가진 모듈 (많은 모듈에 의존하는 모듈)
  highCouplingModules: Array<{ id: string; name: string; dependencyCount: number }>;
  // 모듈 연결 깊이 (의존성 체인 최대 깊이)
  maxDependencyChainDepth: number;
  // 모듈 그룹화 결과
  moduleGroups: Record<string, string[]>;
  // 잠재적 문제 모듈
  potentialIssues: Array<{
    type: 'circular' | 'high_coupling' | 'single_responsibility_violation' | 'other';
    moduleId: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

/**
 * 모듈 종속성 그래프 분석
 * 주어진 모듈 목록을 기반으로 종속성 관계를 분석합니다.
 * 
 * @param modules 모듈 목록
 * @returns 종속성 분석 결과
 */
export function analyzeDependencyGraph(modules: ModuleDependency[]): DependencyAnalysisResult {
  // 노드 맵 생성
  const nodeMap = new Map<string, ModuleDependency>();
  modules.forEach(module => {
    nodeMap.set(module.id, module);
  });
  
  // 그래프 생성
  const graph = createGraphFromModules(modules);
  
  // 순환 참조 검출
  const cycles = findCircularDependencies(graph);
  
  // 모듈 허브 분석 (in-degree)
  const hubModules = analyzeHubModules(modules);
  
  // 높은 결합도 모듈 분석 (out-degree)
  const highCouplingModules = analyzeHighCouplingModules(modules);
  
  // 모듈 체인 깊이 계산
  const maxDependencyChainDepth = calculateMaxDependencyChain(graph);
  
  // 모듈 그룹화
  const moduleGroups = groupModulesByCategory(modules);
  
  // 잠재적 문제 분석
  const potentialIssues = identifyPotentialIssues(modules, cycles, highCouplingModules);
  
  return {
    totalModules: modules.length,
    circularDependencies: cycles.length,
    hubModules: hubModules.slice(0, 10), // 상위 10개만 반환
    highCouplingModules: highCouplingModules.slice(0, 10), // 상위 10개만 반환
    maxDependencyChainDepth,
    moduleGroups,
    potentialIssues
  };
}

/**
 * 모듈에서 그래프 생성
 */
function createGraphFromModules(modules: ModuleDependency[]): {
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
 * 순환 의존성 찾기
 */
function findCircularDependencies(graph: {
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

  // 모든 노드에서 DFS 시작
  graph.nodes.forEach(node => {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  });

  return cycles;
}

/**
 * 모듈 허브 분석 (많이 사용되는 모듈)
 */
function analyzeHubModules(modules: ModuleDependency[]): Array<{ id: string; name: string; usageCount: number }> {
  // 각 모듈이 다른 모듈에 의해 참조되는 횟수 계산
  const usageCounts = new Map<string, number>();
  
  modules.forEach(module => {
    module.dependencies.forEach(depId => {
      const count = usageCounts.get(depId) || 0;
      usageCounts.set(depId, count + 1);
    });
  });
  
  // 모듈 ID와 이름으로 결과 구성
  const result: Array<{ id: string; name: string; usageCount: number }> = [];
  
  modules.forEach(module => {
    const usageCount = usageCounts.get(module.id) || 0;
    result.push({
      id: module.id,
      name: module.name,
      usageCount
    });
  });
  
  // 사용 횟수 기준 내림차순 정렬
  return result.sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * 높은 결합도 모듈 분석 (많은 모듈에 의존하는 모듈)
 */
function analyzeHighCouplingModules(modules: ModuleDependency[]): Array<{ id: string; name: string; dependencyCount: number }> {
  return modules
    .map(module => ({
      id: module.id,
      name: module.name,
      dependencyCount: module.dependencies.length
    }))
    .sort((a, b) => b.dependencyCount - a.dependencyCount);
}

/**
 * 최대 의존성 체인 깊이 계산
 */
function calculateMaxDependencyChain(graph: {
  nodes: ModuleDependency[];
  edges: ModuleConnection[];
}): number {
  const nodeMap = new Map<string, ModuleDependency>();
  graph.nodes.forEach(node => {
    nodeMap.set(node.id, node);
  });
  
  const memo = new Map<string, number>();
  
  function getChainDepth(nodeId: string, visited = new Set<string>()): number {
    // 순환 참조 방지
    if (visited.has(nodeId)) {
      return 0;
    }
    
    // 메모이제이션 - 이미 계산한 값이 있으면 재사용
    if (memo.has(nodeId)) {
      return memo.get(nodeId) || 0;
    }
    
    const newVisited = new Set(visited);
    newVisited.add(nodeId);
    
    const node = nodeMap.get(nodeId);
    if (!node || node.dependencies.length === 0) {
      return 0;
    }
    
    // 모든 의존성 중 가장 깊은 체인 찾기
    const maxDepth = Math.max(
      ...node.dependencies.map(depId => {
        if (nodeMap.has(depId)) {
          return 1 + getChainDepth(depId, newVisited);
        }
        return 0;
      })
    );
    
    memo.set(nodeId, maxDepth);
    return maxDepth;
  }
  
  // 모든 노드에서 시작하는 체인 중 가장 깊은 것 찾기
  return Math.max(...graph.nodes.map(node => getChainDepth(node.id)));
}

/**
 * 카테고리별 모듈 그룹화
 */
function groupModulesByCategory(modules: ModuleDependency[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  
  // 타입별 그룹화
  modules.forEach(module => {
    if (!groups[module.type]) {
      groups[module.type] = [];
    }
    groups[module.type].push(module.id);
  });
  
  // 카테고리별 서브그룹화 (있는 경우)
  modules.forEach(module => {
    if (module.category) {
      const groupKey = `${module.type}_${module.category}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(module.id);
    }
  });
  
  return groups;
}

/**
 * 잠재적 문제 식별
 */
function identifyPotentialIssues(
  modules: ModuleDependency[],
  cycles: string[][],
  highCouplingModules: Array<{ id: string; name: string; dependencyCount: number }>
): Array<{
  type: 'circular' | 'high_coupling' | 'single_responsibility_violation' | 'other';
  moduleId: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}> {
  const issues: Array<{
    type: 'circular' | 'high_coupling' | 'single_responsibility_violation' | 'other';
    moduleId: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }> = [];
  
  // 순환 참조 문제
  cycles.forEach(cycle => {
    cycle.forEach(moduleId => {
      issues.push({
        type: 'circular',
        moduleId,
        description: `순환 참조 발견: ${cycle.join(' -> ')}`,
        severity: 'high'
      });
    });
  });
  
  // 높은 결합도 문제 (상위 10%)
  const highCouplingThreshold = Math.max(
    10,
    highCouplingModules.length > 0
      ? highCouplingModules[Math.floor(highCouplingModules.length * 0.1)].dependencyCount
      : 0
  );
  
  highCouplingModules
    .filter(m => m.dependencyCount >= highCouplingThreshold)
    .forEach(module => {
      issues.push({
        type: 'high_coupling',
        moduleId: module.id,
        description: `높은 결합도: ${module.dependencyCount}개 모듈에 의존함`,
        severity: module.dependencyCount > 20 ? 'high' : 'medium'
      });
    });
  
  // 단일 책임 원칙 위반 가능성 검사
  modules.forEach(module => {
    // 다양한 타입의 모듈에 의존하는 경우 확인
    const depTypes = new Set<string>();
    module.dependencies.forEach(depId => {
      const dep = modules.find(m => m.id === depId);
      if (dep) {
        depTypes.add(dep.type);
      }
    });
    
    if (depTypes.size > 3 && module.dependencies.length > 15) {
      issues.push({
        type: 'single_responsibility_violation',
        moduleId: module.id,
        description: `단일 책임 원칙 위반 가능성: ${depTypes.size}개 유형의 모듈에 의존함`,
        severity: 'medium'
      });
    }
  });
  
  return issues;
}

/**
 * 모듈 간 결합 강도 측정
 * 두 모듈 간의 결합 강도를 점수화합니다.
 * 
 * @param module1 첫 번째 모듈
 * @param module2 두 번째 모듈
 * @returns 결합 강도 점수 (0-1)
 */
export function calculateCouplingStrength(
  module1: ModuleDependency,
  module2: ModuleDependency
): number {
  // 직접 의존성 확인
  const directDependency = module1.dependencies.includes(module2.id) || 
                           module2.dependencies.includes(module1.id);
  
  if (directDependency) {
    return 1.0;
  }
  
  // 공통 의존성 확인
  const module1Deps = new Set(module1.dependencies);
  const module2Deps = new Set(module2.dependencies);
  
  // 공통 의존성 수
  let commonDeps = 0;
  module1Deps.forEach(dep => {
    if (module2Deps.has(dep)) {
      commonDeps++;
    }
  });
  
  // 타입과 카테고리 유사성
  const sameType = module1.type === module2.type ? 0.3 : 0;
  const sameCategory = module1.category && module1.category === module2.category ? 0.2 : 0;
  
  // 공통 의존성 비율
  const totalUniqueDeps = module1Deps.size + module2Deps.size - commonDeps;
  const commonDepsRatio = totalUniqueDeps > 0 ? commonDeps / totalUniqueDeps : 0;
  
  // 최종 점수 계산 (가중합)
  return Math.min(1.0, commonDepsRatio * 0.5 + sameType + sameCategory);
}

/**
 * 모듈 계층 구조 분석
 * 모듈 간의 계층적 관계를 분석하여 계층 구조를 추정합니다.
 * 
 * @param modules 모듈 목록
 * @returns 계층 구조 맵 (모듈 ID -> 계층 레벨)
 */
export function analyzeModuleHierarchy(modules: ModuleDependency[]): Map<string, number> {
  const hierarchyLevels = new Map<string, number>();
  const graph = createGraphFromModules(modules);
  
  // 임시 사이클 제거 - 정확한 계층 분석을 위해
  const cycles = findCircularDependencies(graph);
  const ignoreCycleEdges = new Set<string>();
  
  cycles.forEach(cycle => {
    // 각 사이클에서 하나의 엣지를 무시 (브레이크)
    const source = cycle[cycle.length - 2];
    const target = cycle[cycle.length - 1];
    ignoreCycleEdges.add(`${source}->${target}`);
  });
  
  // 의존성 그래프 재구성
  const cleanEdges = graph.edges.filter(edge => 
    !ignoreCycleEdges.has(`${edge.source}->${edge.target}`)
  );
  
  // 시작 노드 (leaf nodes - 어떤 모듈도 의존하지 않는 모듈) 찾기
  const isDependent = new Set<string>();
  cleanEdges.forEach(edge => {
    isDependent.add(edge.target);
  });
  
  const startNodes = graph.nodes
    .filter(node => !isDependent.has(node.id))
    .map(node => node.id);
  
  // BFS를 사용하여 계층 레벨 할당
  const queue: [string, number][] = startNodes.map(id => [id, 0]);
  const visited = new Set<string>();
  
  while (queue.length > 0) {
    const [nodeId, level] = queue.shift()!;
    
    if (visited.has(nodeId)) {
      // 이미 방문한 노드는 더 깊은 레벨로 업데이트
      hierarchyLevels.set(nodeId, Math.max(hierarchyLevels.get(nodeId) || 0, level));
      continue;
    }
    
    visited.add(nodeId);
    hierarchyLevels.set(nodeId, level);
    
    // 이 노드에서 출발하는 엣지 찾기
    const outgoingEdges = cleanEdges.filter(edge => edge.source === nodeId);
    
    outgoingEdges.forEach(edge => {
      queue.push([edge.target, level + 1]);
    });
  }
  
  // 방문하지 않은 노드 처리 (사이클이 있는 경우)
  graph.nodes.forEach(node => {
    if (!hierarchyLevels.has(node.id)) {
      hierarchyLevels.set(node.id, 0); // 기본값 할당
    }
  });
  
  return hierarchyLevels;
}

/**
 * 모듈 응집도 분석
 * 모듈의 내부 응집도를 추정합니다.
 * 
 * @param module 분석할 모듈
 * @param allModules 모든 모듈 목록
 * @returns 응집도 점수 (0-1)
 */
export function estimateModuleCohesion(
  module: ModuleDependency,
  allModules: ModuleDependency[]
): number {
  // 1. 모듈의 종속성이 유사한 타입/카테고리인지 확인
  const dependencyModules = allModules.filter(m => 
    module.dependencies.includes(m.id)
  );
  
  if (dependencyModules.length === 0) {
    return 1.0; // 종속성 없음 - 완전 응집
  }
  
  // 타입 일관성 검사
  const types = new Set(dependencyModules.map(m => m.type));
  const typeConsistency = 1 - (types.size - 1) / Math.max(4, dependencyModules.length);
  
  // 카테고리 일관성 검사 (카테고리가 있는 경우만)
  const modulesWithCategory = dependencyModules.filter(m => m.category);
  let categoryConsistency = 1.0;
  
  if (modulesWithCategory.length > 0) {
    const categories = new Set(modulesWithCategory.map(m => m.category));
    categoryConsistency = 1 - (categories.size - 1) / Math.max(4, modulesWithCategory.length);
  }
  
  // 2. 모듈의 의존성 그룹화 - 밀접하게 관련된 의존성은 응집도를 높임
  const dependencyClusters = new Map<string, string[]>();
  dependencyModules.forEach(m => {
    const key = m.type + (m.category ? `-${m.category}` : '');
    if (!dependencyClusters.has(key)) {
      dependencyClusters.set(key, []);
    }
    dependencyClusters.get(key)!.push(m.id);
  });
  
  // 클러스터 수가 적을수록 응집도가 높음
  const clusterCount = dependencyClusters.size;
  const clusterConsistency = 1 - (clusterCount - 1) / Math.max(4, dependencyModules.length);
  
  // 최종 응집도 점수 계산 (가중 평균)
  return typeConsistency * 0.4 + categoryConsistency * 0.3 + clusterConsistency * 0.3;
}

/**
 * D3.js 시각화용 데이터 변환
 * 모듈 그래프를 D3.js 시각화에 적합한 형식으로 변환합니다.
 * 
 * @param modules 모듈 목록
 * @returns D3.js 포맷의 그래프 데이터
 */
export function convertToD3Format(modules: ModuleDependency[]): {
  nodes: Array<{
    id: string;
    name: string;
    group: string;
    value: number;
  }>;
  links: Array<{
    source: string;
    target: string;
    value: number;
  }>;
} {
  const graph = createGraphFromModules(modules);
  
  // 노드 변환
  const nodes = graph.nodes.map(node => ({
    id: node.id,
    name: node.name,
    group: node.type + (node.category ? `-${node.category}` : ''),
    value: node.weight
  }));
  
  // 링크 변환
  const links = graph.edges.map(edge => ({
    source: edge.source,
    target: edge.target,
    value: edge.strength
  }));
  
  return { nodes, links };
} 