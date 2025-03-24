use std::time::{Instant, SystemTime, UNIX_EPOCH};
use tokio::sync::oneshot;
use serde::{Serialize, Deserialize};
use serde_json::json;
use std::thread;
use crate::worker::pool::get_worker_pool;
use napi::Error;

/// 작업 데이터 구조체
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TaskData {
    pub task_type: String,
    pub data: String,
    pub priority: u8,
    pub timeout_ms: Option<u64>,
}

// 작업 결과 구조체
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TaskResult {
    pub success: bool,
    pub task_type: String,
    pub execution_time_ms: u64,
    pub timestamp: u64,
    pub results: serde_json::Value,
    pub error: Option<String>,
}

// 작업 제출 - WorkerPool 구조체의 내부 구현에 직접 의존하지 않도록 수정
pub async fn submit_task(task_type: String, data: String) -> Result<TaskResult, String> {
    // 워커 풀 가져오기 - 변수 앞에 언더스코어 추가하여 미사용 경고 제거
    let _pool = get_worker_pool().ok_or("워커 풀이 초기화되지 않았습니다")?;
    
    // 시작 시간 기록
    let start_time = Instant::now();
    
    // 채널 생성
    let (tx, rx) = oneshot::channel();
    
    // 작업 클로저 생성
    let task_closure = {
        let task_type_clone = task_type.clone();
        let data_clone = data.clone();
        
        move || {
            // 작업 실행
            let result = execute_task(&task_type_clone, &data_clone);
            
            // 결과 전송
            let _ = tx.send(result);
        }
    };
    
    // 작업을 별도 스레드에서 실행 (runtime 대신 표준 스레드 사용)
    thread::spawn(task_closure);
    
    // 결과 대기
    let result = rx.await
        .map_err(|e| format!("Failed to receive task result: {}", e))?;
    
    // 실행 시간 계산
    let execution_time = start_time.elapsed().as_millis() as u64;
    
    // 결과 생성
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;
    
    // 결과 클론하여 사용하도록 수정
    let has_error = result.is_err();
    let error_msg = if has_error {
        Some(result.as_ref().err().unwrap().to_string())
    } else {
        None
    };
    
    Ok(TaskResult {
        success: !has_error,
        task_type,
        execution_time_ms: execution_time,
        timestamp,
        results: result.unwrap_or_else(|e| json!({ "error": e })),
        error: error_msg,
    })
}

// 작업 실행 (내부 함수) - 사용하지 않는 변수 처리
fn execute_task(task_type: &str, data: &str) -> Result<serde_json::Value, String> {
    match task_type {
        "memory_analysis" => {
            // 메모리 분석 작업
            Ok(json!({
                "type": "memory_analysis",
                "data": "Memory analysis results would be here"
            }))
        },
        "text_processing" => {
            // 텍스트 처리 작업
            Ok(json!({
                "type": "text_processing",
                "data": "Text processing results would be here"
            }))
        },
        "statistical_analysis" => {
            // 통계 분석 작업
            Ok(json!({
                "type": "statistical_analysis",
                "data": "Statistical analysis results would be here"
            }))
        },
        "typing_optimization" => {
            // 타이핑 최적화 작업
            handle_typing_optimization_task(data).map_err(|e| e.to_string()).map(|res| json!(res))
        },
        _ => {
            Err(format!("Unknown task type: {}", task_type))
        }
    }
}

/// 타이핑 최적화 작업 핸들러
pub fn handle_typing_optimization_task(data: &str) -> Result<String, Error> {
    // 데이터 파싱
    let parsed: serde_json::Value = serde_json::from_str(data)
        .map_err(|e| Error::from_reason(format!("Invalid JSON data: {}", e)))?;
    
    // 타이핑 데이터 (키 입력, 시간 등) 가져오기
    let key_count = parsed.get("keyCount").and_then(|v| v.as_u64()).unwrap_or(0);
    let typing_time = parsed.get("typingTime").and_then(|v| v.as_u64()).unwrap_or(0);
    
    // 성능 최적화 처리 (CPU 집약적 작업)
    let optimization_result = simulate_typing_optimization(key_count, typing_time);
    
    // 결과 JSON 생성
    let result = serde_json::json!({
        "success": true,
        "task_type": "typing_optimization",
        "results": optimization_result,
    });
    
    Ok(serde_json::to_string(&result).unwrap_or_default())
}

