/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  // 추가 설정
  typescript: {
    // 빌드 시 타입 오류 무시 (개발 시에는 오류 확인)
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  // 네이티브 모듈 관련 설정
  webpack: (config, { isServer }) => {
    // 메모리 최적화를 위한 설정
    config.optimization.minimize = true;
    
    // 네이티브 모듈 외부화 (서버 전용으로 설정)
    if (!isServer) {
      config.externals = [
        ...(config.externals || []),
        // 클라이언트 번들에서 네이티브 모듈 제외
        { 'typing_stats_native.node': 'commonjs typing_stats_native.node' }
      ];
    }
    
    // 예외 처리 개선
    config.module.rules.push({
      test: /\.node$/,
      use: [
        {
          loader: 'node-loader',
          options: {
            name: '[name].[ext]',
          },
        },
      ],
    });
    
    return config;
  },
  images: {
    unoptimized: true // Electron 환경에서 이미지 최적화 비활성화
  },
  // 개발 환경에서는 distDir 설정 비활성화
  distDir: process.env.NODE_ENV === 'development' ? '.next' : 'dist',
  // 실험적 서버 컴포넌트 설정
  experimental: {
    serverComponentsExternalPackages: ['typing_stats_native'],
  },
};

module.exports = nextConfig;