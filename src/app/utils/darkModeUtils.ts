/**
 * 다크 모드 클래스를 전역 요소에 적용하는 함수
 */
export function applyDarkModeToAllElements(isDark: boolean) {
  if (isDark) {
    document.body.classList.add('dark-mode');
    document.documentElement.classList.add('dark-mode');
    
    // 주요 컨테이너에도 클래스 추가
    document.querySelectorAll('.tab-content, .chart-container, .history-table').forEach(el => {
      el.classList.add('dark-mode');
    });
  } else {
    document.body.classList.remove('dark-mode');
    document.documentElement.classList.remove('dark-mode');
    
    // 주요 컨테이너에서도 클래스 제거
    document.querySelectorAll('.tab-content, .chart-container, .history-table').forEach(el => {
      el.classList.remove('dark-mode');
    });
  }
}

/**
 * 현재 시스템이 다크 모드인지 확인하는 함수
 */
export function isSystemInDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
