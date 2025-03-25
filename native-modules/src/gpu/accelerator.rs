use napi_derive::napi;
use napi::Error;
use serde_json::{json, Value};
use crate::gpu::types::GpuCapabilities;
use log::{debug, info};
use std::time::{SystemTime, UNIX_EPOCH};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::cell::RefCell;

// 가속화 상태를 추적하기 위한 변수
static GPU_ACCELERATION_ENABLED: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));
static GPU_INITIALIZED: Lazy<Mutex<bool>> = Lazy::new(|| Mutex::new(false));

// 통계 정보를 저장하기 위한 RefCell
thread_local! {
    static STATS: RefCell<GpuStats> = RefCell::new(GpuStats::default());
}

// GPU 통계 구조체
#[derive(Default, Debug)]
struct GpuStats {
    operations_count: u32,
    total_execution_time_ms: u64,
    last_operation_time: Option<u64>,
    operation_types: HashMap<String, u32>,
}

// GPU 가속 프로필
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum GpuProfile {
    LOW,
    MEDIUM,
    HIGH,
    ULTRA,
}

/// GPU 상태 확인
#[napi]
pub fn is_gpu_initialized() -> bool {
    *GPU_INITIALIZED.lock().unwrap()
}

/// GPU 가속화 활성화 여부 확인
#[napi]
pub fn is_acceleration_enabled() -> bool {
    *GPU_ACCELERATION_ENABLED.lock().unwrap()
}

/// GPU 드라이버 버전 가져오기
#[napi]
pub fn get_driver_version() -> String {
    "1.0.0".to_string() // 임시 구현, 실제로는 시스템에서 확인 필요
}

/// GPU 장치 이름 가져오기
#[napi]
pub fn get_device_name() -> String {
    "Generic GPU Device".to_string() // 임시 구현, 실제로는 시스템에서 확인 필요
}

/// GPU 벤더 이름 가져오기
#[napi]
pub fn get_vendor_name() -> String {
    "Generic Vendor".to_string() // 임시 구현, 실제로는 시스템에서 확인 필요
}

/// GPU 장치 유형 가져오기
#[napi]
pub fn get_device_type() -> i32 {
    0 // 0: Integrated, 1: Discrete, 2: Software, 3: Unknown
}

/// GPU 초기화
#[napi]
pub fn initialize_gpu() -> napi::Result<bool> {
    let mut initialized = GPU_INITIALIZED.lock().unwrap();
    
    if *initialized {
        debug!("GPU가 이미 초기화됨");
        return Ok(true);
    }
    
    info!("GPU 초기화 시작");
    
    // 실제 구현에서는 여기에 GPU 하드웨어 감지 및 초기화 코드가 들어갑니다
    // 이 예제에서는 항상 성공한다고 가정합니다
    *initialized = true;
    
    // 초기 상태로 가속화는 비활성화
    {
        let mut acceleration_enabled = GPU_ACCELERATION_ENABLED.lock().unwrap();
        *acceleration_enabled = false;
    }
    
    info!("GPU 초기화 완료");
    Ok(true)
}

/// GPU 가속화 활성화
#[napi]
pub fn enable_gpu_acceleration() -> napi::Result<bool> {
    // 먼저 GPU가 초기화되었는지 확인
    let initialized = *GPU_INITIALIZED.lock().unwrap();
    
    if !initialized {
        return Err(Error::from_reason("GPU가 초기화되지 않음, 가속화를 활성화하기 전에 먼저 initialize_gpu()를 호출하세요"));
    }
    
    info!("GPU 가속화 활성화 중");
    let mut acceleration_enabled = GPU_ACCELERATION_ENABLED.lock().unwrap();
    *acceleration_enabled = true;
    
    Ok(true)
}

/// GPU 가속화 비활성화
#[napi]
pub fn disable_gpu_acceleration() -> napi::Result<bool> {
    // 먼저 GPU가 초기화되었는지 확인
    let initialized = *GPU_INITIALIZED.lock().unwrap();
    
    if !initialized {
        debug!("GPU가 초기화되지 않음, 비활성화 작업 무시");
        return Ok(true); // 아직 초기화되지 않았다면 이미 비활성화된 상태로 간주
    }
    
    info!("GPU 가속화 비활성화 중");
    let mut acceleration_enabled = GPU_ACCELERATION_ENABLED.lock().unwrap();
    *acceleration_enabled = false;
    
    Ok(true)
}

