/** @type {import('next').NextConfig} */
module.exports = {
  // 웹팩 설정 커스터마이징
  webpack: (config, { dev, isServer }) => {
    // 서버 사이드 번들링에서 네이티브 모듈 외부화 처리
    if (isServer) {
      // webpack-node-externals 패키지 사용
      const nodeExternals = require('webpack-node-externals');
      
      // 기존 externals 설정을 배열로 변환
      const externals = [...(Array.isArray(config.externals) 
        ? config.externals 
        : config.externals ? [config.externals] : [])];
      
      // webpack-node-externals 설정 추가
      externals.push(nodeExternals({
        allowlist: [
          /^next/,
          /^@next/,
          /^react/,
          /^react-dom/,
          /^@babel\/runtime/,
          /^styled-jsx/
        ]
      }));
      
      // 특정 네이티브 모듈 외부화 (동적 require 문제 해결)
      externals.push({
        'active-win': 'commonjs active-win',
        '../native-modules/target/debug/typing_stats_native.node': 'commonjs ../native-modules/target/debug/typing_stats_native.node',
        '../native-modules/target/release/typing_stats_native.node': 'commonjs ../native-modules/target/release/typing_stats_native.node',
        '../native-modules/libtyping_stats_native.dylib': 'commonjs ../native-modules/libtyping_stats_native.dylib',
        '../native-modules/libtyping_stats_native.so': 'commonjs ../native-modules/libtyping_stats_native.so',
        '../native-modules/typing_stats_native.dll': 'commonjs ../native-modules/typing_stats_native.dll'
      });
      
      // 업데이트된 externals 설정 적용
      config.externals = externals;
    }
    
    // .node 네이티브 모듈 파일 처리 규칙 추가
    config.module.rules.push({
      test: /\.node$/,
      use: 'null-loader'
    });

    // 네이티브 바이너리 파일 처리 규칙
    config.module.rules.push({
      test: /\.(dylib|dll|so)$/,
      use: 'null-loader'
    });

    // 추가 파일 확장자 지원 (네이티브 모듈 확장자 포함)
    config.resolve.extensions.push('.node', '.dylib', '.dll', '.so');

    // 개발 모드에서 CSP 호환 설정
    if (dev) {
      // Next.js 개발 모드에서도 작동하는 설정
      // eval 대신 소스맵 형태로 디버깅할 수 있게 설정
      // 'eval'을 사용하면 CSP 오류 발생
      config.devtool = 'source-map';
      
      // 최적화 비활성화 - 개발 모드 성능 향상
      config.optimization = {
        ...config.optimization,
        minimize: false,        // 개발에서는 최소화 불필요
        runtimeChunk: true,     // 런타임 청크 활성화 (HMR 지원)
        splitChunks: {          // 모듈 분할 간소화
          cacheGroups: {
            default: false,
            vendors: false,
          },
        },
      };
      
      // CSP 호환을 위한 인라인 스크립트 처리
      config.module.rules.push({
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['next/babel'],
          },
        },
      });
    } else {
      // 프로덕션 환경에서는 CSP 호환 설정
      config.devtool = 'source-map';
    }
    
    return config;
  },

  // CSP 헤더 설정
  async headers() {
    // 개발 환경인지 확인
    const isDev = process.env.NODE_ENV === 'development';
    
    // 개발 환경에서는 완전 개방된 CSP 헤더 설정
    if (isDev) {
      console.log('Next.js: 개발 환경 - 완전 개방된 CSP 헤더 설정');
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy',
              value: "default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src * data: blob:; font-src * data:; connect-src * ws: wss:; media-src * data: blob:;"
            }
          ]
        }
      ];
    }
    
    // 프로덕션 환경에서만 엄격한 CSP 헤더 설정
    console.log('Next.js: 프로덕션 환경 - 엄격한 CSP 헤더 설정');
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline'; " + // 프로덕션에서도 'unsafe-inline' 허용
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

  // 기타 Next.js 설정
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
    unoptimized: true
  },

  // 개발 환경에서 추가 설정
  experimental: {
    esmExternals: true
  },

  // 변환 진행 중 CSP 관련 설정
  transpilePackages: ['@babel/preset-env'],

  // 출력 내보내기 설정
  output: 'export',

  // 트레일링 슬래시 설정
  trailingSlash: true,
}