/// 타이핑 최적화 시뮬레이션 (CPU 집약적 작업)
fn simulate_typing_optimization(key_count: u64, typing_time: u64) -> serde_json::Value {
    // 타이핑 성능 계산 (WPM = Words Per Minute)
    let mut wpm = 0.0;
    if typing_time > 0 {
        wpm = ((key_count as f64) / 5.0) / ((typing_time as f64) / 60000.0);
    }
    
    // 타이핑 일관성 계산 (가상 데이터)
    let consistency = calculate_typing_consistency(key_count, typing_time);
    
    // 추천 속도 계산
    let recommended_speed = calculate_recommended_speed(wpm, consistency);
    
    // 결과 반환
    serde_json::json!({
        "wpm": (wpm * 10.0).round() / 10.0, // 소수점 첫째 자리까지
        "consistency": consistency,
        "performance_rating": calculate_performance_rating(wpm, consistency),
        "suggestions": generate_suggestions(wpm, consistency),
        "recommended_speed": recommended_speed,
        "stats": {
            "key_count": key_count,
            "typing_time_ms": typing_time,
            "seconds": typing_time / 1000,
            "keystrokes_per_second": if typing_time > 0 { 
                ((key_count as f64) / (typing_time as f64 / 1000.0) * 10.0).round() / 10.0 
            } else { 
                0.0 
            }
        }
    })
}

/// 일관성 점수 계산 (가상 구현)
fn calculate_typing_consistency(key_count: u64, typing_time: u64) -> f64 {
    if key_count < 10 || typing_time < 1000 {
        return 0.0;
    }
    
    // 간단한 일관성 모델: 키 수와 시간을 기반으로 계산
    let rate = (key_count as f64) / (typing_time as f64 / 1000.0);
    
    // 일관성 초기값 (50-85 사이)
    let mut consistency = 50.0 + (rate / 10.0).min(35.0);
    
    // 키 입력이 많을수록 일관성 점수 증가 (최대 95점)
    if key_count > 100 {
        consistency += ((key_count as f64).log10() - 2.0) * 5.0;
    }
    
    consistency.min(95.0)
}

/// 성능 등급 계산
fn calculate_performance_rating(wpm: f64, consistency: f64) -> String {
    let score = (wpm * 0.7) + (consistency * 0.3);
    
    match score {
        s if s >= 100.0 => "전문가".to_string(),
        s if s >= 80.0 => "고급".to_string(),
        s if s >= 60.0 => "중급".to_string(),
        s if s >= 40.0 => "초중급".to_string(),
        s if s >= 20.0 => "초급".to_string(),
        _ => "입문".to_string()
    }
}

/// 추천 속도 계산
fn calculate_recommended_speed(wpm: f64, consistency: f64) -> f64 {
    // 현재 속도와 일관성을 고려하여 적절한 목표 속도 계산
    let current_speed = wpm;
    let consistency_factor = consistency / 100.0;
    
    // 일관성이 높으면 속도 향상 권장, 낮으면 현재 속도 유지나 약간 낮춤
    if consistency > 80.0 {
        // 일관성이 높을 때 10-15% 속도 향상 권장
        current_speed * (1.0 + 0.15 * consistency_factor)
    } else if consistency > 60.0 {
        // 일관성이 중간일 때 5% 속도 향상 권장
        current_speed * (1.0 + 0.05 * consistency_factor)
    } else {
        // 일관성이 낮을 때 현재 속도 유지 또는 약간 낮춤
        current_speed * (0.95 + 0.05 * consistency_factor)
    }
}

/// 타이핑 개선 제안 생성
fn generate_suggestions(wpm: f64, consistency: f64) -> Vec<String> {
    let mut suggestions = Vec::new();
    
    if wpm < 30.0 {
        suggestions.push("기본 타이핑 자세와 손가락 위치를 확인하세요.".to_string());
        suggestions.push("타이핑 튜토리얼로 기초를 다지세요.".to_string());
    } else if wpm < 60.0 {
        suggestions.push("특수 키와 숫자 키 사용을 연습하세요.".to_string());
        suggestions.push("모니터를 보며 타이핑하는 연습을 하세요.".to_string());
    } else {
        suggestions.push("복잡한 문장과 코드 타이핑을 연습하세요.".to_string());
        suggestions.push("타이핑 속도와 정확도의 균형을 맞추세요.".to_string());
    }
    
    if consistency < 50.0 {
        suggestions.push("일정한 리듬으로 타이핑하는 연습을 하세요.".to_string());
    } else if consistency < 75.0 {
        suggestions.push("자주 실수하는 키 조합을 집중적으로 연습하세요.".to_string());
    }
    
    suggestions
}
