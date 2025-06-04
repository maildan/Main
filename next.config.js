/** @type {import('next').NextConfig} */
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';
console.log(`Next.js 구성: ${isDev ? '개발' : '프로덕션'} 환경`);

const nextConfig = {
  output: 'export',
  // 개발 환경에서는 output 설정 제거
  ...(isDev ? {} : {}),
  
  // 최상위로 이동한 설정
  serverExternalPackages: [
    'typing_stats_native', 
    'active-win', 
    'libtyping_stats_native.dylib'
  ],
  
  experimental: {
    esmExternals: true,
    // Next.js 15.3.3에서 권장하는 최신 설정
    serverActions: {
      bodySizeLimit: '2mb'
    }
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
  assetPrefix: '/', // 정적 에셋 접두사 - 슬래시로 시작하는 경로로 수정

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
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss: http: https:;"
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
    console.log(`웹팩 설정 커스터마이징: ${dev ? '개발' : '프로덕션'} 모드`);
    
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
      poll: isDev ? 500 : 1000, // 개발 환경에서 더 빠른 폴링 간격 적용
    };
    
    // ───────────────────────────────────────────────────────────────
    // (2) 외부 종속성 처리 (번들에 포함하지 않음)
    // ───────────────────────────────────────────────────────────────
    config.externals.push({
      'electron': 'commonjs electron',
      'electron-is-dev': 'commonjs electron-is-dev',
      'typing_stats_native': 'commonjs typing_stats_native',
      'active-win': 'commonjs active-win'
    });
    
    // 네이티브 모듈(.node/.dylib)을 외부로 처리
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        function({ request }, callback) {
          // .node 또는 .dylib 확장자를 가진 파일을 외부 모듈로 처리
          if (request && (request.endsWith('.node') || request.endsWith('.dylib') || 
              request.includes('native-modules') || request.includes('libtyping_stats_native'))) {
            console.log(`외부 모듈로 처리: ${request}`);
            return callback(null, 'commonjs ' + request);
          }
          callback();
        },
      ];
    }
    
    // ───────────────────────────────────────────────────────────────
    // (3) 모듈 별칭 (alias) 설정
    // ───────────────────────────────────────────────────────────────
    config.resolve.alias = {
      ...config.resolve.alias,
      '@app': path.resolve(__dirname, 'src/app/'),
      '@components': path.resolve(__dirname, 'src/app/components/'),
      '@pages': path.resolve(__dirname, 'src/app/pages/'),
      '@styles': path.resolve(__dirname, 'src/app/styles/'),
      '@utils': path.resolve(__dirname, 'src/app/utils/'),
      '@hooks': path.resolve(__dirname, 'src/app/hooks/'),
      '@constants': path.resolve(__dirname, 'src/app/constants/'),
      '@assets': path.resolve(__dirname, 'public/'),
    };

    // 웹팩 경고 무시 설정 추가
    config.ignoreWarnings = [
      // 동적 require 경고 무시
      /Critical dependency/,
    ];

    // 개발 및 프로덕션 환경에 맞는 devtool 설정
    if (dev) {
      console.log('개발 모드: Next.js 기본 devtool 설정 사용');
      // Next.js 15.3.3에서는 기본 설정 사용
    } else {
      // 프로덕션 모드에서는 소스맵 비활성화
      config.devtool = false;
    }

    // 웹팩에 WASM 지원 추가
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },

  // 빌드 중 소스맵 생성
  productionBrowserSourceMaps: true,

  // 변환 진행 중 CSP 관련 설정
  transpilePackages: ['@babel/preset-env'],

  distDir: 'dist/app',

  // 웹소켓 연결 문제 해결을 위한 환경 변수 설정
  env: {
    WS_RETRY_COUNT: '5',
    WS_RETRY_INTERVAL: '1000',
    NEXT_HMR_ENDPOINT: 'localhost:3000',
  },

  // Next.js 서버 설정
  onDemandEntries: {
    // 페이지 캐싱 시간 설정 (ms)
    maxInactiveAge: 60 * 1000,
    // 동시에 준비된 상태로 유지할 페이지 수
    pagesBufferLength: 5,
  },
}

