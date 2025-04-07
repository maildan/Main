/**
 * API 라우트 설정
 * 
 * 정적 내보내기(output: 'export')에서 API 라우트를 사용하기 위한
 * 전역 설정을 정의합니다.
 */

// 정적 내보내기 설정
export const API_ROUTE_CONFIG = {
  // 기본값을 force-dynamic으로 변경
  dynamic: 'force-dynamic' as const,
  revalidate: false,
};

// API 라우트에서 이 설정을 가져와서 export const dynamic = API_ROUTE_CONFIG.dynamic; 형태로 사용