/// GPU 통계 가져오기
#[napi]
pub fn get_gpu_stats() -> napi::Result<String> {
    let result = STATS.with(|stats| {
        let stats = stats.borrow();
        
        json!({
            "operations_count": stats.operations_count,
            "total_execution_time_ms": stats.total_execution_time_ms,
            "last_operation_time": stats.last_operation_time,
            "timestamp": SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        })
    });
    
    Ok(result.to_string())
}

/// GPU 작업 실행
#[napi]
pub fn execute_gpu_operation(operation_type: String, data: String) -> napi::Result<String> {
    debug!("GPU 작업 실행: {}", operation_type);
    
    // GPU가 초기화되었는지 확인
    let initialized = *GPU_INITIALIZED.lock().unwrap();
    
    if !initialized {
        return Err(Error::from_reason("GPU가 초기화되지 않음, 연산을 실행하기 전에 먼저 initialize_gpu()를 호출하세요"));
    }
    
    // 가속화가 활성화되었는지 확인
    let acceleration_enabled = *GPU_ACCELERATION_ENABLED.lock().unwrap();
    
    if !acceleration_enabled {
        debug!("GPU 가속화가 비활성화됨, CPU로 작업 수행");
        // 실제 구현에서는 CPU 폴백 로직을 추가합니다
    }
    
    // 작업 타입에 따라 다른 처리
    let result = match operation_type.as_str() {
        "compute" => perform_compute_operation(&data),
        "renderText" => perform_text_rendering(&data),
        "processData" => perform_data_processing(&data, None), // _capabilities를 None으로 전달
        "analyzeTyping" => perform_typing_analysis(&data),
        _ => Err(Error::from_reason(format!("지원되지 않는 GPU 작업 타입: {}", operation_type)))
    };
    
    // 결과 처리
    match result {
        Ok(operation_result) => {
            // 통계 업데이트
            update_operation_stats(&operation_type, 10); // 예제 실행 시간 10ms
            
            let result_json = json!({
                "success": true,
                "result": operation_result,
                "operation_type": operation_type,
                "timestamp": SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            });
            
            Ok(result_json.to_string())
        },
        Err(e) => {
            let error_json = json!({
                "success": false,
                "error": e.to_string(),
                "operation_type": operation_type,
                "timestamp": SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64
            });
            
            Ok(error_json.to_string())
        }
    }
}

// 작업 통계 업데이트
fn update_operation_stats(operation_type: &str, execution_time_ms: u64) {
    STATS.with(|stats| {
        let mut stats = stats.borrow_mut();
        stats.operations_count += 1;
        stats.total_execution_time_ms += execution_time_ms;
        stats.last_operation_time = Some(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        );
        
        let count = stats.operation_types.entry(operation_type.to_string()).or_insert(0);
        *count += 1;
    });
}

/// 텍스트 렌더링 수행
fn perform_text_rendering(data: &str) -> Result<Value, Error> {
    // 실제 구현에서는 GPU를 사용한 텍스트 렌더링 로직이 들어갑니다
    // 이 예제에서는 간단한 결과만 반환합니다
    Ok(json!({
        "rendered": true,
        "text_length": data.len(),
        "status": "success"
    }))
}

/// 데이터 처리 수행
fn perform_data_processing(data: &str, _capabilities: Option<&GpuCapabilities>) -> Result<Value, Error> {
    // 임시 구현 (필요 시 확장)
    Ok(json!({
        "result": "data_aggregation",
        "data_length": data.len()
    }))
}

/// 컴퓨팅 작업 수행
fn perform_compute_operation(data: &str) -> Result<Value, Error> {
    // 실제 구현에서는 GPU를 사용한 컴퓨팅 로직이 들어갑니다
    // 이 예제에서는 간단한 결과만 반환합니다
    
    // 데이터 파싱
    let json_data: Value = match serde_json::from_str(data) {
        Ok(parsed) => parsed,
        Err(e) => return Err(Error::from_reason(format!("JSON 파싱 실패: {}", e))),
    };
    
    // 예제: 배열의 합계 계산 (실제로는 GPU를 통해 병렬 처리됨)
    if let Some(array) = json_data.get("values").and_then(|v| v.as_array()) {
        let mut sum = 0.0;
        for value in array {
            if let Some(number) = value.as_f64() {
                sum += number;
            }
        }
        
        Ok(json!({
            "sum": sum,
            "count": array.len(),
            "average": if array.len() > 0 { sum / array.len() as f64 } else { 0.0 },
            "status": "success"
        }))
    } else {
        Err(Error::from_reason("입력 데이터에 'values' 배열이 없습니다"))
    }
}

