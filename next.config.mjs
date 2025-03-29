/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // esmExternals 옵션 제거: 경고 메시지로 인해 제거함
  experimental: {
    // Next.js 15.2+ 권장 설정에 맞게 조정
  },
  // 기존 설정이 있을 경우 유지하고, webpack 설정 추가
  webpack: (config, { isServer }) => {
    // 서버 사이드 빌드에만 적용
    if (isServer) {
      // Critical dependency 경고 무시
      config.module.exprContextCritical = false;
    }
    
    return config;
  },
  // 새로고침 404 오류 해결을 위한 rewrites 설정 수정
  async rewrites() {
    return [
      {
        // 모든 경로에 대한 rewrites 처리
        source: '/:path*',
        destination: '/:path*',
      },
      {
        // 루트 경로 처리
        source: '/',
        destination: '/index',
      }
    ];
  },
  // 커스텀 도메인 허용 설정
  images: {
    domains: ['eloop.kro.kr', 'staging.eloop.kro.kr']
  },
  // 출력 내보내기 옵션 추가
  output: 'standalone',
  // 트레일링 슬래시 비활성화
  trailingSlash: false,
}

export default nextConfig;
