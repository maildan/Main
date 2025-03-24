pub mod types;
pub mod context;
pub mod shader;
pub mod accelerator;

// 다른 모듈에서 필요한 함수들을 여기서 re-export
// 이렇게 하면 crate::gpu:: 경로에서 직접 접근 가능
pub use accelerator::{
    cleanup_unused_gpu_resources,
    clear_shader_caches,
    release_all_gpu_resources
};

// 다른 함수들도 필요에 따라 re-export
pub use context::is_gpu_initialized;
pub use context::check_gpu_availability as is_gpu_acceleration_available;
pub use context::initialize_gpu_context as enable_gpu_acceleration;

use napi_derive::napi;
use napi::Error;
use std::sync::atomic::{AtomicBool, Ordering};
use parking_lot::Mutex;
use once_cell::sync::OnceCell;
use std::collections::HashMap;
use serde_json::{json, Value};
use types::GpuTaskType;
use crate::memory::settings;
use wgpu;

// GPU 가속 상태
static GPU_ACCELERATION_ENABLED: AtomicBool = AtomicBool::new(false);

// GPU 작업 함수 타입 정의 - 함수 포인터 문제 해결
type GpuTaskFn = fn(&str) -> Result<Value, Error>;

// GPU 작업 함수 맵 - 타입 일관성 문제 해결
static GPU_TASK_FUNCTIONS: OnceCell<Mutex<HashMap<GpuTaskType, GpuTaskFn>>> = OnceCell::new();

/// GPU 가속화 비활성화
pub fn disable_gpu_acceleration() -> Result<bool, Error> {
    // 사용자 설정과 관계없이 현재 GPU 상태 비활성화
    GPU_ACCELERATION_ENABLED.store(false, Ordering::SeqCst);
    
    // 현재 활성화된 GPU 리소스 정리
    if context::is_gpu_initialized() {
        if let Err(e) = cleanup_unused_gpu_resources() {
            log::warn!("GPU 리소스 정리 실패: {}", e);
        }
    }
    
    Ok(true)
}

/// GPU 모듈 초기화
#[napi]
pub fn initialize_gpu_module() -> napi::Result<bool> {
    // 사용자 설정 확인 - 하드웨어 가속화 비활성화 설정이면 초기화 중단
    if !settings::is_hardware_acceleration_enabled() {
        log::info!("사용자 설정에 따라 GPU 가속화가 비활성화되어 있습니다");
        GPU_ACCELERATION_ENABLED.store(false, Ordering::SeqCst);
        return Ok(false);
    }
    
    // GPU 가용성 확인
    let available = context::check_gpu_availability();
    
    if available {
        // 사용 가능한 경우 GPU 컨텍스트 초기화
        if let Err(e) = context::initialize_gpu_context() {
            log::error!("GPU 컨텍스트 초기화 실패: {}", e);
            return Ok(false);
        }
        
        // GPU 작업 함수 맵 초기화 - 캐스팅 문제 해결
        let mut task_map = HashMap::new();
        
        // 모든 함수를 동일한 타입으로 캐스팅하여 추가
        task_map.insert(GpuTaskType::MatrixMultiplication, perform_matrix_multiplication as GpuTaskFn);
        task_map.insert(GpuTaskType::TextAnalysis, perform_text_analysis as GpuTaskFn);
        task_map.insert(GpuTaskType::ImageProcessing, perform_image_processing as GpuTaskFn);
        task_map.insert(GpuTaskType::DataAggregation, perform_data_aggregation as GpuTaskFn);
        task_map.insert(GpuTaskType::PatternDetection, perform_pattern_detection as GpuTaskFn);
        task_map.insert(GpuTaskType::TypingStatistics, perform_typing_statistics as GpuTaskFn);
        
        GPU_TASK_FUNCTIONS.get_or_init(|| Mutex::new(task_map));
    }
    
    // 초기 가속 상태 설정
    GPU_ACCELERATION_ENABLED.store(available, Ordering::SeqCst);
    
    Ok(available)
}

