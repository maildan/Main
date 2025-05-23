/** @type {import('next').NextConfig} */
module.exports = {
  // 웹팩 설정 커스터마이징
  webpack: (config, { dev, isServer }) => {
    // 개발 모드에서는 Next.js 기본 설정 유지 (경고 방지)
    if (dev) {
      // devtool 설정은 Next.js의 기본값 그대로 유지
      // config.devtool = 'eval-source-map'; // 이 설정은 경고를 발생시킴
      
      // 대신 불필요한 런타임 확인 비활성화로 성능 개선
      config.optimization = {
        ...config.optimization,
        // 개발 모드에서만 React 최적화 끄기 (빌드 속도 향상)
        nodeEnv: false, // 기본 nodeEnv를 사용하지 않음
        usedExports: !dev, // dev 모드에서는 사용하지 않음
        removeAvailableModules: !dev, // dev 모드에서는 사용하지 않음
      };
      
      // Fast Refresh 관련 설정 유지
      config.module.rules.forEach((rule) => {
        if (rule.use && Array.isArray(rule.use)) {
          rule.use.forEach((r) => {
            if (r.loader && r.loader.includes('next/dist/build/webpack/loaders/next-swc-loader')) {
              // SWC 설정 보존
              if (r.options && r.options.hasOwnProperty('isReactRefresh')) {
                r.options.isReactRefresh = true;
              }
            }
          });
        }
      });
    } else {
      // 프로덕션 환경에서는 source-map 사용
      config.devtool = 'source-map';
    }
    
    return config;
  },

  // CSP 헤더 설정
  async headers() {
    // 개발 환경인지 확인
    const isDev = process.env.NODE_ENV === 'development';
    
    // 개발 환경에서는 CSP 헤더를 설정하지 않음
    if (isDev) {
      console.log('개발 환경: CSP 헤더 미설정');
      return [];
    }
    
    // 프로덕션 환경에서만 CSP 헤더 설정
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; " +
              "script-src 'self'; " +
              "connect-src 'self'; " +
              "img-src 'self' data: blob:; " +
              "style-src 'self' 'unsafe-inline'; " +
              "font-src 'self' data:; " +
              "frame-src 'self';"
          }
        ]
      }
    ];
  },

  // Next.js 설정
  reactStrictMode: false,
  
  // 빌드 설정
  distDir: 'build',
  
  // 빌드 중 소스맵 생성
  productionBrowserSourceMaps: true,
  
  // 이미지 최적화 설정
  images: {
    domains: ['localhost'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 개발 환경에서 추가 설정
  experimental: {
    esmExternals: true
  },

  // 변환 진행 중 CSP 관련 설정
  transpilePackages: ['@babel/preset-env'],
}
