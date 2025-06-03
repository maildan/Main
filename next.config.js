/** @type {import('next').NextConfig} */
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
console.log(`Next.js 구성: ${isDev ? '개발' : '프로덕션'} 환경`);

const nextConfig = {
  // 개발 환경에서는 output: 'export' 제외, 프로덕션에서만 적용
  ...(isDev ? {} : { output: 'export' }),
  
  // 최상위로 이동한 설정
  serverExternalPackages: ['typing_stats_native', 'active-win'],
  swcMinify: true,
  
  experimental: {
    esmExternals: true
  },
  
  // 개발 시 빌드 최적화 설정
  reactStrictMode: true,
  
  // 트레일링 슬래시 설정
  trailingSlash: true,
  
  // 이미지 최적화 설정
  images: {
    disableStaticImages: true,
    unoptimized: true
  },

  // Electron과 함께 사용하기 위한 추가 설정
  basePath: '', // 기본 경로 설정
  assetPrefix: './', // 에셋 경로 접두사

  // 개발 모드에서는 HMR을 위해 더 유연한 CSP 설정 사용
  // 프로덕션 모드에서는 보안성 높은 설정 유지
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: isDev 
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:;"
              : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          }
        ],
      },
    ];
  },

  // 웹팩 설정 커스터마이징
  webpack: (config, { dev, isServer }) => {
    // ───────────────────────────────────────────────────────────────
    // (1) 파일 워치 제외 옵션 설정 - Electron 파일 감시 제외
    // ───────────────────────────────────────────────────────────────
    config.watchOptions = {
      ignored: [
        // 프로젝트 루트 내 Electron 메인 프로세스 코드 및 바이너리 제외
        path.resolve(__dirname, 'src/main/**'),
        '**/native-modules/**',
        path.resolve(__dirname, 'dist/**'),
      ],
    };
    
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
    
    // .node 네이티브 모듈 파일 처리 규칙 추가 (클라이언트 번들에만 적용)
    if (!isServer) {
      config.module.rules.push({
        test: /\.node$/,
        use: 'null-loader'
      });

      // 네이티브 바이너리 파일 처리 규칙
      config.module.rules.push({
        test: /\.(dylib|dll|so)$/,
        use: 'null-loader'
      });
    }

    // 추가 파일 확장자 지원 (네이티브 모듈 확장자 포함)
    config.resolve.extensions.push('.node', '.dylib', '.dll', '.so');

    // 웹팩 경고 무시 설정 추가
    config.ignoreWarnings = [
      // 동적 require 경고 무시
      /Critical dependency/,
    ];

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

  // 빌드 중 소스맵 생성
  productionBrowserSourceMaps: true,
  
  // 변환 진행 중 CSP 관련 설정
  transpilePackages: ['@babel/preset-env'],

  distDir: 'dist/app',
}

module.exports = nextConfig;
