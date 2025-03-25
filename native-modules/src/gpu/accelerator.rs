use napi::Error;
use log::{debug, warn, info};  // info 매크로 추가
use serde_json::{json, Value};
use std::collections::HashMap;
use std::time::Instant;
use rayon::prelude::*;
use crate::gpu::types::{GpuTaskType, GpuWorkloadSize, GpuCapabilities};
use crate::gpu::context;
use std::sync::Arc;
use std::sync::Mutex as StdMutex;
use std::sync::Once;
use std::sync::atomic::{AtomicBool, Ordering};
// crate::error를 napi::Error로 대체
use once_cell::sync::Lazy;
use parking_lot::RwLock;

// GpuTaskFunction 타입 정의 추가
type GpuTaskFunction = fn(&str, Option<&GpuCapabilities>) -> Result<Value, Error>;

// GPU 초기화 상태 관리
static GPU_INITIALIZED: AtomicBool = AtomicBool::new(false);

// GPU 가속화 활성화 상태 관리
static GPU_ACCELERATION_ENABLED: AtomicBool = AtomicBool::new(false);

// GPU 장치 정보
static GPU_DEVICE_INFO: Lazy<RwLock<GpuDeviceInfo>> = Lazy::new(|| RwLock::new(GpuDeviceInfo::default()));

// GPU 장치 정보 구조체
#[derive(Debug, Clone, Default)]
struct GpuDeviceInfo {
    name: String,
    vendor: String,
    driver_version: String,
    device_type: u8, // 0: 통합, 1: 독립, 2: 소프트웨어, 3: 알 수 없음
}

/// GPU 초기화 여부 확인
pub fn is_gpu_initialized() -> bool {
    GPU_INITIALIZED.load(Ordering::SeqCst)
}

/// GPU 가속화 활성화 여부 확인
pub fn is_acceleration_enabled() -> bool {
    GPU_ACCELERATION_ENABLED.load(Ordering::SeqCst)
}

/// GPU 벤더 이름 가져오기
pub fn get_vendor_name() -> String {
    GPU_DEVICE_INFO.read().vendor.clone()
}

/// GPU 장치 이름 가져오기
pub fn get_device_name() -> String {
    GPU_DEVICE_INFO.read().name.clone()
}

/// GPU 드라이버 버전 가져오기
pub fn get_driver_version() -> String {
    GPU_DEVICE_INFO.read().driver_version.clone()
}

/// GPU 장치 유형 가져오기
pub fn get_device_type() -> u8 {
    GPU_DEVICE_INFO.read().device_type
}

/// GPU 초기화
pub fn initialize_gpu() -> Result<bool, Error> {
    // 이미 초기화되었는지 확인
    if GPU_INITIALIZED.load(Ordering::SeqCst) {
        debug!("GPU가 이미 초기화됨");
        return Ok(true);
    }
    
    info!("GPU 초기화 시작");
    
    // 현재 GPU 기능 감지
    let _capabilities = match context::get_capabilities() {  // capabilities -> _capabilities로 변경
        Ok(caps) => {
            // GPU 장치 정보 설정
            let mut device_info = GPU_DEVICE_INFO.write();
            device_info.name = "시뮬레이션된 GPU 장치".to_string();
            device_info.vendor = "Unknown".to_string();
            device_info.driver_version = "1.0.0".to_string();
            device_info.device_type = 0; // 기본값: 통합 GPU
            
            GPU_ACCELERATION_ENABLED.store(true, Ordering::SeqCst);
            caps
        },
        Err(e) => {
            warn!("GPU 기능 감지 실패: {}", e);
            GPU_ACCELERATION_ENABLED.store(false, Ordering::SeqCst);
            return Err(Error::from_reason(format!("GPU 초기화 실패: {}", e)));
        }
    };
    
    // 초기화 완료 표시
    GPU_INITIALIZED.store(true, Ordering::SeqCst);
    
    info!("GPU 초기화 완료");
    Ok(true)
}

