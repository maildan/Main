use serde::{Deserialize, Serialize};

/// 메모리 정보 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryInfo {
    pub heap_used: u64,
    pub heap_total: u64,
    pub heap_limit: Option<u64>,
    pub rss: u64,
    pub external: Option<u64>,
    pub heap_used_mb: f64,
    pub rss_mb: f64,
    pub percent_used: f64,
    pub timestamp: u64,
}

/// 메모리 최적화 수준
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OptimizationLevel {
    Normal = 0,
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4,
}

/// 최적화 결과 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizationResult {
    pub success: bool,
    pub optimization_level: OptimizationLevel,
    pub memory_before: Option<MemoryInfo>,
    pub memory_after: Option<MemoryInfo>,
    pub freed_memory: Option<u64>,
    pub freed_mb: Option<u64>, // f64에서 u64로 변경
    pub duration: Option<u64>,
    pub timestamp: u64,
    pub error: Option<String>,
}

/// 가비지 컬렉션 결과 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GCResult {
    pub success: bool,
    pub timestamp: u64,
    pub freed_memory: Option<u64>,
    pub freed_mb: Option<u64>,
    pub duration: Option<u64>,
    pub error: Option<String>,
}

/// 메모리 임계값 설정
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryThresholds {
    pub low_memory_threshold: u64,
    pub critical_memory_threshold: u64,
    pub max_memory_percentage: f64,
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

/// 메모리 풀 통계
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryPoolStats {
    pub total_allocated: u64,
    pub total_freed: u64,
    pub current_usage: u64,
    pub pool_count: usize,
    pub timestamp: u64,
}
