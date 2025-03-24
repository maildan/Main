/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  // 추가 설정
  typescript: {
    // 빌드 시 타입 오류 무시 (개발 시에는 오류 확인)
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  // 번들 분석 설정 (필요시 활성화)
  webpack: (config, { isServer }) => {
    // 메모리 최적화를 위한 설정
    config.optimization.minimize = true;
    
    return config;
  },
  images: {
    unoptimized: true // Electron 환경에서 이미지 최적화 비활성화
  },
  // 개발 환경에서는 distDir 설정 비활성화
  distDir: process.env.NODE_ENV === 'development' ? '.next' : 'dist'
};

module.exports = nextConfig;