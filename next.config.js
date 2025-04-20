/** @type {import('next').NextConfig} */
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
const forceRecompile = process.env.NEXT_FORCE_RECOMPILE === 'true';

const nextConfig = {
  reactStrictMode: false,
  output: 'export',
  distDir: isDev ? '.next' : 'dist/renderer',
  images: {
    unoptimized: true,
    disableStaticImages: true
  },
  trailingSlash: true,
  // 실험적 기능 추가
  experimental: {
    // 개발 모드에서 재시작시 모듈 재로딩 보장
    forceSwcTransforms: true,
    // Next.js 최신 버전에서 문제가 있는 기능 비활성화
    turbotrace: {},
    esmExternals: 'loose', // ESM 모듈 호환성 개선
  },
  // 페이지 라우트 설정 강제 적용
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  webpack: (config, { dev, isServer }) => {
    // 개발 환경에서 더 안정적인 빌드를 위한 설정
    if (dev) {
      // 소스맵 최적화
      config.devtool = 'eval-source-map';
      
      // 빌드 캐시 설정 최적화
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        // 절대 경로로 수정
        cacheDirectory: path.resolve(__dirname, '.next/.cache'),
        // 빌드 간 의존성 변경 시 캐시 무효화
        version: `${process.env.NODE_ENV}-${forceRecompile ? Date.now() : 'stable'}`,
        // 개발 중 재시작시 캐시 관리 개선
        name: forceRecompile ? `dev-cache-${Date.now()}` : 'dev-cache',
        // 캐시 압축 비활성화로 IO 속도 향상
        compression: false,
      };
      
      // 웹팩 감시 설정 최적화
      config.watchOptions = {
        // 파일 시스템 폴링 활성화하여 더 안정적인 감지
        poll: true,
        // node_modules는 무시하되 로컬 설치된 패키지의 변경은 감지
        ignored: /node_modules\/(?!\.pnpm)/,
        aggregateTimeout: 300,
      };

      // 개발 모드에서 모듈 핫 로딩 강화
      if (!isServer) {
        config.optimization = {
          ...config.optimization,
          // 개발 모드에서는 최적화 줄여 빌드 속도 향상
          splitChunks: false,
          // 런타임 코드를 별도 청크로 분리하여 HMR 성능 개선
          runtimeChunk: 'single',
        };
      }
    }
    
    // 불필요한 번들 크기 감소 (프로덕션)
    if (!dev) {
      // 불필요한 소스맵 제거
      config.devtool = false;
    }
    
    // Electron 렌더러 프로세스와의 호환성 설정
    if (!isServer) {
      config.target = 'electron-renderer';
      
      // 네이티브 모듈 처리 설정
      config.externals = [
        ...(config.externals || []),
        {
          'better-sqlite3': 'commonjs better-sqlite3',
          'node-global-key-listener': 'commonjs node-global-key-listener',
          'electron': 'commonjs electron',
          'fs': 'commonjs fs',
          'path': 'commonjs path',
          'os': 'commonjs os',
          'http': 'commonjs http',
          'https': 'commonjs https',
          'child_process': 'commonjs child_process',
        },
      ];

      // 전역 window 객체와의 호환성 개선
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
      
      // 절대 경로 해결 개선
      config.resolve.modules = [
        ...(config.resolve.modules || []),
        path.resolve(__dirname, 'src'),
        'node_modules'
      ];
    }
    
    // React 최적화 - 모듈 중복 방지를 위해 단일 React 인스턴스 사용
    config.resolve.alias = {
      ...config.resolve.alias,
      // 'react': path.resolve(__dirname, 'node_modules/react'),
      // 'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@components': path.resolve(__dirname, 'src/app/components'),
      '@utils': path.resolve(__dirname, 'src/app/utils'),
      '@hooks': path.resolve(__dirname, 'src/app/hooks'),
      '@styles': path.resolve(__dirname, 'src/app/styles'),
    };
    
    return config;
  },
  // 불필요한 정적 최적화 비활성화 (개발 환경)
  compress: process.env.NODE_ENV !== 'development',
  // 개발 서버 설정 - 재시작시 안정성 향상
  onDemandEntries: {
    // 페이지 유지 시간(ms) 증가
    maxInactiveAge: 60 * 1000,
    // 동시에 유지할 페이지 수 증가
    pagesBufferLength: 5,
  },
};

module.exports = nextConfig;