/// 타이핑 분석 수행
fn perform_typing_analysis(data: &str) -> Result<Value, Error> {
    // 데이터 파싱
    let json_data: Value = match serde_json::from_str(data) {
        Ok(parsed) => parsed,
        Err(e) => return Err(Error::from_reason(format!("JSON 파싱 실패: {}", e))),
    };
    
    // 타이핑 데이터 추출
    let key_strokes = json_data.get("keyStrokes").and_then(|v| v.as_array());
    let content = json_data.get("content").and_then(|v| v.as_str()).unwrap_or("");
    
    if key_strokes.is_none() {
        return Err(Error::from_reason("입력 데이터에 'keyStrokes' 배열이 없습니다"));
    }
    
    let key_strokes = key_strokes.unwrap();
    
    // 예: 단어 빈도 계산을 위한 해시맵을 만들어 각 단어의 수를 세아리기
    let mut word_counts = HashMap::new();
    
    // content 문자열을 공백으로 나누어 단어 단위로 분리
    let words = content.split_whitespace();
    
    // 각 단어의 빈도를 계산
    for word in words {
        // 소문자 변환 및 부호 제거
        let clean_word = word.to_lowercase().chars()
            .filter(|c| c.is_alphanumeric())
            .collect::<String>();
            
        if !clean_word.is_empty() {
            // 수정: 클로저 내에서 word_counts를 가변 참조하는 대신 함수형 업데이트 방식을 사용
            let count = word_counts.entry(clean_word.clone()).or_insert(0);
            *count += 1;
        }
    }
    
    // 결과 생성
    let typing_speed = if !key_strokes.is_empty() {
        // 첫 번째와 마지막 키 입력 사이의 시간 차이 계산
        let first_timestamp = key_strokes.first().and_then(|v| v.get("timestamp")).and_then(|v| v.as_f64()).unwrap_or(0.0);
        let last_timestamp = key_strokes.last().and_then(|v| v.get("timestamp")).and_then(|v| v.as_f64()).unwrap_or(first_timestamp);
        
        let time_diff_seconds = (last_timestamp - first_timestamp) / 1000.0;
        
        if time_diff_seconds > 0.0 {
            (key_strokes.len() as f64 / time_diff_seconds) * 60.0 // 분당 타자 수
        } else {
            0.0
        }
    } else {
        0.0
    };
    
    // 결과를 JSON으로 변환하여 반환
    Ok(json!({
        "content_length": content.len(),
        "word_count": word_counts.len(),
        "key_stroke_count": key_strokes.len(),
        "typing_speed": typing_speed,
        "most_common_words": word_counts.iter()
            .filter(|(_, &count)| count > 1) // 빈도가 1보다 큰 단어만 포함
            .map(|(word, count)| json!({
                "word": word,
                "count": count
            }))
            .collect::<Vec<_>>(),
        "status": "success"
    }))
}

/// GPU 작업 취소
#[napi]
pub fn cancel_gpu_operation(operation_id: String) -> napi::Result<bool> {
    // 실제 구현에서는 진행 중인 작업을 취소하는 로직이 들어갑니다
    debug!("GPU 작업 취소: {}", operation_id);
    Ok(true)
}

/// GPU 리소스 정리
#[napi]
pub fn cleanup_gpu_resources() -> napi::Result<bool> {
    let initialized = *GPU_INITIALIZED.lock().unwrap();
    
    if !initialized {
        debug!("GPU가 초기화되지 않음, 정리 작업 무시");
        return Ok(true);
    }
    
    info!("GPU 리소스 정리 중");
    
    // 실제 구현에서는 여기에 GPU 리소스 해제 코드가 들어갑니다
    
    Ok(true)
}