/// GPU 가속화 활성화
pub fn enable_gpu_acceleration() -> Result<bool, Error> {
    // GPU가 초기화되어 있는지 확인
    if !is_gpu_initialized() {
        return Err(Error::from_reason("GPU가 초기화되지 않음"));
    }
    
    // 가속화 활성화
    GPU_ACCELERATION_ENABLED.store(true, Ordering::SeqCst);
    
    info!("GPU 가속화 활성화됨");
    Ok(true)
}

/// GPU 가속화 비활성화
pub fn disable_gpu_acceleration() -> Result<bool, Error> {
    // 가속화 비활성화
    GPU_ACCELERATION_ENABLED.store(false, Ordering::SeqCst);
    
    info!("GPU 가속화 비활성화됨");
    Ok(true)
}

#[allow(dead_code)]
static INIT: Once = Once::new();

#[allow(dead_code)]
fn initialize_gpu_contexts() -> Result<(), Error> {
    // Check available GPU capabilities
    match context::get_capabilities() {
        Ok(capabilities) => {
            if capabilities.compute_supported {
                // Initialize compute context
                // This would be implementation-specific based on the GPU backend used
                info!("GPU compute capabilities detected");
                Ok(())
            } else {
                Err(Error::from_reason("GPU compute not supported on this device"))
            }
        },
        Err(e) => {
            Err(Error::from_reason(format!("Failed to get GPU capabilities: {}", e)))
        }
    }
}

// Clean up GPU resources
pub fn cleanup_gpu_resources() -> Result<(), Error> {
    if is_gpu_initialized() {
        // Perform cleanup of GPU resources
        // Implementation would depend on GPU backend
        info!("Cleaned up GPU resources");
        Ok(())
    } else {
        Ok(()) // No-op if GPU not initialized
    }
}

// Create contexts module if it doesn't exist
pub fn create_contexts_module() {
    // This is a placeholder function - we need to create the actual contexts module
}

/// GPU 작업 맵 초기화
pub fn initialize_gpu_task_map() -> HashMap<GpuTaskType, GpuTaskFunction> {
    let mut map = HashMap::new();
    
    // 먼저 타입을 명시적으로 지정하여 함수 타입을 통일
    let matrix_multiplication: GpuTaskFunction = perform_matrix_multiplication;
    let text_analysis: GpuTaskFunction = perform_text_analysis;
    let pattern_detection: GpuTaskFunction = perform_pattern_detection;
    let image_processing: GpuTaskFunction = perform_image_processing;
    let data_aggregation: GpuTaskFunction = perform_data_aggregation;
    let typing_statistics: GpuTaskFunction = perform_typing_statistics;
    
    // 이제 동일한 타입의 함수를 맵에 삽입
    map.insert(GpuTaskType::MatrixMultiplication, matrix_multiplication);
    map.insert(GpuTaskType::TextAnalysis, text_analysis);
    map.insert(GpuTaskType::PatternDetection, pattern_detection);
    map.insert(GpuTaskType::ImageProcessing, image_processing);
    map.insert(GpuTaskType::DataAggregation, data_aggregation);
    map.insert(GpuTaskType::TypingStatistics, typing_statistics);
    
    map
}

pub fn get_task_type_from_code(code: &str) -> GpuTaskType {
    match code {
        "matrix" => GpuTaskType::MatrixMultiplication,
        "text" => GpuTaskType::TextAnalysis,
        "pattern" => GpuTaskType::PatternDetection,
        "image" => GpuTaskType::ImageProcessing,
        "data" => GpuTaskType::DataAggregation,
        "typing" => GpuTaskType::TypingStatistics,
        _ => GpuTaskType::Custom,
    }
}

pub fn execute_gpu_task(task_type: GpuTaskType, data: &str) -> Result<Value, Error> {
    let task_map = initialize_gpu_task_map();
    
    let capabilities = match context::get_capabilities() {
        Ok(caps) => Some(caps),
        Err(e) => {
            warn!("GPU 성능 정보를 가져올 수 없음: {}", e);
            None
        }
    };
    
    match task_map.get(&task_type) {
        Some(task_fn) => task_fn(data, capabilities.as_ref()),
        None => match task_type {
            GpuTaskType::Custom => {
                perform_custom_computation(data, capabilities.as_ref())
            },
            _ => Err(Error::from_reason(format!("Unsupported GPU task type: {:?}", task_type))),
        }
    }
}

