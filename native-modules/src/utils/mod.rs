use napi_derive::napi;
use napi::Error;
use std::time::{SystemTime, UNIX_EPOCH};

/// 현재 타임스탬프를 문자열로 반환 (u64 반환 문제 해결)
#[napi]
pub fn get_timestamp_string() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    now.to_string()
}

/// 현재 타임스탬프를 수치형으로 반환 (Number 타입 사용)
#[napi]
pub fn get_timestamp() -> f64 {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as f64;
    
    now
}

/// CPU 코어 수를 반환
#[napi]
pub fn get_cpu_core_count() -> u32 {
    num_cpus::get() as u32
}

/// 시스템 정보를 JSON 문자열로 반환
#[napi]
pub fn get_system_info() -> String {
    let info = serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "cpu_cores": num_cpus::get(),
        "rust_version": rustc_version_runtime::version().to_string(),
        "timestamp": SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    });
    
    info.to_string()
}

/// 문자열을 JSON으로 파싱 (오류 처리 예시)
#[napi]
pub fn parse_json(data: String) -> napi::Result<String> {
    // serde_json::Error를 napi::Error로 수동 변환
    let value: serde_json::Value = serde_json::from_str(&data)
        .map_err(|e| Error::from_reason(format!("Failed to parse JSON: {}", e)))?;
    
    // 임의 가공 (예: 타임스탬프 추가)
    let mut obj = match value {
        serde_json::Value::Object(map) => map,
        _ => return Err(Error::from_reason("Expected a JSON object")),
    };
    
    obj.insert(
        "processed_at".to_string(),
        serde_json::Value::Number(serde_json::Number::from(
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        )),
    );
    
    // 결과 직렬화 및 반환
    let result = serde_json::Value::Object(obj);
    serde_json::to_string(&result)
        .map_err(|e| Error::from_reason(format!("Failed to serialize result: {}", e)))
}
