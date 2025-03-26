use crate::error::{Error, Result};
use serde::{Serialize, Deserialize};

// 다른 모듈의 함수 사용
use crate::gpu::context;

#[derive(Debug, Serialize, Deserialize)]
pub struct GpuCapabilities {
    pub compute_supported: bool,
    pub shading_supported: bool,
    pub max_compute_size: usize,
    pub max_memory_size: usize,
    pub device_name: String,
    pub device_type: String,
    pub backend_type: String,
}

impl Default for GpuCapabilities {
    fn default() -> Self {
        Self {
            compute_supported: false,
            shading_supported: false,
            max_compute_size: 0,
            max_memory_size: 0,
            device_name: String::from("Unknown"),
            device_type: String::from("Unknown"),
            backend_type: String::from("None"),
        }
    }
}

// GPU 기능을 context 모듈을 통해 가져오는 래퍼 함수
pub fn get_gpu_capabilities() -> Result<GpuCapabilities> {
    // context 모듈의 기능을 사용하여 GPU 기능 정보 생성
    match context::get_gpu_info() {
        Ok(info_json) => {
            // 기본 기능 구성
            let mut caps = GpuCapabilities::default();
            
            // JSON 파싱 시도
            if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&info_json) {
                // JSON에서 필요한 정보 추출
                if let Some(compute) = json_value.get("compute_supported").and_then(|v| v.as_bool()) {
                    caps.compute_supported = compute;
                }
                
                if let Some(device) = json_value.get("device").and_then(|v| v.as_str()) {
                    caps.device_name = device.to_string();
                }
                
                if let Some(backend) = json_value.get("backend").and_then(|v| v.as_str()) {
                    caps.backend_type = backend.to_string();
                }
                
                // 기본값 설정
                caps.shading_supported = true;
                caps.max_compute_size = 64 * 1024 * 1024; // 64MB
                caps.max_memory_size = 1024 * 1024 * 1024; // 1GB
            }
            
            Ok(caps)
        },
        Err(e) => {
            // 오류 시 기본 기능 반환
            Ok(detect_basic_gpu_capabilities()?)
        }
    }
}

// 기본 GPU 기능 감지 함수
fn detect_basic_gpu_capabilities() -> Result<GpuCapabilities> {
    // 기본 기능 구성
    let mut capabilities = GpuCapabilities::default();
    
    // 기본값 설정
    capabilities.compute_supported = true;
    capabilities.shading_supported = true;
    capabilities.max_compute_size = 1024 * 1024; // 1MB
    capabilities.max_memory_size = 128 * 1024 * 1024; // 128MB
    capabilities.device_name = "Generic GPU".to_string();
    capabilities.device_type = "Integrated".to_string();
    capabilities.backend_type = "Software".to_string();
    
    Ok(capabilities)
}

#[cfg(target_os = "windows")]
fn detect_windows_gpu() -> Result<GpuCapabilities> {
    // Windows 환경에서의 GPU 감지 (간단한 구현)
    let mut capabilities = GpuCapabilities::default();
    capabilities.compute_supported = true;
    capabilities.shading_supported = true;
    capabilities.max_compute_size = 64 * 1024 * 1024; // 64MB
    capabilities.max_memory_size = 1024 * 1024 * 1024; // 1GB
    capabilities.device_name = "Windows GPU".to_string();
    capabilities.device_type = "Discrete".to_string();
    capabilities.backend_type = "DirectX".to_string();
    
    Ok(capabilities)
}

// 컨텍스트 생성/관리 래퍼 함수들 - context 모듈 사용

// 컴퓨팅 컨텍스트 생성
pub fn create_compute_context() -> Result<()> {
    // context 모듈의 초기화 함수 사용
    match context::initialize_gpu_context() {
        Ok(_) => Ok(()),
        Err(e) => Err(Error::from_reason(format!("컴퓨팅 컨텍스트 생성 실패: {}", e)))
    }
}

// 렌더링 컨텍스트 생성
pub fn create_rendering_context() -> Result<()> {
    // 이미 초기화되었는지 확인
    if context::is_gpu_initialized() {
        return Ok(());
    }
    
    // 초기화 시도
    match context::initialize_gpu_context() {
        Ok(_) => Ok(()),
        Err(e) => Err(Error::from_reason(format!("렌더링 컨텍스트 생성 실패: {}", e)))
    }
}

// 컨텍스트 정리
pub fn destroy_contexts() -> Result<()> {
    // context 모듈의 정리 함수 사용
    match context::cleanup_gpu_context() {
        Ok(_) => Ok(()),
        Err(e) => Err(Error::from_reason(format!("컨텍스트 정리 실패: {}", e)))
    }
}
