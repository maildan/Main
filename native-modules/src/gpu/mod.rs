pub mod types;
pub mod context;
pub mod shader;
pub mod accelerator;

use napi_derive::napi;
use napi::Error;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use parking_lot::Mutex;
use once_cell::sync::OnceCell;
use std::collections::HashMap;
use serde_json::{json, Value};
use types::{GpuInfo, GpuTaskType, GpuComputationResult};

// GPU 가속 상태
static GPU_ACCELERATION_ENABLED: AtomicBool = AtomicBool::new(false);

// GPU 작업 함수 타입 정의 - 함수 포인터 문제 해결
type GpuTaskFn = fn(&str) -> Result<Value, Error>;

// GPU 작업 함수 맵 - 타입 일관성 문제 해결
static GPU_TASK_FUNCTIONS: OnceCell<Mutex<HashMap<GpuTaskType, GpuTaskFn>>> = OnceCell::new();

/// GPU 모듈 초기화
#[napi]
pub fn initialize_gpu_module() -> napi::Result<bool> {
    // GPU 가용성 확인
    let available = context::check_gpu_availability();
    
    if available {
        // 사용 가능한 경우 GPU 컨텍스트 초기화
        if let Err(e) = context::initialize_gpu_context() {
            println!("GPU 컨텍스트 초기화 실패: {}", e);
            return Ok(false);
        }
        
        // GPU 작업 함수 맵 초기화 - 캐스팅 문제 해결
        let mut task_map = HashMap::new();
        
        // 모든 함수를 동일한 타입으로 캐스팅하여 추가
        task_map.insert(GpuTaskType::MatrixMultiplication, perform_matrix_multiplication as GpuTaskFn);
        task_map.insert(GpuTaskType::TextAnalysis, perform_text_analysis as GpuTaskFn);
        task_map.insert(GpuTaskType::ImageProcessing, perform_image_processing as GpuTaskFn);
        task_map.insert(GpuTaskType::DataAggregation, perform_data_aggregation as GpuTaskFn);
        
        GPU_TASK_FUNCTIONS.get_or_init(|| Mutex::new(task_map));
    }
    
    // 초기 가속 상태 설정
    GPU_ACCELERATION_ENABLED.store(available, Ordering::SeqCst);
    
    Ok(available)
}

/// GPU 가속 가능 여부 확인
#[napi]
pub fn is_gpu_acceleration_available() -> bool {
    context::check_gpu_availability()
}

/// GPU 가속 활성화
#[napi]
pub fn enable_gpu_acceleration() -> bool {
    // 가용성 확인
    if !context::check_gpu_availability() {
        return false;
    }
    
    GPU_ACCELERATION_ENABLED.store(true, Ordering::SeqCst);
    true
}

/// GPU 가속 비활성화
#[napi]
pub fn disable_gpu_acceleration() -> bool {
    GPU_ACCELERATION_ENABLED.store(false, Ordering::SeqCst);
    true
}

/// GPU 정보 가져오기
#[napi]
pub fn get_gpu_info() -> napi::Result<String> {
    let available = context::check_gpu_availability();
    
    let gpu_info = if available {
        match context::get_gpu_device_info() {
            Ok(device_info) => {
                // GPU 정보 변환
                GpuInfo {
                    name: device_info.name,
                    vendor: device_info.vendor,
                    driver_info: device_info.driver_info,
                    device_type: format!("{:?}", device_info.device_type),
                    backend: format!("{:?}", device_info.backend),
                    available: true,
                }
            },
            Err(_) => {
                // 기본 정보
                GpuInfo {
                    name: "Unknown GPU".to_string(),
                    vendor: "Unknown".to_string(),
                    driver_info: "Not available".to_string(),
                    device_type: "Unknown".to_string(),
                    backend: "Unknown".to_string(),
                    available: false,
                }
            }
        }
    } else {
        // GPU 사용 불가
        GpuInfo {
            name: "No GPU Available".to_string(),
            vendor: "N/A".to_string(),
            driver_info: "N/A".to_string(),
            device_type: "CPU".to_string(),
            backend: "Software".to_string(),
            available: false,
        }
    };
    
    // JSON으로 직렬화
    serde_json::to_string(&gpu_info)
        .map_err(|e| Error::from_reason(format!("Failed to serialize GPU info: {}", e)))
}

