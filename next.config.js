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
  webpack: (config, { isServer, dev }) => {
    // 메모리 최적화를 위한 설정
    config.optimization.minimize = true;

    // 동적 require 경고 억제 - ignore-loader 문제 해결
    config.module.rules.push({
      test: /[\\/]src[\\/]server[\\/]native[\\/]index\.js$/,
      use: ['null-loader'] // ignore-loader 대신 null-loader 사용
    });

    // 개발 환경에서만 적용
    if (dev) {
      // 불필요한 모듈 무시
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ['**/node_modules', '**/.git', '**/dist', '**/native-modules/target']
      };

      // issuer 문제 해결 - 빈 객체 조건 필터링
      if (config.module && config.module.rules) {
        config.module.rules.forEach(rule => {
          if (rule.oneOf) {
            rule.oneOf.forEach(r => {
              // 1. 빈 issuer 객체 문제 해결
              if (r.issuer && Object.keys(r.issuer).length === 0) {
                // 빈 issuer 객체 제거
                delete r.issuer;
              }

              // 2. and 배열 문제 해결
              if (r.issuer && r.issuer.and) {
                if (!Array.isArray(r.issuer.and) || r.issuer.and.length === 0) {
                  delete r.issuer.and;
                } else {
                  // 유효한 요소만 필터링
                  r.issuer.and = r.issuer.and.filter(item =>
                    item !== undefined &&
                    item !== null &&
                    typeof item !== 'object'
                  );

                  // 필터링 후 배열이 비어있으면 속성 제거
                  if (r.issuer.and.length === 0) {
                    delete r.issuer.and;
                  }
                }
              }

              // 3. or 배열 처리 (issuer.or가 존재하는 경우)
              if (r.issuer && r.issuer.or) {
                if (!Array.isArray(r.issuer.or) || r.issuer.or.length === 0) {
                  delete r.issuer.or;
                } else {
                  // 유효한 요소만 필터링
                  r.issuer.or = r.issuer.or.filter(item =>
                    item !== undefined &&
                    item !== null &&
                    typeof item !== 'object'
                  );

                  if (r.issuer.or.length === 0) {
                    delete r.issuer.or;
                  }
                }
              }
            });
          }
        });
      }
    }

    return config;
  },
  images: {
    unoptimized: true // Electron 환경에서 이미지 최적화 비활성화
  },
  // 출력 경로 설정 - 개발 환경과 프로덕션 환경에 따라 다르게 설정
  // distDir을 상수로 설정하여 일관성 유지
  distDir: '.next',

  // 출력 설정 추가 - Next.js 플랫폼에 따라 출력 경로 지정
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,

  // 개발 서버에 대한 추가 최적화
  experimental: {
    // 불필요한 모듈 로딩 방지 
    optimizePackageImports: [
      'lodash',
      'react-icons',
      '@mui/material',
      '@mui/icons-material',
      'date-fns',
      'framer-motion'
    ],

    // turbo 설정 - 객체 형태로 전달
    turbo: process.env.NODE_ENV === 'development' ? {
      loaders: {}
    } : undefined
  },
};

// 명확한 CommonJS 형식으로 내보내기
module.exports = nextConfig;