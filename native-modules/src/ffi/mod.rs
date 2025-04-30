//! 외부 함수 인터페이스 (FFI) 모듈
//! 
//! Rust와 TypeScript 간의 인터페이스를 관리합니다.

use napi::{Error, Result, JsUnknown, JsObject};
use napi_derive::napi;
use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use log::{debug, error};
use crate::memory::types::{MemoryInfo, OptimizationResult, OptimizationLevel};
use crate::gpu::types::{GpuInfo, GpuDeviceInfo, GpuTaskType};

pub mod memory;
pub mod gpu;

/// JSON 문자열을 응답으로 래핑
#[derive(Serialize)]
pub struct JsonResponse {
    success: bool,
    data: Option<Value>,
    error: Option<String>,
    timestamp: u64,
}

impl JsonResponse {
    /// 성공 응답 생성
    pub fn success(data: Value) -> String {
        let response = Self {
            success: true,
            data: Some(data),
            error: None,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        };
        
        serde_json::to_string(&response).unwrap_or_else(|e| {
            error!("JSON 직렬화 오류: {}", e);
            String::from(r#"{"success":false,"error":"JSON serialization error","data":null}"#)
        })
    }
    
    /// 오류 응답 생성
    pub fn error(msg: &str) -> String {
        let response = Self {
            success: false,
            data: None,
            error: Some(msg.to_string()),
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        };
        
        serde_json::to_string(&response).unwrap_or_else(|e| {
            error!("JSON 직렬화 오류: {}", e);
            String::from(r#"{"success":false,"error":"JSON serialization error","data":null}"#)
        })
    }
}

/// OptimizationLevel enum 변환 헬퍼
pub fn parse_optimization_level(level: i32) -> OptimizationLevel {
    match level {
        0 => OptimizationLevel::Normal,
        1 => OptimizationLevel::Low,
        2 => OptimizationLevel::Medium,
        3 => OptimizationLevel::High,
        4 => OptimizationLevel::Critical,
        _ => OptimizationLevel::Medium, // 기본값
    }
}

/// GpuTaskType enum 변환 헬퍼
pub fn parse_gpu_task_type(task_type: &str) -> Result<GpuTaskType> {
    match task_type {
        "matrix" => Ok(GpuTaskType::MatrixMultiplication),
        "text" => Ok(GpuTaskType::TextAnalysis),
        "pattern" => Ok(GpuTaskType::PatternDetection),
        "image" => Ok(GpuTaskType::ImageProcessing),
        "data" => Ok(GpuTaskType::DataAggregation),
        "typing" => Ok(GpuTaskType::TypingStatistics),
        "custom" => Ok(GpuTaskType::Custom),
        _ => Err(Error::from_reason(format!("Unknown GPU task type: {}", task_type))),
    }
}

/// 메모리 정보를 JSON으로 변환
pub fn memory_info_to_json(info: &MemoryInfo) -> Value {
    json!({
        "heap_used": info.heap_used,
        "heap_total": info.heap_total,
        "heap_used_mb": info.heap_used_mb,
        "rss": info.rss,
        "rss_mb": info.rss_mb,
        "percent_used": info.percent_used,
        "heap_limit": info.heap_limit,
        "timestamp": info.timestamp
    })
}

/// 최적화 결과를 JSON으로 변환
pub fn optimization_result_to_json(result: &OptimizationResult) -> Value {
    let mut json_value = json!({
        "success": result.success,
        "optimization_level": result.optimization_level as i32,
        "timestamp": result.timestamp
    });
    
    if let Some(duration) = result.duration {
        json_value["duration"] = json!(duration);
    }
    
    if let Some(freed_memory) = result.freed_memory {
        json_value["freed_memory"] = json!(freed_memory);
    }
    
    if let Some(freed_mb) = result.freed_mb {
        json_value["freed_mb"] = json!(freed_mb);
    }
    
    if let Some(ref memory_before) = result.memory_before {
        json_value["memory_before"] = memory_info_to_json(memory_before);
    }
    
    if let Some(ref memory_after) = result.memory_after {
        json_value["memory_after"] = memory_info_to_json(memory_after);
    }
    
    if let Some(ref error) = result.error {
        json_value["error"] = json!(error);
    }
    
    json_value
}

/// GPU 정보를 JSON으로 변환
pub fn gpu_info_to_json(info: &GpuDeviceInfo) -> Value {
    json!({
        "name": info.name,
        "vendor": info.vendor,
        "driver_info": info.driver_info,
        "device_type": format!("{:?}", info.device_type),
        "backend": format!("{:?}", info.backend),
        "timestamp": info.timestamp
    })
}
