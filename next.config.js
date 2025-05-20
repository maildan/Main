/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
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

    // 동적 require 경고 억제 - ignore-loader 문제 해결
    config.module.rules.push({
      test: /[\\/]src[\\/]server[\\/]native[\\/]index\.js$/,
      use: ['null-loader'] // ignore-loader 대신 null-loader 사용
    });

    return config;
  },
  images: {
    unoptimized: true // Electron 환경에서 이미지 최적화 비활성화
  },
  // 개발 환경에서는 distDir 설정 비활성화
  distDir: process.env.NODE_ENV === 'development' ? '.next' : 'dist',
  experimental: {
    esmExternals: false, // webpack ESM 모듈 처리 문제 해결을 위한 설정
  },
};

// 명확한 CommonJS 형식으로 내보내기
module.exports = nextConfig;