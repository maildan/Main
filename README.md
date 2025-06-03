# Electron과 Next.js 15 애플리케이션

## CSP(Content Security Policy) 문제 해결 가이드

이 문서는 Electron과 Next.js 15를 함께 사용할 때 발생할 수 있는 Content Security Policy(CSP) 관련 문제와 해결책을 설명합니다.

### 주요 문제점

개발 모드에서 다음과 같은 CSP 관련 오류가 발생할 수 있습니다:
- `Refused to execute inline script because it violates the following Content Security Policy directive: script-src 'self'`
- 키보드 이벤트 핸들러 및 HMR(Hot Module Replacement) 작동 불가
- `electronAPI` 객체 초기화 실패
- React 개발 도구 로드 실패

### 해결 방법

#### 1. CSP 설정 최적화

프로젝트에서 CSP 설정을 개발 모드와 프로덕션 모드에 따라 다르게 적용했습니다:

- **개발 모드**: 인라인 스크립트와 eval 실행을 허용하여 HMR, React 개발 도구, 키보드 이벤트 핸들러가 정상 작동하도록 함
- **프로덕션 모드**: 보안을 강화하기 위해 엄격한 CSP 적용 (스타일 관련 `unsafe-inline`만 허용)

#### 2. 주요 변경 파일

##### `next.config.js`
- 개발/프로덕션 모드에 따라 다른 CSP 헤더 설정
- 개발 모드에서는 `unsafe-inline`과 `unsafe-eval` 허용

```javascript
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  // ...
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: isDev 
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';" // 개발 모드
              : "default-src 'self'; script-src 'self';" // 프로덕션 모드
          }
        ],
      }
    ];
  }
};
```

##### `src/main/security-checks.js`
- Electron 내에서 CSP 헤더 설정
- 모든 웹 세션에 CSP 설정 일관되게 적용
- 개발/프로덕션 환경 자동 감지 로직

```javascript
const securityHeaders = {
  'Content-Security-Policy': isDev 
    ? 'default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\';' // 개발 모드
    : 'default-src \'self\'; script-src \'self\';' // 프로덕션 모드
};

function applyCSPToAllSessions() {
  // 모든 세션에 CSP 적용
}
```

##### `src/preload/preload.js`
- `contextBridge`를 통한 `electronAPI` 노출 로직 개선
- 중복 노출 방지를 위한 플래그 추가
- 키보드 이벤트 핸들러 설정 로직 강화

```javascript
// API 노출 상태 추적 변수
let hasExposedAPI = false;

// 안전한 IPC 통신을 위한 API 노출
function exposeElectronAPI() {
  try {
    // API가 이미 노출되었는지 확인
    if (hasExposedAPI) {
      console.log('electronAPI가 이미 노출되어 있으므로 재노출하지 않습니다.');
      return;
    }
    
    // API 노출 표시
    hasExposedAPI = true;
    
    // contextBridge API 설정 (한 번만 실행)
    contextBridge.exposeInMainWorld('electronAPI', { /* ... */ });
  } catch (error) {
    // 오류 처리 및 폴백
  }
}
```

### 테스트 및 확인

수정 후 다음 사항이 정상적으로 작동하는지 확인하세요:

1. `npm run dev` 또는 `pnpm run dev`로 애플리케이션 실행
2. 콘솔에 CSP 관련 오류가 없는지 확인
3. 키보드 이벤트가 제대로 처리되는지 확인
4. HMR이 작동하는지 확인 (코드 수정 시 자동 반영)
5. React 개발 도구가 정상 로드되는지 확인

### 주의사항

- 개발 모드에서만 `unsafe-inline`과 `unsafe-eval`을 허용하고, 프로덕션에서는 보안을 강화하세요.
- CSP 설정이 Next.js와 Electron 양쪽에서 일관되게 적용되어야 합니다.
- 보안과 개발 편의성 사이의 균형을 유지하세요.

## 프로젝트 실행 방법

```bash
# 의존성 설치
npm install
# 또는
pnpm install

# 개발 모드 실행
npm run dev
# 또는
pnpm run dev

# 프로덕션 빌드
npm run build
# 또는
pnpm run build
```

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
