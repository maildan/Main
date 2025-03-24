use serde::{Deserialize, Serialize};

/// 메모리 정보 구조체
/// 
/// 시스템의 전반적인 메모리 사용 현황을 나타냅니다.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    /// 현재 사용 중인 힙 메모리 (바이트)
    pub heap_used: u64,
    
    /// 총 할당된 힙 메모리 (바이트)
    pub heap_total: u64,
    
    /// 힙 메모리 최대 제한 (바이트, 옵션)
    pub heap_limit: Option<u64>,
    
    /// Resident Set Size - 물리 메모리 사용량 (바이트)
    pub rss: u64,
    
    /// 외부 메모리 사용량 (바이트, 옵션)
    pub external: Option<u64>,
    
    /// 사용 중인 힙 메모리 (MB)
    pub heap_used_mb: f64,
    
    /// RSS 메모리 (MB)
    pub rss_mb: f64,
    
    /// 힙 사용률 (%)
    pub percent_used: f64,
    
    /// 측정 시간 (UNIX 타임스탬프, 밀리초)
    pub timestamp: u64,
}

/// 메모리 최적화 수준
/// 
/// 메모리 사용 상황에 따라 필요한 최적화 수준을 정의합니다.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OptimizationLevel {
    /// 정상 상태: 최적화 필요 없음
    Normal = 0,
    
    /// 낮은 수준: 기본적인 최적화 필요
    Low = 1,
    
    /// 중간 수준: 적극적인 최적화 권장
    Medium = 2,
    
    /// 높은 수준: 높은 우선순위의 최적화 필요
    High = 3,
    
    /// 위험 수준: 긴급 메모리 복구 필요
    Critical = 4,
}

/// 최적화 결과 구조체
/// 
/// 메모리 최적화 작업의 결과를 담습니다.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    /// 성공 여부
    pub success: bool,
    
    /// 적용된 최적화 수준
    pub optimization_level: OptimizationLevel,
    
    /// 최적화 전 메모리 상태
    pub memory_before: Option<MemoryInfo>,
    
    /// 최적화 후 메모리 상태
    pub memory_after: Option<MemoryInfo>,
    
    /// 해제된 메모리 (바이트)
    pub freed_memory: Option<u64>,
    
    /// 해제된 메모리 (MB)
    pub freed_mb: Option<u64>,
    
    /// 소요 시간 (밀리초)
    pub duration: Option<u64>,
    
    /// 타임스탬프 (UNIX 밀리초)
    pub timestamp: u64,
    
    /// 오류 메시지 (실패 시)
    pub error: Option<String>,
}

/// 가비지 컬렉션 결과 구조체
/// 
/// GC 수행 결과를 담습니다.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GCResult {
    /// 성공 여부
    pub success: bool,
    
    /// 타임스탬프 (UNIX 밀리초)
    pub timestamp: u64,
    
    /// 해제된 메모리 (바이트)
    pub freed_memory: Option<u64>,
    
    /// 해제된 메모리 (MB)
    pub freed_mb: Option<u64>,
    
    /// 소요 시간 (밀리초)
    pub duration: Option<u64>,
    
    /// 오류 메시지 (실패 시)
    pub error: Option<String>,
}

/// 메모리 임계값 설정
/// 
/// 메모리 사용량 모니터링 및 최적화 전략에 사용되는 임계값입니다.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryThresholds {
    /// 낮은 메모리 경고 임계값 (바이트)
    pub low_memory_threshold: u64,
    
    /// 위험 메모리 경고 임계값 (바이트)
    pub critical_memory_threshold: u64,
    
    /// 최대 메모리 사용률 (%)
    pub max_memory_percentage: f64,
    
    /// 최적화 간격 (밀리초)
    pub optimization_interval: u64,
}

impl Default for MemoryThresholds {
    fn default() -> Self {
        Self {
            // 기본 임계값 설정
            low_memory_threshold: 100 * 1024 * 1024, // 100MB
            critical_memory_threshold: 500 * 1024 * 1024, // 500MB
            max_memory_percentage: 80.0, // 80%
            optimization_interval: 60000, // 1분
        }
    }
}

/// 메모리 풀 설정
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryPoolConfig {
    /// 초기 메모리 풀 크기 (바이트)
    pub initial_size: u64,
    
    /// 풀 확장 단위 (바이트)
    pub expansion_unit: u64,
    
    /// 최대 풀 크기 (바이트)
    pub max_size: u64,
    
    /// 풀 정리 간격 (밀리초)
    pub cleanup_interval: u64,
}

/// 메모리 풀 통계
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryPoolStats {
    /// 총 할당된 메모리 (바이트)
    pub total_allocated: u64,
    
    /// 총 해제된 메모리 (바이트)
    pub total_freed: u64,
    
    /// 현재 사용량 (바이트)
    pub current_usage: u64,
    
    /// 풀 개수
    pub pool_count: usize,
    
    /// 타임스탬프 (UNIX 밀리초)
    pub timestamp: u64,
    
    /// 재사용 횟수
    pub reuse_count: u64,
    
    /// 캐시 히트율 (%)
    pub cache_hit_rate: f64,
    
    /// 세부 풀 통계
    pub pools: Vec<PoolDetail>,
}

/// 풀 세부 정보
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolDetail {
    /// 풀 이름
    pub name: String,
    
    /// 객체 크기 (바이트)
    pub object_size: u64,
    
    /// 현재 활성 객체 수
    pub active_objects: usize,
    
    /// 대기 중인 객체 수
    pub available_objects: usize,
    
    /// 총 할당 횟수
    pub allocations: u64,
}
