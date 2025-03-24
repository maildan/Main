/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: process.env.NODE_ENV === 'development',
  // 불필요한 소스맵 생성 제한 (빌드 시간 단축)
  
  typescript: {
    // 개발 환경에서도 타입 체크는 백그라운드로 진행 (빠른 새로고침)
    ignoreBuildErrors: true,
  },
  
  // 최적화 설정
  swcMinify: true,
  compiler: {
    // 불필요한 console.log 제거 (프로덕션에서)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // 이미지 최적화 제한 (Electron에서는 불필요)
  images: {
    unoptimized: true
  },
  
  // Webpack 최적화
  webpack: (config, { isServer, dev }) => {
    // 메모리 최적화를 위한 설정
    config.optimization.minimize = !dev;
    
    if (!isServer) {
      // 클라이언트 번들에서 네이티브 모듈 제외
      config.externals = [
        ...(config.externals || []),
        { 'typing_stats_native.node': 'commonjs typing_stats_native.node' }
      ];
    }
    
    // 네이티브 모듈 로더 설정
    config.module.rules.push({
      test: /\.node$/,
      use: [{ loader: 'node-loader' }],
    });
    
    // 성능 최적화 - 번들 크기 제한 완화
    config.performance = {
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    };

    // 캐시 최적화
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    
    return config;
  },
  
  // 실험적 옵션 (오류 수정)
  experimental: {
    // serverComponentsExternalPackages에서 serverExternalPackages로 변경
    serverExternalPackages: ['typing_stats_native'],
    // 빌드 캐시 활성화
    turbotrace: {
      logLevel: 'error',
    },
    // 컴파일러 메모리 제한 증가
    memoryLimit: 4096, // MB
  },
};

module.exports = nextConfig;