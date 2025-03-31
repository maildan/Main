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
}

export default nextConfig;