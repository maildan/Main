use serde::{Serialize, Deserialize};

/// 최적화 레벨 열거형
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum OptimizationLevel {
    /// 기본 최적화 (경량)
    Normal,
    
    /// 낮은 수준 최적화
    Low,
    
    /// 중간 수준 최적화
    Medium,
    
    /// 높은 수준 최적화
    High,
    
    /// 최대 수준 최적화 (긴급 상황용)
    Critical,
}

/// 메모리 정보 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    /// 타임스탬프 (밀리초)
    pub timestamp: u64,
    
    /// 힙 사용량 (바이트)
    pub heap_used: u64,
    
    /// 힙 총량 (바이트)
    pub heap_total: u64,
    
    /// 힙 사용량 (MB)
    pub heap_used_mb: f64,
    
    /// RSS (바이트)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rss: Option<u64>,
    
    /// RSS (MB)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rss_mb: Option<f64>,
    
    /// 사용량 비율 (%)
    pub percent_used: f64,
    
    /// 힙 제한 (바이트, 옵션)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub heap_limit: Option<u64>,
    
    /// 외부 메모리 (바이트, 옵션)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external: Option<u64>,
    
    /// 배열 버퍼 (바이트, 옵션)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub array_buffers: Option<u64>,
}

/// 가비지 컬렉션 결과 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GCResult {
    /// 성공 여부
    pub success: bool,
    
    /// 타임스탬프 (밀리초)
    pub timestamp: u64,
    
    /// 해제된 메모리 (바이트)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub freed_memory: Option<u64>,
    
    /// 해제된 메모리 (MB)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub freed_mb: Option<u64>,
    
    /// 소요 시간 (밀리초)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<u64>,
    
    /// 오류 메시지 (실패 시)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// 최적화 결과 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    /// 성공 여부
    pub success: bool,
    
    /// 최적화 레벨
    pub optimization_level: OptimizationLevel,
    
    /// 최적화 전 메모리 상태
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_before: Option<MemoryInfo>,
    
    /// 최적화 후 메모리 상태
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_after: Option<MemoryInfo>,
    
    /// 해제된 메모리 (바이트)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub freed_memory: Option<u64>,
    
    /// 해제된 메모리 (MB)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub freed_mb: Option<u64>,
    
    /// 소요 시간 (밀리초)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<u64>,
    
    /// 타임스탬프 (밀리초)
    pub timestamp: u64,
    
    /// 오류 메시지 (실패 시)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// 성능 프로파일 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceProfile {
    /// 프로파일 이름
    pub name: String,
    
    /// 작업 유형
    pub task_type: String,
    
    /// 소요 시간 (밀리초)
    pub duration_ms: u64,
    
    /// 메모리 사용량 (바이트)
    pub memory_used: u64,
    
    /// 타임스탬프 (밀리초)
    pub timestamp: u64,
    
    /// 추가 정보
    #[serde(skip_serializing_if = "Option::is_none")]
    pub additional_info: Option<String>,
}

/// 메모리 풀 세부 정보 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolDetail {
    /// 풀 이름
    pub name: String,
    
    /// 객체 크기 (바이트)
    pub object_size: u64,
    
    /// 활성 객체 수
    pub active_objects: usize,
    
    /// 사용 가능한 객체 수
    pub available_objects: usize,
    
    /// 총 할당 횟수
    pub allocations: u64,
}

/// 메모리 풀 통계 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryPoolStats {
    /// 타임스탬프 (밀리초)
    pub timestamp: u64,
    
    /// 총 풀 수
    pub total_pools: usize,
    
    /// 총 할당 횟수
    pub total_allocations: u64,
    
    /// 총 재사용 횟수
    pub total_reuses: u64,
    
    /// 총 회수 횟수
    pub total_reclamations: u64,
    
    /// 현재 메모리 사용량 (바이트)
    pub current_memory_usage: u64,
    
    /// 피크 메모리 사용량 (바이트)
    pub peak_memory_usage: u64,
    
    /// 메모리 절약량 (바이트)
    pub memory_saved: u64,
    
    /// 각 풀 세부 정보
    pub pools: Vec<PoolDetail>,
}