/// GPU 정보 가져오기
#[napi]
pub fn get_gpu_info() -> napi::Result<String> {
    // GPU 가용성 확인
    let available = context::check_gpu_availability();
    let acceleration_enabled = GPU_ACCELERATION_ENABLED.load(Ordering::SeqCst) && settings::is_hardware_acceleration_enabled();
    
    let mut info = if available {
        // GPU 정보 가져오기
        match context::get_gpu_device_info() {
            Ok(device_info) => {
                // GpuDeviceInfo를 직렬화 가능한 형태로 변환
                let device_type_str = match device_info.device_type {
                    wgpu::DeviceType::DiscreteGpu => "DiscreteGpu",
                    wgpu::DeviceType::IntegratedGpu => "IntegratedGpu",
                    wgpu::DeviceType::Cpu => "Cpu",
                    wgpu::DeviceType::Other => "Other",
                    _ => "Unknown",
                };
                
                let backend_str = match device_info.backend {
                    wgpu::Backend::Vulkan => "Vulkan",
                    wgpu::Backend::Metal => "Metal",
                    wgpu::Backend::Dx12 => "DirectX 12",
                    wgpu::Backend::Dx11 => "DirectX 11",
                    wgpu::Backend::Gl => "OpenGL",
                    wgpu::Backend::BrowserWebGpu => "WebGPU",
                    _ => "Unknown",
                };
                
                json!({
                    "name": device_info.name,
                    "vendor": device_info.vendor,
                    "driver_info": device_info.driver_info,
                    "device_type": device_type_str,
                    "backend": backend_str,
                    "available": true,
                    "acceleration_enabled": acceleration_enabled,
                    "settings_enabled": settings::is_hardware_acceleration_enabled(),
                    "processing_mode": settings::get_processing_mode()
                })
            },
            Err(_) => {
                json!({
                    "name": "Unknown GPU",
                    "vendor": "Unknown",
                    "driver_info": "Not available",
                    "device_type": "Unknown",
                    "backend": "Unknown",
                    "available": true,
                    "acceleration_enabled": acceleration_enabled,
                    "settings_enabled": settings::is_hardware_acceleration_enabled(),
                    "processing_mode": settings::get_processing_mode()
                })
            }
        }
    } else {
        // GPU 사용 불가능
        json!({
            "name": "Software Renderer",
            "vendor": "CPU",
            "driver_info": "Software rendering",
            "device_type": "CPU",
            "backend": "CPU",
            "available": false,
            "acceleration_enabled": false,
            "settings_enabled": settings::is_hardware_acceleration_enabled(),
            "processing_mode": settings::get_processing_mode()
        })
    };
    
    // 추가 정보 - 현재 시간 등
    if let Value::Object(ref mut obj) = info {
        obj.insert("timestamp".to_string(), json!(std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64));
    }
    
    // JSON 문자열로 변환하여 반환
    Ok(serde_json::to_string(&info).unwrap_or_else(|_| "{\"error\":\"Failed to serialize GPU info\"}".to_string()))
}