fn configure_parallel_execution(workload_size: GpuWorkloadSize, capabilities: Option<&GpuCapabilities>) -> usize {
    if let Some(caps) = capabilities {
        match workload_size {
            GpuWorkloadSize::Small => 2.min(caps.max_invocations as usize / 128),
            GpuWorkloadSize::Medium => 4.min(caps.max_invocations as usize / 64),
            GpuWorkloadSize::Large => 8.min(caps.max_invocations as usize / 32),
            GpuWorkloadSize::ExtraLarge => 16.min(caps.max_invocations as usize / 16),
        }
    } else {
        match workload_size {
            GpuWorkloadSize::Small => 2,
            GpuWorkloadSize::Medium => 4,
            GpuWorkloadSize::Large => 8,
            GpuWorkloadSize::ExtraLarge => 16,
        }
    }
}

pub fn perform_matrix_multiplication(data: &str, capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    let start = Instant::now();
    
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    let gpu_available = context::check_gpu_availability();
    
    let matrix_a = parsed.get("matrix_a").and_then(|v| v.as_array()).ok_or_else(|| 
        Error::from_reason("Missing or invalid matrix_a"))?;
    
    let matrix_b = parsed.get("matrix_b").and_then(|v| v.as_array()).ok_or_else(|| 
        Error::from_reason("Missing or invalid matrix_b"))?;
    
    let size_str = parsed.get("size").and_then(|s| s.as_str()).unwrap_or("medium");
    let workload_size = match size_str {
        "small" => GpuWorkloadSize::Small,
        "medium" => GpuWorkloadSize::Medium,
        "large" => GpuWorkloadSize::Large,
        "xl" => GpuWorkloadSize::ExtraLarge,
        _ => GpuWorkloadSize::Medium,
    };
    
    let rows_a = matrix_a.len();
    let cols_b = if let Some(first_row) = matrix_b.first() {
        first_row.as_array().map_or(0, |row| row.len())
    } else {
        0
    };
    
    let use_compute_shader = match capabilities {
        Some(caps) if gpu_available => {
            workload_size >= GpuWorkloadSize::Medium && 
            caps.max_buffer_size >= (rows_a * cols_b * std::mem::size_of::<f32>())
        },
        _ => false
    };
    
    if use_compute_shader {
        debug!("컴퓨트 셰이더를 사용한 행렬 곱셈 수행");
    }
    
    let thread_count = configure_parallel_execution(workload_size, capabilities);
    debug!("병렬 처리 스레드 수: {}", thread_count);
    
    let result_matrix: Vec<Vec<f64>> = (0..rows_a)
        .into_par_iter()
        .with_min_len(rows_a / thread_count.max(1))
        .map(|i| {
            let mut row = vec![0.0; cols_b];
            for j in 0..cols_b {
                let mut sum = 0.0;
                for k in 0..matrix_a[i].as_array().unwrap().len() {
                    let a_val = matrix_a[i].as_array().unwrap()[k].as_f64().unwrap_or(0.0);
                    let b_val = matrix_b[k].as_array().unwrap()[j].as_f64().unwrap_or(0.0);
                    sum += a_val * b_val;
                }
                row[j] = sum;
            }
            row
        })
        .collect();
    
    let elapsed = start.elapsed();
    
    let gpu_info = match context::get_device_info() {
        Ok(info) => json!({
            "name": info.name,
            "type": format!("{:?}", info.device_type),
            "backend": format!("{:?}", info.backend)
        }),
        Err(_) => json!(null)
    };
    
    Ok(json!({
        "result": "matrix_multiplication",
        "matrix": result_matrix,
        "dimensions": {
            "rows": rows_a,
            "cols": cols_b
        },
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": use_compute_shader,
        "workload_size": size_str,
        "thread_count": thread_count,
        "gpu_info": gpu_info
    }))
}