// 클라이언트에서 웹소켓 연결 재시도 스크립트 생성
const fs = require('fs');
const websocketDir = path.join(__dirname, 'client', 'dev');
const websocketFile = path.join(websocketDir, 'websocket.js');

try {
  if (!fs.existsSync(websocketDir)) {
    fs.mkdirSync(websocketDir, { recursive: true });
  }
  
  // 웹소켓 연결 재시도 스크립트 작성
  const websocketScript = `
// HMR 웹소켓 연결 문제 해결을 위한 스크립트
// Next.js의 webpack HMR 웹소켓 연결이 실패하는 문제를 해결합니다.
(function() {
  console.log('[Loop] HMR 웹소켓 연결 설정 중...');
  
  // 현재 스크립트가 브라우저 환경에서 실행되는지 확인
  if (typeof window === 'undefined') return;
  
  // 이미 WebSocket이 패치되어 있다면 중복 실행 방지
  if (window.__LOOP_PATCHED_WEBSOCKET__) return;
  window.__LOOP_PATCHED_WEBSOCKET__ = true;
  
  // 원본 WebSocket 저장
  const OriginalWebSocket = window.WebSocket;
  
  // 재시도 가능한 WebSocket 구현
  class RetryWebSocket extends OriginalWebSocket {
    constructor(url, protocols) {
      super(url, protocols);
      
      this.url = url;
      this.protocols = protocols;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectInterval = 1000;
      
      this.setupListeners();
    }
    
    setupListeners() {
      // 에러 처리
      this.addEventListener('error', (event) => {
        console.warn('[Loop] WebSocket 연결 오류:', event);
        this.tryReconnect();
      });
      
      // 연결 종료 처리
      this.addEventListener('close', (event) => {
        if (event.code !== 1000) { // 정상 종료가 아닌 경우에만 재연결
          console.warn('[Loop] WebSocket 연결이 닫힘. 코드:', event.code);
          this.tryReconnect();
        }
      });
      
      // 연결 성공 처리
      this.addEventListener('open', () => {
        console.log('[Loop] WebSocket 연결 성공:', this.url);
        this.reconnectAttempts = 0;
      });
    }
    
    tryReconnect() {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        
        console.log(
          \`[Loop] WebSocket 재연결 시도 \${this.reconnectAttempts}/\${this.maxReconnectAttempts}...\`
        );
        
        setTimeout(() => {
          try {
            // 다시 연결 시도
            super.close();
            Object.setPrototypeOf(this, OriginalWebSocket.prototype);
            OriginalWebSocket.call(this, this.url, this.protocols);
            this.setupListeners();
          } catch (err) {
            console.error('[Loop] WebSocket 재연결 실패:', err);
          }
        }, this.reconnectInterval * this.reconnectAttempts);
      } else {
        console.warn('[Loop] 최대 재연결 시도 횟수 초과, 웹소켓 연결 중단');
      }
    }
  }
  
  // 특정 URL만 패치된 WebSocket 사용 (webpack-hmr 관련 URL만)
  window.WebSocket = function(url, protocols) {
    if (url.includes('webpack-hmr')) {
      console.log('[Loop] 패치된 WebSocket 사용:', url);
      return new RetryWebSocket(url, protocols);
    } else {
      return new OriginalWebSocket(url, protocols);
    }
  };
  
  // 원본 웹소켓 속성 복사
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
})();
  `;
  
  fs.writeFileSync(websocketFile, websocketScript);
  console.log('웹소켓 재연결 스크립트가 생성되었습니다:', websocketFile);
} catch (err) {
  console.error('웹소켓 스크립트 생성 오류:', err);
}

module.exports = nextConfig;
