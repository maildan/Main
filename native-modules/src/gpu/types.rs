use serde::{Deserialize, Serialize};
use wgpu;

/// GPU 정보 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuInfo {
    pub name: String,
    pub vendor: String,
    pub driver_info: String,
    pub device_type: String,
    pub backend: String,
    pub available: bool,
    pub profile_name: String,   // 사용 중인 프로필 정보 추가
    pub performance_class: u8,  // 성능 등급 (1: 저사양, 2: 중간, 3: 고사양)
}

/// GPU 태스크 타입
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum GpuTaskType {
    MatrixMultiplication,
    TextAnalysis,
    ImageProcessing,
    DataAggregation,
    PatternDetection,
    TypingStatistics,  // 타이핑 통계 처리 추가
    Custom,
}

/// GPU 워크로드 크기
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, PartialOrd)]
pub enum GpuWorkloadSize {
    Small,
    Medium,
    Large,
    ExtraLarge,
}

/// GPU 계산 결과
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuComputationResult {
    pub success: bool,
    pub task_type: String,
    pub duration_ms: u64,
    pub result: Option<String>,
    pub error: Option<String>,
    pub device_info: Option<String>,
    pub timestamp: u64,
}

/// GPU 디바이스 정보 (내부 사용)
#[derive(Debug, Clone)]
pub struct GpuDeviceInfo {
    pub name: String,
    pub vendor: String,
    pub driver_info: String,
    pub device_type: wgpu::DeviceType,
    pub backend: wgpu::Backend,
}

/// GPU 프로필 - GPU 유형별 성능 설정
#[derive(Debug, Clone)]
pub struct GpuProfile {
    pub name: &'static str,
    pub features: wgpu::Features,
    pub limits: wgpu::Limits,
}

/// GPU 성능 정보 - 디바이스 한계와 성능 데이터
#[derive(Debug, Clone)]
pub struct GpuCapabilities {
    pub max_buffer_size: usize,
    pub max_compute_workgroups: [u32; 3],
    pub max_invocations: u32,
    pub supports_timestamp_query: bool,
    pub supports_pipeline_statistics_query: bool,
}

/// GPU 성능 측정 결과
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuPerformanceMetrics {
    pub execution_time_ms: f64,
    pub memory_used_bytes: u64,
    pub compute_units_used: u32,
    pub power_usage_mw: Option<u32>,
    pub timestamp: u64,
}

// DeviceType과 Backend는 wgpu에서 오는 외부 타입이므로 직접 Serialize 구현
impl Serialize for GpuDeviceInfo {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        
        let mut s = serializer.serialize_struct("GpuDeviceInfo", 6)?;
        s.serialize_field("name", &self.name)?;
        s.serialize_field("vendor", &self.vendor)?;
        s.serialize_field("driver_info", &self.driver_info)?;
        
        // DeviceType을 문자열로 변환
        let device_type_str = match self.device_type {
            wgpu::DeviceType::DiscreteGpu => "DiscreteGpu",
            wgpu::DeviceType::IntegratedGpu => "IntegratedGpu",
            wgpu::DeviceType::Cpu => "Cpu",
            wgpu::DeviceType::Other => "Other",
            _ => "Unknown",
        };
        s.serialize_field("device_type", device_type_str)?;
        
        // Backend를 문자열로 변환
        let backend_str = match self.backend {
            wgpu::Backend::Vulkan => "Vulkan",
            wgpu::Backend::Metal => "Metal",
            wgpu::Backend::Dx12 => "DirectX 12",
            wgpu::Backend::Dx11 => "DirectX 11",
            wgpu::Backend::Gl => "OpenGL",
            wgpu::Backend::BrowserWebGpu => "WebGPU",
            _ => "Unknown",
        };
        s.serialize_field("backend", backend_str)?;

        // 성능 등급 추가 - DeviceType 기반으로 평가
        let performance_class = match self.device_type {
            wgpu::DeviceType::DiscreteGpu => 3,
            wgpu::DeviceType::IntegratedGpu => 2,
            _ => 1,
        };
        s.serialize_field("performance_class", &performance_class)?;
        
        s.end()
    }
}

/// 타이핑 통계 정보
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypingStatistics {
    pub wpm: f64,
    pub kpm: f64,
    pub accuracy: f64,
    pub character_count: usize,
    pub word_count: usize,
    pub duration_seconds: f64,
    pub complexity_score: Option<f64>,
    pub processed_with_gpu: bool,
    pub device_type: String,
}
