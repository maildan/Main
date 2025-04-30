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
    pub acceleration_enabled: bool,
    pub profile_name: String,   // 사용 중인 프로필 정보
    pub performance_class: u8,  // 성능 등급 (1: 저사양, 2: 중간, 3: 고사양)
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
    pub timestamp: u64,
}

/// GPU 장치 유형
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DeviceType {
    IntegratedGpu,
    DiscreteGpu,
    SoftwareRendering,
    Cpu,
    Other,
    Unknown,
}

/// GPU 백엔드 유형
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Backend {
    Empty,
    Vulkan,
    Metal,
    Dx12,
    Dx11,
    Gl,
    BrowserWebGpu,
    Software,
}

/// GPU 작업 유형
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum GpuTaskType {
    MatrixMultiplication,
    TextAnalysis,
    ImageProcessing,
    DataAggregation,
    PatternDetection,
    TypingStatistics,
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

/// 워크로드 사이즈 열거형
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum WorkloadSize {
    Small,
    Medium,
    Large,
    Custom(usize),
}

impl WorkloadSize {
    pub fn get_size(&self) -> usize {
        match self {
            WorkloadSize::Small => 1024,
            WorkloadSize::Medium => 4096,
            WorkloadSize::Large => 16384,
            WorkloadSize::Custom(size) => *size,
        }
    }
    
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "small" => WorkloadSize::Small,
            "medium" => WorkloadSize::Medium,
            "large" => WorkloadSize::Large,
            _ => {
                // 문자열을 숫자로 변환 시도
                if let Ok(size) = s.parse::<usize>() {
                    WorkloadSize::Custom(size)
                } else {
                    WorkloadSize::Medium // 기본값
                }
            }
        }
    }
}

/// GPU 성능 정보 - 디바이스 한계와 성능 데이터
#[derive(Debug, Clone)]
pub struct GpuCapabilities {
    pub max_buffer_size: usize,
    pub max_compute_workgroups: [u32; 3],
    pub max_invocations: u32,
    pub supports_timestamp_query: bool,
    pub supports_pipeline_statistics_query: bool,
    pub compute_supported: bool,
    pub shading_supported: bool,
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

/// GPU 계산 결과
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuComputationResult {
    pub success: bool,
    pub task_type: String,
    pub duration_ms: u64,
    pub result: Option<serde_json::Value>,
    pub error: Option<String>,
    pub device_info: Option<String>,
    pub timestamp: u64,
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

/// GPU 기능 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuFeatures {
    pub compute_shader: bool,
    pub float32_filterable: bool,
    pub texture_compression: bool,
    pub multiview: bool,
    pub tensor_cores: bool,
    pub ray_tracing: bool,
}

/// GPU 성능 한계 구조체
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuLimits {
    pub max_compute_workgroups_per_dimension: u32,
    pub max_buffer_size: u64,
    pub max_texture_dimension_2d: u32,
    pub max_workgroup_size: Option<u32>,
    pub max_bindings: Option<u32>,
}

// wgpu와 내부 타입 간 변환 구현
impl From<wgpu::DeviceType> for DeviceType {
    fn from(device_type: wgpu::DeviceType) -> Self {
        match device_type {
            wgpu::DeviceType::IntegratedGpu => DeviceType::IntegratedGpu,
            wgpu::DeviceType::DiscreteGpu => DeviceType::DiscreteGpu,
            wgpu::DeviceType::Cpu => DeviceType::Cpu,
            wgpu::DeviceType::Other => DeviceType::Other,
            _ => DeviceType::Unknown,
        }
    }
}

impl From<wgpu::Backend> for Backend {
    fn from(backend: wgpu::Backend) -> Self {
        match backend {
            wgpu::Backend::Empty => Backend::Empty,
            wgpu::Backend::Vulkan => Backend::Vulkan,
            wgpu::Backend::Metal => Backend::Metal,
            wgpu::Backend::Dx12 => Backend::Dx12,
            wgpu::Backend::Dx11 => Backend::Dx11,
            wgpu::Backend::Gl => Backend::Gl,
            wgpu::Backend::BrowserWebGpu => Backend::BrowserWebGpu,
        }
    }
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
        
        // 성능 등급 추가
        let performance_class = match self.device_type {
            wgpu::DeviceType::DiscreteGpu => 3,
            wgpu::DeviceType::IntegratedGpu => 2,
            _ => 1,
        };
        s.serialize_field("performance_class", &performance_class)?;
        s.serialize_field("timestamp", &self.timestamp)?;
        
        s.end()
    }
}

impl Default for GpuFeatures {
    fn default() -> Self {
        Self {
            compute_shader: false,
            float32_filterable: false,
            texture_compression: false,
            multiview: false,
            tensor_cores: false,
            ray_tracing: false,
        }
    }
}

impl Default for GpuLimits {
    fn default() -> Self {
        Self {
            max_compute_workgroups_per_dimension: 0,
            max_buffer_size: 0,
            max_texture_dimension_2d: 0,
            max_workgroup_size: None,
            max_bindings: None,
        }
    }
}