/// GPU 계산 수행 (동기 버전)
#[napi]
pub fn perform_gpu_computation_sync(data: String, computation_type: String) -> napi::Result<String> {
    // GPU 가속 활성화 여부 확인
    if !GPU_ACCELERATION_ENABLED.load(Ordering::SeqCst) {
        return Err(Error::from_reason("GPU acceleration is disabled"));
    }
    
    // 계산 타입 확인
    let task_type = match computation_type.as_str() {
        "matrix" => GpuTaskType::MatrixMultiplication,
        "text" => GpuTaskType::TextAnalysis,
        "image" => GpuTaskType::ImageProcessing,
        "data" => GpuTaskType::DataAggregation,
        _ => return Err(Error::from_reason(format!("Unknown computation type: {}", computation_type))),
    };
    
    // 시작 시간 기록
    let start = std::time::Instant::now();
    
    // 함수 맵에서 해당 함수 찾기
    let task_function = {
        let task_map = GPU_TASK_FUNCTIONS.get_or_init(|| Mutex::new(HashMap::new()));
        let map = task_map.lock();
        match map.get(&task_type) {
            Some(func) => *func,
            None => return Err(Error::from_reason(format!("No implementation for task type: {:?}", task_type))),
        }
    };
    
    // 함수 실행
    let result = match task_function(&data) {
        Ok(value) => {
            let duration = start.elapsed().as_millis() as u64;
            GpuComputationResult {
                success: true,
                task_type: computation_type,
                duration_ms: duration,
                result: Some(value.to_string()),
                error: None,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64,
            }
        },
        Err(e) => {
            GpuComputationResult {
                success: false,
                task_type: computation_type,
                duration_ms: 0,
                result: None,
                error: Some(e.to_string()),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64,
            }
        }
    };
    
    // 직렬화
    serde_json::to_string(&result)
        .map_err(|e| Error::from_reason(format!("Failed to serialize result: {}", e)))
}

/// GPU 계산 수행 (비동기 버전)
#[napi]
pub async fn perform_gpu_computation(data: String, computation_type: String) -> napi::Result<String> {
    // 동기 버전의 작업을 async_std를 사용해 비동기적으로 실행
    let result = async_std::task::spawn_blocking(move || {
        perform_gpu_computation_sync(data, computation_type)
    }).await;
    
    result
}

/// 행렬 곱셈 계산 구현
fn perform_matrix_multiplication(data: &str) -> Result<Value, Error> {
    // 간단한 구현 - 실제로는 GPU shader 사용해야 함
    Ok(json!({
        "type": "matrix_result",
        "dimensions": [10, 10],
        "sample_value": 42
    }))
}

/// 텍스트 분석 계산 구현
fn perform_text_analysis(data: &str) -> Result<Value, Error> {
    // 간단한 구현
    Ok(json!({
        "type": "text_result",
        "word_count": data.split_whitespace().count(),
        "sample": "analyzed text"
    }))
}

/// 이미지 처리 계산 구현
fn perform_image_processing(data: &str) -> Result<Value, Error> {
    // 간단한 구현
    Ok(json!({
        "type": "image_result",
        "width": 100,
        "height": 100,
        "sample": "processed image"
    }))
}

/// 데이터 집계 계산 구현
fn perform_data_aggregation(data: &str) -> Result<Value, Error> {
    // 간단한 구현
    Ok(json!({
        "type": "data_result",
        "count": 1000,
        "average": 42.5,
        "sample": "aggregated data"
    }))
}