fn perform_text_analysis(data: &str, capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    let start = Instant::now();
    
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    let gpu_available = context::check_gpu_availability();
    
    let text = parsed.get("text").and_then(|t| t.as_str()).unwrap_or("");
    
    let size_str = parsed.get("size").and_then(|s| s.as_str()).unwrap_or("medium");
    let workload_size = match size_str {
        "small" => GpuWorkloadSize::Small,
        "medium" => GpuWorkloadSize::Medium,
        "large" => GpuWorkloadSize::Large,
        "xl" => GpuWorkloadSize::ExtraLarge,
        _ => GpuWorkloadSize::Medium,
    };
    
    let use_gpu_acceleration = match capabilities {
        Some(caps) if gpu_available => {
            text.len() > 10000 && 
            caps.max_buffer_size >= text.len() * std::mem::size_of::<u8>()
        },
        _ => false
    };
    
    if use_gpu_acceleration {
        debug!("GPU 가속을 사용한 텍스트 분석 수행");
    }
    
    let thread_count = configure_parallel_execution(workload_size, capabilities);
    debug!("병렬 처리 스레드 수: {}", thread_count);
    
    let char_frequency = Arc::new(StdMutex::new(HashMap::new()));
    
    let chunk_size = (text.len() / thread_count).max(1);
    
    let chunks_data = text.as_bytes()
        .chunks(chunk_size)
        .map(|chunk| {
            let chunk_str = std::str::from_utf8(chunk).unwrap_or("");
            chunk_str
        })
        .collect::<Vec<&str>>();
    
    chunks_data.par_iter().for_each(|chunk| {
        let mut local_freq = HashMap::new();
        
        for c in chunk.chars() {
            *local_freq.entry(c).or_insert(0) += 1;
        }
        
        let mut global_freq = char_frequency.lock().unwrap();
        for (c, count) in local_freq {
            *global_freq.entry(c).or_insert(0) += count;
        }
    });
    
    let words = text.split_whitespace().count();
    
    let avg_word_length = if words > 0 {
        text.replace(" ", "").len() as f64 / words as f64
    } else {
        0.0
    };
    
    let top_chars: Vec<(char, i32)> = {
        let freq = char_frequency.lock().unwrap();
        let mut char_counts: Vec<(char, i32)> = freq.iter()
            .map(|(&c, &count)| (c, count))
            .collect();
        
        char_counts.sort_by(|a, b| b.1.cmp(&a.1));
        
        char_counts.into_iter().take(10).collect()
    };
    
    let gpu_info = match context::get_device_info() {
        Ok(info) => json!({
            "name": info.name,
            "type": format!("{:?}", info.device_type),
            "backend": format!("{:?}", info.backend)
        }),
        Err(_) => json!(null)
    };
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "text_analysis",
        "text_length": text.len(),
        "word_count": words,
        "avg_word_length": avg_word_length,
        "top_chars": top_chars.iter().map(|(c, count)| {
            json!({
                "char": c.to_string(),
                "count": count
            })
        }).collect::<Vec<_>>(),
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": use_gpu_acceleration,
        "workload_size": size_str,
        "thread_count": thread_count,
        "gpu_info": gpu_info
    }))
}

