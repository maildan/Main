/**
 * 타이핑 속도 계산 유틸리티
 */

/**
 * 분당 키 입력 수(KPM) 계산
 * @param keyCount 키 입력 수
 * @param typingTime 타이핑 시간(초)
 * @returns 분당 키 입력 수
 */
export function calculateKPM(keyCount: number, typingTime: number): number {
  if (!keyCount || !typingTime || typingTime <= 0) {
    return 0;
  }
  
  // 초 단위 시간을 분 단위로 변환하여 계산
  return Math.round((keyCount / typingTime) * 60);
}

/**
 * 분당 단어 수(WPM) 계산
 * @param wordCount 단어 수 (없을 경우 문자 수를 기준으로 추정)
 * @param charCount 문자 수
 * @param typingTime 타이핑 시간(초)
 * @returns 분당 단어 수
 */
export function calculateWPM(wordCount: number | undefined, charCount: number, typingTime: number): number {
  if (typingTime <= 0) {
    return 0;
  }
  
  let words: number;
  
  if (wordCount !== undefined && wordCount > 0) {
    // 직접 단어 수가 제공된 경우
    words = wordCount;
  } else if (charCount > 0) {
    // 단어 수가 없는 경우 문자 수를 기준으로 추정
    // 영어 기준 평균 단어 길이는 5자로 가정
    // 한글 및 기타 언어는 문자 간격이 다를 수 있으므로 조정
    words = charCount / 5;
  } else {
    return 0;
  }
  
  // 초 단위 시간을 분 단위로 변환하여 계산
  return Math.round((words / typingTime) * 60);
}

/**
 * 정확도 계산 (오타율 기반)
 * @param correctChars 올바른 문자 수
 * @param totalChars 전체 문자 수
 * @returns 정확도 (%)
 */
export function calculateAccuracy(correctChars: number, totalChars: number): number {
  if (totalChars <= 0) {
    return 100; // 입력이 없으면 100% 정확도로 간주
  }
  
  const accuracy = (correctChars / totalChars) * 100;
  
  // 값 범위 보정 (0~100 사이)
  return Math.min(100, Math.max(0, Math.round(accuracy)));
}

/**
 * 페이지 수 계산 (문자 수 기준)
 * @param charCount 문자 수
 * @returns 페이지 수
 */
export function calculatePages(charCount: number): number {
  if (charCount <= 0) {
    return 0;
  }
  
  // 일반적인 A4 기준 페이지당 약 1800자로 계산
  const charsPerPage = 1800;
  
  return Math.max(0, Math.round((charCount / charsPerPage) * 10) / 10);
}