/// GPU 계산 수행 (동기 버전)
#[napi]
pub fn perform_gpu_computation_sync(data: String, computation_type: String) -> napi::Result<String> {
    // 사용자 설정 확인
    if !settings::is_hardware_acceleration_enabled() {
        let result = json!({
            "success": false,
            "task_type": computation_type,
            "duration_ms": 0,
            "result": null,
            "error": "GPU acceleration is disabled in settings",
            "timestamp": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        });
        
        return Ok(serde_json::to_string(&result).unwrap_or_default());
    }

    // GPU 가속이 비활성화된 경우
    if !GPU_ACCELERATION_ENABLED.load(Ordering::SeqCst) {
        let result = json!({
            "success": false,
            "task_type": computation_type,
            "duration_ms": 0,
            "result": null,
            "error": "GPU acceleration is disabled",
            "timestamp": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        });
        
        return Ok(serde_json::to_string(&result).unwrap_or_default());
    }
    
    // 작업 유형 확인
    let task_type = match computation_type.as_str() {
        "matrix" => GpuTaskType::MatrixMultiplication,
        "text" => GpuTaskType::TextAnalysis,
        "image" => GpuTaskType::ImageProcessing,
        "data" => GpuTaskType::DataAggregation,
        "pattern" => GpuTaskType::PatternDetection,
        "typing" => GpuTaskType::TypingStatistics,
        _ => GpuTaskType::Custom,
    };
    
    // 작업 실행
    let start_time = std::time::Instant::now();
    
    let result = if let Some(task_functions) = GPU_TASK_FUNCTIONS.get() {
        let task_map = task_functions.lock();
        
        if let Some(task_fn) = task_map.get(&task_type) {
            // 해당 작업 함수 호출
            match task_fn(&data) {
                Ok(result_value) => {
                    let elapsed = start_time.elapsed();
                    
                    json!({
                        "success": true,
                        "task_type": computation_type,
                        "duration_ms": elapsed.as_millis() as u64,
                        "result": result_value,
                        "error": null,
                        "timestamp": std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as u64
                    })
                },
                Err(e) => {
                    json!({
                        "success": false,
                        "task_type": computation_type,
                        "duration_ms": start_time.elapsed().as_millis() as u64,
                        "result": null,
                        "error": e.to_string(),
                        "timestamp": std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)
                            .unwrap_or_default()
                            .as_millis() as u64
                    })
                }
            }
        } else {
            // 작업 유형이 유효하지 않음
            json!({
                "success": false,
                "task_type": computation_type,
                "duration_ms": 0,
                "result": null,
                "error": format!("Unsupported computation type: {}", computation_type),
                "timestamp": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            })
        }
    } else {
        // GPU 작업 함수 맵이 초기화되지 않음
        json!({
            "success": false,
            "task_type": computation_type,
            "duration_ms": 0,
            "result": null,
            "error": "GPU task functions not initialized",
            "timestamp": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        })
    };
    
    // JSON 문자열로 변환하여 반환
    Ok(serde_json::to_string(&result).unwrap_or_default())
}

/// GPU 계산 수행 (비동기 버전)
#[napi]
pub fn perform_gpu_computation_async(data: String, computation_type: String) -> napi::Result<String> {
    // 동기 버전을 호출하여 결과 반환
    perform_gpu_computation_sync(data, computation_type)
}

/// 행렬 곱셈 계산 구현
fn perform_matrix_multiplication(data: &str) -> Result<Value, Error> {
    // accelerator 모듈의 구현 사용
    accelerator::execute_gpu_task(GpuTaskType::MatrixMultiplication, data)
}

/// 텍스트 분석 구현
fn perform_text_analysis(data: &str) -> Result<Value, Error> {
    // accelerator 모듈의 구현 사용
    accelerator::execute_gpu_task(GpuTaskType::TextAnalysis, data)
}

/// 이미지 처리 구현
fn perform_image_processing(data: &str) -> Result<Value, Error> {
    // accelerator 모듈의 구현 사용
    accelerator::execute_gpu_task(GpuTaskType::ImageProcessing, data)
}

/// 데이터 집계 구현
fn perform_data_aggregation(data: &str) -> Result<Value, Error> {
    // accelerator 모듈의 구현 사용
    accelerator::execute_gpu_task(GpuTaskType::DataAggregation, data)
}

/// 패턴 감지 구현
fn perform_pattern_detection(data: &str) -> Result<Value, Error> {
    // accelerator 모듈의 구현 사용
    accelerator::execute_gpu_task(GpuTaskType::PatternDetection, data)
}

/// 타이핑 통계 분석 구현
fn perform_typing_statistics(data: &str) -> Result<Value, Error> {
    // accelerator 모듈의 구현 사용
    accelerator::execute_gpu_task(GpuTaskType::TypingStatistics, data)
}
