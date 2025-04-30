use crate::memory::types::MemoryInfo;
use napi::Error;
use serde_json::{json, Value};
use log::error;

/// 프로세스 메모리 정보 가져오기
pub fn get_process_memory_info() -> Result<MemoryInfo, Error> {
    // 실제 구현은 analyzer.rs에 있고, 여기서는 단순히 전달
    crate::memory::analyzer::get_process_memory_info()
}

/// 메모리 정보를 JSON으로 변환
pub fn memory_info_to_json(info: &MemoryInfo) -> Value {
    json!({
        "heap_used": info.heap_used,
        "heap_total": info.heap_total,
        "heap_limit": info.heap_limit,
        "rss": info.rss,
        "external": info.external,
        "heap_used_mb": info.heap_used_mb,
        "rss_mb": info.rss_mb,
        "percent_used": info.percent_used,
        "timestamp": info.timestamp
    })
}

/// 현재 메모리 정보 가져오기 (JSON 문자열)
pub fn get_memory_info_json() -> Result<String, Error> {
    match get_process_memory_info() {
        Ok(info) => {
            let json = memory_info_to_json(&info);
            Ok(json.to_string())
        },
        Err(e) => {
            error!("메모리 정보를 JSON으로 변환 실패: {}", e);
            Err(e)
        }
    }
}
