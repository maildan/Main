use serde_json::{json, Value};
use crate::gpu::Result;
use crate::gpu::types::GpuCapabilities;

/// 타이핑 통계 수행
pub fn perform_typing_statistics(data: &str, _capabilities: Option<&GpuCapabilities>) -> Result<Value> {
    // JSON 파싱
    let data: Value = match serde_json::from_str(data) {
        Ok(parsed) => parsed,
        Err(e) => {
            return Ok(json!({
                "success": false, 
                "error": format!("JSON 파싱 실패: {}", e),
                "result": null
            }));
        }
    };
    
    // 필드 추출
    let key_count = data["keyCount"].as_u64().unwrap_or(0);
    let typing_time = data["typingTime"].as_u64().unwrap_or(0);
    let errors = data["errors"].as_u64().unwrap_or(0);
    let content = data["content"].as_str().unwrap_or("");
    
    // 입력 유효성 검사
    if key_count == 0 || typing_time == 0 {
        return Ok(json!({
            "success": false,
            "error": "유효하지 않은 타이핑 데이터 입력",
            "result": null
        }));
    }
    
    // 타이핑 통계 계산
    let wpm = if typing_time > 0 {
        // 분당 단어 수: (키 수 / 5) / (분 단위 시간)
        (key_count as f64 / 5.0) / (typing_time as f64 / 60000.0)
    } else {
        0.0
    };
    
    let accuracy = if key_count > 0 {
        100.0 - ((errors as f64 / key_count as f64) * 100.0)
    } else {
        0.0
    };
    
    Ok(json!({
        "success": true,
        "result": {
            "wpm": wpm,
            "accuracy": accuracy,
            "key_count": key_count,
            "errors": errors,
            "time_ms": typing_time,
            "content_length": content.len()
        }
    }))
}