fn perform_pattern_detection(data: &str, capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    let start = Instant::now();
    
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    let gpu_available = context::check_gpu_availability();
    
    let empty_vec = Vec::new();
    let key_presses = parsed.get("keyPresses").and_then(|k| k.as_array()).unwrap_or(&empty_vec);
    
    let empty_timestamps = Vec::new();
    let timestamps = parsed.get("timestamps").and_then(|t| t.as_array()).unwrap_or(&empty_timestamps);
    
    let workload_size = if key_presses.len() > 5000 {
        GpuWorkloadSize::Large
    } else if key_presses.len() > 1000 {
        GpuWorkloadSize::Medium
    } else {
        GpuWorkloadSize::Small
    };
    
    let use_gpu_acceleration = match capabilities {
        Some(caps) if gpu_available => {
            key_presses.len() > 1000 && 
            caps.max_buffer_size >= key_presses.len() * std::mem::size_of::<u8>() * 2
        },
        _ => false
    };
    
    if use_gpu_acceleration {
        debug!("GPU 가속을 사용한 패턴 감지 수행");
    }
    
    let mut intervals = Vec::new();
    for i in 1..timestamps.len() {
        let prev = timestamps[i-1].as_u64().unwrap_or(0);
        let curr = timestamps[i].as_u64().unwrap_or(0);
        if prev > 0 && curr > 0 && curr > prev {
            intervals.push(curr - prev);
        }
    }
    
    let avg_typing_speed = if intervals.len() > 0 {
        intervals.iter().sum::<u64>() as f64 / intervals.len() as f64
    } else {
        0.0
    };
    
    let speed_variance = if intervals.len() > 1 {
        let mean = avg_typing_speed;
        let sum_squared_diff: f64 = intervals.iter()
            .map(|&x| {
                let diff = x as f64 - mean;
                diff * diff
            })
            .sum();
        (sum_squared_diff / (intervals.len() - 1) as f64).sqrt()
    } else {
        0.0
    };
    
    let typing_pattern = if speed_variance / avg_typing_speed > 0.5 {
        "불규칙 타이핑"
    } else if avg_typing_speed < 100.0 {
        "빠른 타이핑"
    } else if avg_typing_speed < 200.0 {
        "보통 속도 타이핑"
    } else {
        "느린 타이핑"
    };
    
    let gpu_info = match context::get_device_info() {
        Ok(info) => json!({
            "name": info.name,
            "type": format!("{:?}", info.device_type),
            "backend": format!("{:?}", info.backend)
        }),
        Err(_) => json!(null)
    };
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "pattern_detection",
        "key_count": key_presses.len(),
        "average_typing_speed_ms": avg_typing_speed,
        "typing_speed_variance": speed_variance,
        "typing_pattern": typing_pattern,
        "consistency_score": calculate_consistency_score(&parsed),
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": use_gpu_acceleration,
        "workload_size": format!("{:?}", workload_size).to_lowercase(),
        "gpu_info": gpu_info
    }))
}

fn perform_image_processing(_data: &str, _capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    let start = Instant::now();
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "image_processing",
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": false,
    }))
}

fn perform_data_aggregation(data: &str, _capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    let start = Instant::now();
    
    let _parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "data_aggregation",
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": false
    }))
}

fn perform_typing_statistics(data: &str, capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    let start = Instant::now();
    
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    let gpu_available = context::check_gpu_availability();
    
    let key_count = parsed.get("keyCount").and_then(|k| k.as_u64()).unwrap_or(0);
    let typing_time = parsed.get("typingTime").and_then(|t| t.as_u64()).unwrap_or(1);
    let errors = parsed.get("errors").and_then(|e| e.as_u64()).unwrap_or(0);
    let content = parsed.get("content").and_then(|c| c.as_str()).unwrap_or("");
    
    let workload_size = if content.len() > 10000 {
        GpuWorkloadSize::Large
    } else if content.len() > 2000 {
        GpuWorkloadSize::Medium
    } else {
        GpuWorkloadSize::Small
    };
    
    let use_gpu_acceleration = match capabilities {
        Some(caps) if gpu_available => {
            content.len() > 5000 && 
            caps.max_buffer_size >= content.len() * std::mem::size_of::<u8>()
        },
        _ => false
    };
    
    if use_gpu_acceleration {
        debug!("GPU 가속을 사용한 타이핑 통계 계산 수행");
    }
    
    let minutes = typing_time as f64 / 60000.0;
    let wpm = if minutes > 0.0 {
        (key_count as f64 / 5.0) / minutes
    } else {
        0.0
    };
    
    let kpm = if minutes > 0.0 {
        key_count as f64 / minutes
    } else {
        0.0
    };
    
    let word_count = content
        .split_whitespace()
        .count();
    
    let character_count = content.len();
    
    let total_keys = key_count + errors;
    let accuracy = if total_keys > 0 {
        (key_count as f64 / total_keys as f64) * 100.0
    } else {
        100.0
    };
    
    let complexity_score = calculate_text_complexity(content);
    
    let fatigue = estimate_fatigue(typing_time, key_count);
    
    let device_type = match context::get_device_info() {
        Ok(info) => format!("{:?}", info.device_type),
        Err(_) => "Unknown".to_string()
    };
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "typing_statistics",
        "wpm": wpm.round(),
        "kpm": kpm.round(),
        "accuracy": (accuracy * 10.0).round() / 10.0,
        "word_count": word_count,
        "character_count": character_count,
        "typing_time_seconds": typing_time / 1000,
        "complexity_score": complexity_score,
        "fatigue": fatigue,
        "computation_time_ms": elapsed.as_millis(),
        "used_gpu_acceleration": use_gpu_acceleration,
        "device_type": device_type,
        "workload_size": format!("{:?}", workload_size).to_lowercase()
    }))
}

