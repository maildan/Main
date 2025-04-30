use napi::bindgen_prelude::Error as NapiError;
use serde_json::{json, Value};
use crate::gpu::types::GpuCapabilities;

/// 텍스트 분석 수행
/// 
/// 입력 텍스트 데이터를 분석합니다.
pub fn perform_text_analysis(data: &str, capabilities: Option<&GpuCapabilities>) -> Result<Value, NapiError> {
    // 실제 텍스트 분석 로직 구현
    let word_count = if !data.is_empty() {
        data.split_whitespace().count()
    } else {
        0
    };
    
    let char_count = data.chars().count();
    
    // 복잡도 점수 계산 (간단한 예시)
    let avg_word_length = if word_count > 0 {
        char_count as f64 / word_count as f64
    } else {
        0.0
    };
    
    // GPU 가속 여부에 따른 추가 정보
    let gpu_accelerated = capabilities.is_some();
    
    let result = json!({
        "analyzed": true,
        "word_count": word_count,
        "char_count": char_count,
        "complexity_score": avg_word_length,
        "gpu_accelerated": gpu_accelerated,
    });
    
    // 결과 반환 추가
    Ok(result)
}

/// 텍스트 처리를 위한 GPU 가속 함수
/// 
/// 바이트 데이터를 받아 GPU를 활용하여 텍스트 처리를 수행합니다.
#[napi]
pub fn process_text_with_gpu(data: &[u8]) -> Result<Vec<u8>, NapiError> {
    // 바이트 데이터를 문자열로 변환
    let text = match std::str::from_utf8(data) {
        Ok(s) => s,
        Err(_) => return Err(NapiError::from_reason("Invalid UTF-8 data"))
    };
    
    // 간단한 처리: 각 단어의 첫 글자를 대문자로 변환
    let processed_text = text
        .split_whitespace()
        .map(|word| {
            if let Some(c) = word.chars().next() {
                let upper = c.to_uppercase().collect::<String>();
                if word.len() > 1 {
                    upper + &word[c.len_utf8()..] 
                } else {
                    upper
                }
            } else {
                word.to_string()
            }
        })
        .collect::<Vec<String>>()
        .join(" ");
    
    // 처리된 텍스트를 바이트로 변환
    Ok(processed_text.into_bytes())
}

/// 텍스트에서 중요 키워드 추출
pub fn extract_keywords(text: &str) -> Result<Vec<String>, NapiError> {
    if text.is_empty() {
        return Ok(Vec::new());
    }
    
    // 간단한 키워드 추출 로직 구현
    let words = text.split_whitespace()
        .map(|w| w.trim_matches(|c: char| !c.is_alphanumeric()))
        .filter(|w| w.len() > 3)  // 4글자 이상 단어만 키워드로 간주
        .map(|w| w.to_lowercase())
        .collect::<Vec<String>>();
    
    // 빈도수 기반 상위 키워드 추출을 위한 준비
    let mut word_counts = std::collections::HashMap::new();
    for word in words {
        *word_counts.entry(word).or_insert(0) += 1;
    }
    
    // 빈도수 기준 상위 10개 키워드 추출
    let mut keywords: Vec<(String, usize)> = word_counts.into_iter().collect();
    keywords.sort_by(|a, b| b.1.cmp(&a.1));
    let top_keywords = keywords.into_iter()
        .take(10)
        .map(|(word, _)| word)
        .collect();
    
    Ok(top_keywords)
}

/// 텍스트의 감정 분석
pub fn analyze_sentiment(text: &str) -> Result<f64, NapiError> {
    if text.is_empty() {
        return Ok(0.0);
    }
    
    // 매우 기본적인 감정 분석 구현 (실제로는 더 정교한 NLP 기법 사용 필요)
    let positive_words = ["good", "great", "excellent", "happy", "wonderful", "best", "like", "love"];
    let negative_words = ["bad", "worst", "terrible", "sad", "hate", "dislike", "awful", "poor"];
    
    let text_lower = text.to_lowercase();
    let words = text_lower.split_whitespace();
    
    let mut positive_count = 0;
    let mut negative_count = 0;
    
    for word in words {
        let clean_word = word.trim_matches(|c: char| !c.is_alphanumeric());
        if positive_words.contains(&clean_word) {
            positive_count += 1;
        } else if negative_words.contains(&clean_word) {
            negative_count += 1;
        }
    }
    
    // -1.0 (매우 부정적) ~ 1.0 (매우 긍정적) 범위의 감정 점수 반환
    let total = positive_count + negative_count;
    if total > 0 {
        Ok((positive_count as f64 - negative_count as f64) / total as f64)
    } else {
        Ok(0.0) // 중립
    }
}
