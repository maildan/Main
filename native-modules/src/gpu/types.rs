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
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

// DeviceType과 Backend는 wgpu에서 오는 외부 타입이므로 직접 Serialize 구현
impl Serialize for GpuDeviceInfo {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        
        let mut s = serializer.serialize_struct("GpuDeviceInfo", 5)?;
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
        
        s.end()
    }
}

/// 타이핑 통계 정보
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypingStatistics {
    pub wpm: f64,
    pub accuracy: f64,
    pub key_count: u64,
    pub char_count: usize,
    pub word_count: usize,
    pub typing_time_ms: u64,
    pub consistency_score: f64,
    pub fatigue_score: f64,
}