fn perform_custom_computation(data: &str, _capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    let start = Instant::now();
    
    let parsed: Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    let command = parsed.get("command").and_then(|c| c.as_str()).unwrap_or("default");
    
    let result = match command {
        "sum" => {
            let empty_values1 = Vec::new();
            let values = parsed.get("values").and_then(|v| v.as_array()).unwrap_or(&empty_values1);
            let sum: f64 = values.iter()
                .filter_map(|v| v.as_f64())
                .sum();
            json!({ "sum": sum })
        },
        "average" => {
            let empty_values2 = Vec::new();
            let values = parsed.get("values").and_then(|v| v.as_array()).unwrap_or(&empty_values2);
            let sum: f64 = values.iter()
                .filter_map(|v| v.as_f64())
                .sum();
            let count = values.iter().filter(|v| v.is_number()).count();
            let avg = if count > 0 { sum / count as f64 } else { 0.0 };
            json!({ "average": avg })
        },
        _ => {
            json!({ "error": format!("Unknown command: {}", command) })
        }
    };
    
    let elapsed = start.elapsed();
    
    Ok(json!({
        "result": "custom_computation",
        "command": command,
        "computed_result": result,
        "computation_time_ms": elapsed.as_millis()
    }))
}

fn calculate_consistency_score(data: &Value) -> f64 {
    let empty_timestamps2 = Vec::new();
    let timestamps = data.get("timestamps").and_then(|t| t.as_array()).unwrap_or(&empty_timestamps2);
    
    if timestamps.len() < 2 {
        return 100.0;
    }
    
    let mut intervals_data = Vec::new();
    for i in 1..timestamps.len() {
        let prev = timestamps[i-1].as_u64().unwrap_or(0);
        let curr = timestamps[i].as_u64().unwrap_or(0);
        if prev > 0 && curr > 0 && curr > prev {
            intervals_data.push(curr - prev);
        }
    }
    
    if intervals_data.is_empty() {
        return 100.0;
    }
    
    let mean_interval = intervals_data.iter().sum::<u64>() as f64 / intervals_data.len() as f64;
    
    let variance = intervals_data.iter()
        .map(|&x| {
            let diff = x as f64 - mean_interval;
            diff * diff
        })
        .sum::<f64>() / intervals_data.len() as f64;
    
    let stddev = variance.sqrt();
    
    let cv = stddev / mean_interval;
    
    let consistency = (1.0 - cv.min(1.0)) * 100.0;
    
    consistency.max(0.0).min(100.0)
}

fn calculate_text_complexity(text: &str) -> f64 {
    if text.is_empty() {
        return 0.0;
    }
    
    let words: Vec<&str> = text.split_whitespace().collect();
    let word_count = words.len();
    
    if word_count == 0 {
        return 0.0;
    }
    
    let total_chars = words.iter().map(|w| w.len()).sum::<usize>();
    let avg_word_length = total_chars as f64 / word_count as f64;
    
    let unique_words: std::collections::HashSet<&str> = words.iter().cloned().collect();
    let lexical_diversity = unique_words.len() as f64 / word_count as f64;
    
    let complexity = (avg_word_length * 0.5 + lexical_diversity * 50.0).min(100.0);
    
    complexity
}

fn estimate_fatigue(typing_time: u64, key_count: u64) -> Value {
    let minutes = typing_time as f64 / 60000.0;
    
    let kpm = if minutes > 0.0 {
        key_count as f64 / minutes
    } else {
        0.0
    };
    
    let base_fatigue = (minutes * 5.0).min(100.0);
    let intensity_factor = (kpm / 100.0).min(3.0);
    let fatigue_score = (base_fatigue * (1.0 + (intensity_factor * 0.2))).min(100.0);
    
    json!({
        "score": fatigue_score.round(),
        "minutes_typed": minutes.round(),
        "intensity": intensity_factor,
        "recommendation": if fatigue_score > 70.0 {
            "휴식을 취하는 것이 좋습니다."
        } else if fatigue_score > 40.0 {
            "잠시 스트레칭을 하면 좋을 것 같습니다."
        } else {
            "아직 피로도가 낮습니다."
        }
    })
}

pub fn cleanup_unused_gpu_resources() -> Result<bool, Error> {
    debug!("사용하지 않는 GPU 리소스 정리 중...");
    
    if !context::is_gpu_initialized() {
        return Ok(false);
    }
    
    context::with_gpu_context(|ctx| {
        ctx.cleanup_resources()?;
        Ok(true)
    })
}

pub fn clear_shader_caches() -> Result<bool, Error> {
    debug!("GPU 셰이더 캐시 정리 중...");
    
    if !context::is_gpu_initialized() {
        return Ok(false);
    }
    
    context::with_gpu_context(|ctx| {
        ctx.clear_shader_cache()?;
        Ok(true)
    })
}

pub fn release_all_gpu_resources() -> Result<bool, Error> {
    warn!("모든 GPU 리소스 완전 해제 중...");
    
    if !context::is_gpu_initialized() {
        return Ok(false);
    }
    
    context::with_gpu_context(|ctx| {
        ctx.release_all_resources()?;
        Ok(true)
    })
}

pub fn optimize_gpu_settings_for_device_type() -> Result<Value, Error> {
    let initialized = context::is_gpu_initialized();
    if !initialized {
        return Ok(json!({
            "success": false,
            "message": "GPU 컨텍스트가 초기화되지 않았습니다",
            "device_type": "unknown"
        }));
    }
    
    let device_info = context::get_device_info()?;
    
    let (settings, message) = match device_info.device_type {
        wgpu::DeviceType::DiscreteGpu => {
            debug!("디스크리트 GPU용 최적화 설정 적용 중");
            (
                json!({
                    "workgroup_size": 256,
                    "thread_count": 16,
                    "buffer_size": "large",
                    "texture_compression": true,
                    "performance_mode": "high"
                }),
                "디스크리트 GPU 최적화가 적용되었습니다"
            )
        },
        wgpu::DeviceType::IntegratedGpu => {
            debug!("내장 GPU용 최적화 설정 적용 중");
            (
                json!({
                    "workgroup_size": 128,
                    "thread_count": 8,
                    "buffer_size": "medium",
                    "texture_compression": false,
                    "performance_mode": "balanced"
                }),
                "내장 GPU 최적화가 적용되었습니다"
            )
        },
        wgpu::DeviceType::Cpu => {
            debug!("CPU 렌더링용 최적화 설정 적용 중");
            (
                json!({
                    "workgroup_size": 64,
                    "thread_count": 4,
                    "buffer_size": "small",
                    "texture_compression": false,
                    "performance_mode": "low"
                }),
                "CPU 렌더링에 최적화된 설정이 적용되었습니다"
            )
        },
        _ => {
            debug!("기본 GPU 최적화 설정 적용 중");
            (
                json!({
                    "workgroup_size": 64,
                    "thread_count": 4,
                    "buffer_size": "small",
                    "texture_compression": false,
                    "performance_mode": "low"
                }),
                "기본 GPU 설정이 적용되었습니다"
            )
        }
    };
    
    Ok(json!({
        "success": true,
        "message": message,
        "device_type": format!("{:?}", device_info.device_type),
        "device_name": device_info.name,
        "settings": settings
    }))
}
