# Loop 프로젝트 완전 분석 문서 (TypeScript + JavaScript)

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [프로젝트 구조](#2-프로젝트-구조)
3. [메인 프로세스 (Electron)](#3-메인-프로세스-electron)
4. [렌더러 프로세스 (Next.js)](#4-렌더러-프로세스-nextjs)
5. [공통 유틸리티](#5-공통-유틸리티)
6. [데이터베이스 계층](#6-데이터베이스-계층)
7. [네이티브 모듈](#7-네이티브-모듈)
8. [빌드 및 배포](#8-빌드-및-배포)
9. [테스트 전략](#9-테스트-전략)
10. [성능 최적화](#10-성능-최적화)

## 1. 프로젝트 개요

Loop는 Electron, React, Next.js를 기반으로 한 크로스 플랫폼 데스크톱 애플리케이션입니다. TypeScript와 JavaScript를 모두 사용하여 개발되었으며, 메인 프로세스는 JavaScript로, 렌더러 프로세스는 TypeScript로 작성되었습니다.

### 기술 스택
- **런타임**: Node.js, Electron
- **프론트엔드**: React 18, Next.js 13+, TypeScript
- **상태 관리**: React Context, Zustand
- **스타일링**: CSS Modules, Tailwind CSS
- **데이터베이스**: SQLite (메인), MongoDB/Supabase (옵션)
- **테스팅**: Jest, React Testing Library
- **빌드 도구**: Webpack, Vite

## 2. 프로젝트 구조

```
loop_3/
├── src/
│   ├── app/                  # Next.js 앱 라우터 (TypeScript)
│   │   ├── api/             # API 라우트
│   │   ├── components/       # 재사용 가능한 컴포넌트
│   │   ├── lib/             # 프론트엔드 유틸리티
│   │   └── pages/           # 페이지 컴포넌트
│   │
│   ├── main/               # Electron 메인 프로세스 (JavaScript)
│   │   ├── handlers/       # IPC 핸들러
│   │   ├── workers/        # 워커 스레드
│   │   └── *.js            # 핵심 모듈
│   │
│   ├── renderer/          # 렌더러 프로세스 (TypeScript)
│   │   ├── components/    # 렌더러 전용 컴포넌트
│   │   └── stores/        # 상태 관리
│   │
│   └── shared/            # 공통 유틸리티 (TypeScript)
│       ├── constants/    # 상수 정의
│       ├── types/        # 타입 정의
│       └── utils/        # 유틸리티 함수
│
├── scripts/               # 빌드 및 유틸리티 스크립트
├── public/                # 정적 파일
└── tests/                 # 테스트 코드
```

## 3. 메인 프로세스 (Electron)

### 3.1 핵심 모듈 (JavaScript)

#### 3.1.1 main/
- **app-lifecycle.js**: 애플리케이션 생명주기 관리
- **window.js**: 브라우저 윈도우 관리
- **menu.js**: 애플리케이션 메뉴
- **tray.js**: 시스템 트레이 아이콘
- **updates.js**: 자동 업데이트
- **database.js**: SQLite 데이터베이스 연동

#### 3.1.2 handlers/
- **ipc-handlers.js**: IPC 통신 핸들러
- **window-handlers.js**: 창 관련 이벤트 처리
- **keyboard-handlers.js**: 키보드 이벤트 처리
- **settings-handlers.js**: 설정 변경 처리

### 3.2 네이티브 통합
- **clipboard-watcher.js**: 클립보드 모니터링
- **gpu-utils.js**: GPU 가속 유틸리티
- **power-monitor.js**: 전원 상태 모니터링

## 4. 렌더러 프로세스 (Next.js)

### 4.1 페이지 (TypeScript)
- **app/page.tsx**: 메인 페이지
- **app/settings/page.tsx**: 설정 페이지
- **app/analytics/page.tsx**: 분석 대시보드

### 4.2 컴포넌트 (TypeScript)
- **components/ui/**: 재사용 가능한 UI 컴포넌트
- **components/layout/**: 레이아웃 컴포넌트
- **features/**: 기능별 컨테이너 컴포넌트

## 5. 공통 유틸리티

### 5.1 TypeScript 유틸리티
- **shared/types/**: 공통 타입 정의
- **shared/utils/**: 유틸리티 함수
- **shared/constants/**: 상수 정의

### 5.2 JavaScript 유틸리티
- **main/utils/**: 메인 프로세스 유틸리티
- **scripts/**: 개발 및 빌드 스크립트

## 6. 데이터베이스 계층

### 6.1 SQLite (메인 데이터베이스)
- **database.js**: 데이터베이스 초기화 및 쿼리
- **migrations/**: 데이터베이스 마이그레이션

### 6.2 외부 데이터베이스
- **lib/mongodb.js**: MongoDB 연결 유틸리티
- **lib/supabase.js**: Supabase 클라이언트
- **lib/prisma.ts**: Prisma ORM 설정

## 7. 네이티브 모듈

### 7.1 Rust 네이티브 모듈
- **native/**: Rust로 작성된 고성능 모듈
- **binding.gyp**: 네이티브 바인딩 설정

### 7.2 Node.js 애드온
- **build/**: 컴파일된 네이티브 모듈
- **scripts/install-native.js**: 네이티브 모듈 설치 스크립트

## 8. 빌드 및 배포

### 8.1 개발 환경 설정
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 8.2 프로덕션 빌드
```bash
# Next.js 빌드
npm run build

# Electron 패키징
npm run package
```

## 9. 테스트 전략

### 9.1 유닛 테스트
```bash
# 모든 테스트 실행
npm test

# 특정 테스트 파일 실행
npm test -- src/main/__tests__/database.test.js
```

### 9.2 E2E 테스트
```bash
# E2E 테스트 실행
npm run test:e2e
```

## 10. 성능 최적화

### 10.1 메모리 최적화
- 메모리 누수 방지
- 대용량 데이터 처리 최적화

### 10.2 렌더링 최적화
- 가상 스크롤 적용
- 불필요한 리렌더링 방지

### 10.3 번들 최적화
- 코드 스플리팅
- 트리 쉐이킹 적용

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [아키텍처 개요](#2-아키텍처-개요)
3. [메인 프로세스 모듈](#3-메인-프로세스-모듈)
4. [렌더러 프로세스 컴포넌트](#4-렌더러-프로세스-컴포넌트)
5. [데이터 흐름 및 상호작용](#5-데이터-흐름-및-상호작용)
6. [성능 최적화](#6-성능-최적화)
7. [보안 고려사항](#7-보안-고려사항)
8. [테스트 전략](#8-테스트-전략)
9. [배포 및 유지보수](#9-배포-및-유지보수)

## 1. 프로젝트 개요

### 1.1 API 엔드포인트

#### 1.1.1 로그 관련 API
- **GET /api/getLogs**
  - 설명: 애플리케이션 로그를 조회합니다.
  - 파라미터: 
    - `level` (선택): 로그 레벨 필터 (info, warn, error)
    - `limit` (선택): 조회할 로그 수 제한
  - 응답: 로그 항목 배열

- **POST /api/logs/save**
  - 설명: 새로운 로그 항목을 저장합니다.
  - 요청 본문: 
    ```json
    {
      "level": "info|warn|error",
      "message": "로그 메시지",
      "metadata": {}
    }
    ```

#### 1.1.2 데이터베이스 API
- **GET /api/init-db**
  - 설명: 데이터베이스를 초기화합니다.
  - 관리자 권한 필요

- **GET /api/db-test**
  - 설명: 데이터베이스 연결을 테스트합니다.
  - 응답: 연결 상태 및 통계

#### 1.1.3 네이티브 통합 API
- **GET /api/native/status**
  - 설명: 시스템 상태 정보를 반환합니다.
  - 응답: CPU, 메모리, 디스크 사용량 등

- **GET /api/native/gpu**
  - 설명: GPU 정보와 설정을 조회합니다.
  - 응답: GPU 모델, 메모리 사용량, 지원 기능 등

- **POST /api/native/memory/optimize**
  - 설명: 메모리 최적화를 수행합니다.
  - 관리자 권한 필요

### 1.2 주요 컴포넌트

#### 1.2.1 UI 컴포넌트
- **AppHeader**
  - 경로: `/components/AppHeader.tsx`
  - 기능: 메인 네비게이션 바, 테마 전환, 사용자 메뉴
  - 상태: 현재 경로, 사용자 정보, 테마 설정

- **Settings**
  - 경로: `/components/Settings.tsx`
  - 기능: 애플리케이션 설정 관리
  - 설정 항목: 테마, 알림, 성능, 개인정보

- **DebugPanel**
  - 경로: `/components/DebugPanel.tsx`
  - 기능: 디버그 정보 표시, 시스템 상태 모니터링
  - 표시 정보: 메모리 사용량, CPU 사용량, 네트워크 상태

- **LogAnalysisPanel**
  - 경로: `/components/LogAnalysisPanel.tsx`
  - 기능: 애플리케이션 로그 분석 및 필터링
  - 필터 옵션: 로그 레벨, 시간대, 키워드

#### 1.2.2 기능 컴포넌트
- **MemoryMonitor**
  - 경로: `/components/MemoryMonitor.tsx`
  - 기능: 실시간 메모리 사용량 모니터링
  - 시각화: 차트를 통한 사용량 추이 표시

- **GPUSettingsPanel**
  - 경로: `/components/GPUSettingsPanel.tsx`
  - 기능: GPU 가속 설정 관리
  - 설정 항목: 하드웨어 가속, 렌더링 품질

- **TypingAnalyzer**
  - 경로: `/components/TypingAnalyzer.tsx`
  - 기능: 타이핑 패턴 분석
  - 분석 항목: 속도, 정확도, 흐름

- **TypingBox**
  - 경로: `/components/TypingBox.tsx`
  - 기능: 타이핑 입력 영역
  - 특징: 자동 완성, 구문 강조

#### 1.2.3 유틸리티 컴포넌트
- **ThemeProvider**
  - 경로: `/components/ThemeProvider.tsx`
  - 기능: 테마 관리 컨텍스트 제공
  - 지원 테마: 라이트, 다크, 시스템

- **Toast**
  - 경로: `/components/Toast.tsx`
  - 기능: 사용자 알림 표시
  - 유형: 성공, 경고, 오류, 정보

- **RestartPrompt**
  - 경로: `/components/RestartPrompt.tsx`
  - 기능: 애플리케이션 재시작 안내
  - 사용 사례: 업데이트 후 재시작 필요 시

### 1.3 프로젝트 개요

Loop는 현대적인 데스크톱 애플리케이션으로, Electron, React, Next.js, Rust를 결합한 하이브리드 아키텍처를 채택하고 있습니다. 이 애플리케이션은 사용자 생산성 향상을 위한 다양한 기능을 제공하며, 고성능과 안정성을 위해 설계되었습니다.

### 핵심 기능

- **다중 창 모드 지원**: 전체 화면, 자동 숨김, 창 모드 등 다양한 디스플레이 옵션
- **시스템 리소스 모니터링**: 메모리, GPU 사용량 등 시스템 자원 실시간 추적
- **네이티브 모듈 통합**: Rust 기반 고성능 모듈과의 연동
- **자동 업데이트**: 자동 업데이트 및 패치 시스템
- **크로스 플랫폼**: Windows, macOS, Linux 지원
- **보안 강화**: 샌드박싱, CSP, 보안 헤더 등 다양한 보안 조치 적용

# 데이터베이스 솔루션 비교

## 1.1 SQLite3

### 장점
- **임베디드 데이터베스**: 서버 설정 불필요
- **제로 설정**: 설치 즉시 사용 가능
- **단일 파일**: 백업 및 이전이 용이
- **ACID 준수**: 트랜잭션 안정성 보장

### 단점
- **동시 접속 제한**: 단일 쓰기만 가능
- **확장성 제한**: 분산 환경에 부적합
- **네트워크 접근 불가**: 로컬에서만 동작

### 사용 사례
- 로컬 캐시
- 모바일 앱
- 임베디드 시스템

## 1.2 MongoDB

### 장점
- **유연한 스키마**: JSON 형태의 문서 저장
- **수평적 확장**: 샤딩으로 대용량 처리
- **고성능**: 읽기/쓰기 처리량이 높음
- **풍부한 쿼리 언어**: 강력한 집계 파이프라인

### 단점
- **메모리 사용량이 높음**: 인덱스를 메모리에 유지
- **트랜잭션 성능**: 다중 문서 트랜잭션에서 성능 저하
- **스키마 관리**: 유연성으로 인한 데이터 무결성 문제

### 사용 사례
- 실시간 분석
- 콘텐츠 관리 시스템
- 사용자 프로필 저장소

## 1.3 Supabase

### 장점
- **PostgreSQL 기반**: 완전한 SQL 기능 지원
- **실시간 구독**: WebSocket을 통한 실시간 업데이트
- **내장 인증**: JWT 기반 인증 시스템
- **자동 API 생성**: 데이터베이스 스키마에서 즉시 REST API 생성

### 단점
- **서버 의존성**: 인터넷 연결 필요
- **비용**: 대용량 트래픽 시 비용 증가
- **제한된 NoSQL 기능**: 문서 기반 쿼리가 제한적

### 사용 사례
- 웹/모바일 앱 백엔드
- 실시간 협업 도구
- 인증/권한 관리가 필요한 서비스

## 1.4 비교 표

| 기능 | SQLite3 | MongoDB | Supabase |
|------|---------|---------|----------|
| 데이터 모델 | 관계형 | 문서형 | 관계형 + JSONB |
| 확장성 | 낮음 | 높음 | 중간-높음 |
| 실시간 기능 | 제한적 | Change Streams | 실시간 구독 |
| 인증 | 외부 연동 필요 | 외부 연동 필요 | 내장 인증 |
| 배포 용이성 | 매우 쉬움 | 중간 | 쉬움 |
| 로컬 개발 | 완벽 지원 | 서버 필요 | 로컬 개발 가능 |
| 트랜잭션 | 지원 | 다중 문서 트랜잭션 | 완전한 ACID |
| 비용 | 무료 | 유료 클라우드 | 무료 티어 제공 |

# 프로젝트 구조 문서화

## 2.1 디렉토리 구조

```
loop_3/
├── src/
│   ├── app/                  # Next.js 애플리케이션
│   │   ├── components/       # 재사용 가능한 UI 컴포넌트
│   │   ├── pages/            # 라우트 페이지
│   │   └── styles/           # 전역 스타일
│   │
│   ├── lib/                # 유틸리티 및 헬퍼 함수
│   │   ├── api/             # API 클라이언트
│   │   ├── hooks/           # 커스텀 React 훅
│   │   └── utils/           # 유틸리티 함수
│   │
│   └── main/               # 메인 프로세스 코드
│       ├── handlers/         # IPC 핸들러
│       ├── workers/          # 워커 스레드
│       └── *.js              # 핵심 모듈
│
├── public/                # 정적 자원
└── docs/                   # 프로젝트 문서
```

## 2.2 주요 파일 설명

### 2.2.1 메인 프로세스 (`src/main/`)

- `main.js`: Electron 앱의 진입점
- `database.js`: 데이터베이스 연동 모듈
- `window.js`: 창 관리 모듈
- `keyboard.js`: 키보드 입력 처리
- `updates.js`: 자동 업데이트 처리

### 2.2.2 렌더러 프로세스 (`src/app/`)

- `components/`
  - `Layout/`: 페이지 레이아웃 컴포넌트
  - `UI/`: 공통 UI 컴포넌트
  - `Stats/`: 통계 관련 컴포넌트
  - `Settings/`: 설정 패널 컴포넌트

- `pages/`
  - `_app.js`: Next.js 앱 래퍼
  - `_document.js`: HTML 문서 템플릿
  - `index.js`: 메인 페이지
  - `settings.js`: 설정 페이지

### 2.2.3 공통 라이브러리 (`src/lib/`)

- `api/`: API 클라이언트 설정
- `hooks/`: 커스텀 React 훅
- `utils/`: 유틸리티 함수 모음
  - `formatters.js`: 데이터 포맷팅
  - `validators.js`: 입력 검증
  - `storage.js`: 로컬 스토리지 래퍼

## 2.3 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (Next.js)              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ Components  │  │   Pages     │  │     Hooks        │  │
│  │             │  │             │  │                  │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                           │ IPC
┌───────────────────────────▼───────────────────────────────┐
│                    Main Process (Electron)               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  Core       │  │  Services   │  │  Native Modules  │  │
│  │  Modules    │  │             │  │  (Rust/C++)      │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                           │ System API
┌───────────────────────────▼───────────────────────────────┐
│                    System Resources                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  File       │  │  Network    │  │  Hardware        │  │
│  │  System     │  │  Stack      │  │  Acceleration   │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 2.4 데이터 흐름

1. **초기 로드**
   - 메인 프로세스가 데이터베이스에서 초기 데이터 로드
   - IPC를 통해 렌더러 프로세스로 전달
   - React Context에 상태 저장

2. **사용자 상호작용**
   - 사용자 입력 → 이벤트 핸들러 → 상태 업데이트
   - 변경 사항을 메인 프로세스로 전달
   - 데이터베이스에 비동기 저장

3. **실시간 업데이트**
   - WebSocket을 통한 실시간 데이터 동기화
   - 상태 변경 시 관련 컴포넌트 자동 리렌더링

## 2.5 의존성 관리

### 주요 의존성

#### 메인 프로세스
- `electron`: 데스크톱 앱 프레임워크
- `better-sqlite3`: SQLite3 바인딩
- `electron-updater`: 자동 업데이트
- `electron-log`: 로깅 유틸리티

#### 렌더러 프로세스
- `next`: React 프레임워크
- `react-query`: 서버 상태 관리
- `tailwindcss`: 유틸리티 우선 CSS 프레임워크
- `framer-motion`: 애니메이션 라이브러리

#### 공통
- `typescript`: 타입 안전성
- `eslint`: 코드 품질 관리
- `prettier`: 코드 포맷팅

## 2.6 개발 워크플로우

1. **로컬 개발**
   ```bash
   # 개발 서버 실행
   npm run dev
   
   # 메인 프로세스 디버깅
   npm run electron:dev
   ```

2. **빌드**
   ```bash
   # 프로덕션 빌드
   npm run build
   
   # 패키징
   npm run package
   ```

3. **테스트**
   ```bash
   # 유닛 테스트
   npm test
   
   # E2E 테스트
   npm run test:e2e
   ```

## 2.7 배포 전략

### 데스크톱 앱
- Electron Builder를 사용한 플랫폼별 패키징
- 코드 서명 적용
- 자동 업데이트 구성

### 웹 버전
- Vercel 또는 Netlify에 호스팅
- CDN 캐싱 전략
- 성능 모니터링 도구 연동

## 2.8 모니터링 및 분석

### 성능 메트릭
- 렌더링 성능
- 메모리 사용량
- CPU 사용량

### 사용자 분석
- 기능 사용 통계
- 오류 추적
- 사용자 흐름 분석

## 2.9 보안 고려사항

### 데이터 보호
- 민감 데이터 암호화
- 안전한 자격 증명 저장
- HTTPS 통신 강제

### 앱 보안
- 컨텐츠 보안 정책(CSP)
- XSS 방어
- CSRF 보호

## 2.10 확장성 계획

### 단기 계획
- 플러그인 시스템 추가
- 테마 지원 강화
- 추가 데이터 내보내기 형식 지원

### 장기 계획
- 클라우드 동기화
- 모바일 앱 출시
- AI 기반 타이핑 분석

### 2.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (Next.js)               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ Components  │  │   Pages     │  │     Hooks        │  │
│  │             │  │             │  │                  │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                           │ IPC
┌───────────────────────────▼───────────────────────────────┐
│                    Main Process (Electron)               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  Core       │  │  Services   │  │  Native Modules  │  │
│  │  Modules    │  │             │  │  (Rust/C++)      │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                           │ System API
┌───────────────────────────▼───────────────────────────────┐
│                    System Resources                         │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐     │
│  │  File       │  │  Network    │  │  Hardware        │     │
│  │  System     │  │  Stack      │  │  Acceleration    │     │
│  └─────────────┘  └─────────────┘  └──────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 디렉토리 구조

```
src/
├── app/                    # Next.js 애플리케이션
│   ├── components/         # 재사용 가능한 UI 컴포넌트
│   ├── pages/              # 라우트 페이지
│   └── styles/             # 전역 스타일
├── main/                   # 메인 프로세스 코드
│   ├── handlers/           # IPC 핸들러
│   ├── workers/            # 워커 스레드
│   └── *.js                # 핵심 모듈
└── shared/                 # 공유 유틸리티
```

## 3. 메인 프로세스 모듈

### 3.1 핵심 모듈

#### 3.1.1 main.js
- **역할**: 애플리케이션의 진입점
- **주요 기능**:
  - 메인 프로세스 초기화
  - 모듈 의존성 주입
  - 이벤트 핸들러 설정
  - 예외 처리

#### 3.1.2 app-lifecycle.js
- **역할**: 애플리케이션 생명주기 관리
- **주요 기능**:
  - 앱 시작/종료 처리
  - 리소스 초기화/정리
  - 시스템 이벤트 처리

#### 3.1.3 window.js
- **역할**: 창 관리
- **주요 기능**:
  - 메인/자식 창 생성 및 관리
  - 창 상태 유지
  - 다중 디스플레이 지원

### 3.2 서비스 모듈

#### 3.2.1 database.js
- **역할**: 데이터 지속성 관리
- **주요 기능**:
  - SQLite 데이터베이스 연동
  - 통계 데이터 저장/조회
  - 스키마 관리

#### 3.2.2 keyboard.js
- **역할**: 키보드 입력 처리
- **주요 기능**:
  - 글로벌 키보드 후킹
  - 입력 이벤트 처리
  - 타이핑 통계 수집

#### 3.2.3 memory-manager.js / memory-manager-native.js
- **역할**: 메모리 관리
- **주요 기능**:
  - 메모리 사용량 모니터링
  - 가비지 컬렉션 최적화
  - 네이티브 메모리 관리

### 3.3 유틸리티 모듈

#### 3.3.1 utils.js
- **공통 유틸리티 함수**
  - 로깅
  - 오류 처리
  - 유효성 검사

#### 3.3.2 platform.js
- **플랫폼 특화 기능**
  - OS 감지
  - 플랫폼별 경로 처리
  - 네이티브 통합

### 3.4 핸들러 모듈 (handlers/)

#### 3.4.1 ipc-handlers.js
- IPC 메시지 라우팅
- 이벤트 버스 관리
- 오류 처리

#### 3.4.2 keyboard-handlers.js
- 키보드 이벤트 처리
- 입력 검증
- 이벤트 전파

#### 3.4.3 window-handlers.js
- 창 관련 이벤트 처리
- 창 상태 관리
- 다중 창 조정

### 3.5 워커 모듈 (workers/)

#### 3.5.1 index.js
- 워커 스레드 관리
- 작업 큐 처리
- 부하 분산

#### 3.5.2 modules/
- GPU 시뮬레이션
- 메모리 관리
- 패턴 분석

## 4. 렌더러 프로세스 컴포넌트

### 4.1 레이아웃 컴포넌트

#### 4.1.1 MainLayout
- **경로**: `/components/MainLayout.tsx`
- **기능**: 메인 애플리케이션 레이아웃
- **하위 컴포넌트**:
  - AppHeader
  - Sidebar
  - ContentArea
  - AppFooter

#### 4.1.2 AppHeader
- **경로**: `/components/AppHeader.tsx`
- **기능**: 상단 네비게이션 바
- **상태**:
  - 현재 페이지
  - 알림 개수
  - 사용자 프로필

### 4.2 기능 컴포넌트

#### 4.2.1 TypingAnalyzer
- **경로**: `/components/TypingAnalyzer.tsx`
- **기능**: 타이핑 분석 대시보드
- **분석 항목**:
  - WPM (분당 단어 수)
  - 정확도
  - 오류 패턴

#### 4.2.2 MemoryMonitor
- **경로**: `/components/MemoryMonitor.tsx`
- **기능**: 메모리 사용량 모니터링
- **시각화**:
  - 실시간 차트
  - 히스토리 추적
  - 임계값 경고

### 4.1 레이아웃 컴포넌트

#### 4.1.1 ClientLayout.tsx
- **역할**: 애플리케이션의 기본 레이아웃
- **주요 기능**:
  - 페이지 전환 시 레이아웃 유지
  - 전역 상태 제공
  - 테마 관리

#### 4.1.2 MainLayout.tsx
- **역할**: 메인 페이지 레이아웃
- **주요 기능**:
  - 헤더/푸터 포함
  - 반응형 레이아웃
  - 네비게이션 관리

### 4.2 헤더 및 푸터

#### 4.2.1 AppHeader.tsx
- **역할**: 애플리케이션 헤더
- **주요 기능**:
  - 앱 제목 표시
  - 네비게이션 메뉴
  - 테마 전환 버튼

#### 4.2.2 AppFooter.tsx
- **역할**: 애플리케이션 푸터
- **주요 기능**:
  - 저작권 정보 표시
  - 버전 정보
  - 링크 모음

### 4.3 코어 컴포넌트

#### 4.3.1 TypingBox.tsx
- **역할**: 타이핑 입력 필드
- **주요 기능**:
  - 실시간 타이핑 감지
  - 자동 완성
  - 문법 강조

#### 4.3.2 TypingStats.tsx
- **역할**: 타이핑 통계 표시
- **주요 기능**:
  - WPM/정확도 계산
  - 진행 상황 시각화
  - 히스토리 추적

#### 4.3.3 MemoryMonitor.tsx
- **역할**: 메모리 사용량 모니터링
- **주요 기능**:
  - 실시간 메모리 사용량 표시
  - 힙 스냅샷
  - 성능 경고

### 4.4 설정 패널

#### 4.4.1 Settings.tsx
- **역할**: 애플리케이션 설정
- **주요 기능**:
  - 테마 설정
  - 단축키 사용자 정의
  - 성능 설정

#### 4.4.2 GPUSettingsPanel.tsx
- **역할**: GPU 설정 관리
- **주요 기능**:
  - 가속 활성화/비활성화
  - VRAM 모니터링
  - 드라이버 정보 표시

#### 4.4.3 MemorySettingsPanel.tsx
- **역할**: 메모리 설정 관리
- **주요 기능**:
  - 캐시 제어
  - 메모리 한도 설정
  - 가비지 컬렉션 트리거

### 4.5 유틸리티 컴포넌트

#### 4.5.1 Toast.tsx
- **역할**: 알림 표시
- **주요 기능**:
  - 자동 사라짐
  - 다양한 레벨(성공, 경고, 오류)
  - 애니메이션 효과

#### 4.5.2 DebugPanel.tsx
- **역할**: 디버그 정보 표시
- **주요 기능**:
  - 상태 모니터링
  - 로그 표시
  - 성능 프로파일링

### 4.6 특수 컴포넌트

#### 4.6.1 MiniView.tsx
- **역할**: 미니 뷰 창
- **주요 기능**:
  - 콤팩트한 정보 표시
  - 항상 위에 표시
  - 드래그 앤 드롭 지원

#### 4.6.2 NativeModuleStatus.tsx
- **역할**: 네이티브 모듈 상태 표시
- **주요 기능**:
  - 모듈 로드 상태
  - 버전 정보
  - 호환성 검사

## 5. 데이터 흐름 및 상태 관리

### 5.1 상태 관리 아키텍처

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   UI 컴포넌트   │◄───►│   전역 상태     │◄───►│   백엔드 API   │
│                 │     │   (Context)     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ▲                       ▲                       ▲
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   로컬 상태     │     │   IPC 통신      │     │   데이터베이스  │
│   (useState)    │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 5.2 주요 데이터 흐름

1. **사용자 입력 처리**
   - 키보드/마우스 이벤트 감지
   - 입력 유효성 검사
   - 상태 업데이트

2. **상태 동기화**
   - 로컬 상태 ↔ 전역 상태
   - IPC를 통한 메인-렌더러 동기화
   - 지속성을 위한 저장소 동기화

3. **백엔드 통신**
   - 데이터 페칭
   - 실시간 업데이트 구독
   - 오류 처리 및 재시도

## 6. 성능 최적화

### 6.1 렌더링 최적화
- React.memo를 이용한 불필요한 리렌더링 방지
- 가상화된 리스트 구현
- 이미지 지연 로딩

### 6.2 메모리 관리
- 메모리 누수 방지
- 대용량 데이터 청킹 처리
- 웹 워커 활용

### 6.3 번들 최적화
- 코드 스플리팅
- 트리쉐이킹
- 지연 로딩

## 7. 테스트 전략

### 7.1 단위 테스트
- 유틸리티 함수
- 순수 컴포넌트
- 상태 관리 로직

### 7.2 통합 테스트
- 컴포넌트 간 상호작용
- 라우팅
- 상태 관리 흐름

### 7.3 E2E 테스트
- 사용자 시나리오 테스트
- 크로스 브라우저 테스트
- 성능 벤치마킹

## 8. 배포 및 유지보수

### 8.1 빌드 프로세스
- 개발/스테이징/프로덕션 환경 분리
- 환경 변수 관리
- 아티팩트 버저닝

### 8.2 모니터링
- 에러 추적
- 성능 메트릭스 수집
- 사용자 행동 분석

### 8.3 업데이트 전략
- 자동 업데이트
- 롤백 메커니즘
- 호환성 유지

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process (Next.js)               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │   React     │  │  Components  │  │  Pages & Routes  │  │
│  │             │  │             │  │                  │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                           │ IPC
┌───────────────────────────▼───────────────────────────────┐
│                    Main Process (Electron)               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  Window     │  │  App Life   │  │  Native Modules  │  │
│  │  Management │  │  Cycle      │  │  (Rust)          │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└───────────────────────────┬───────────────────────────────┘
                           │ Native Bindings
┌───────────────────────────▼───────────────────────────────┐
│                    System Resources                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │  File       │  │  Network    │  │  Hardware        │  │
│  │  System     │  │  Stack      │  │  Acceleration   │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 주요 컴포넌트

1. **메인 프로세스 (Electron)**
   - `main.js`: 애플리케이션 진입점 및 초기화
   - `window.js`: 창 관리 및 라이프사이클
   - `settings.js`: 애플리케이션 설정 관리
   - `updates.js`: 자동 업데이트 처리
   - `database.js`: 데이터 저장 및 관리

2. **렌더러 프로세스 (Next.js/React)**
   - `app/`: Next.js 애플리케이션 루트
   - `components/`: 재사용 가능한 UI 컴포넌트
   - `pages/`: 애플리케이션 라우트
   - `styles/`: 전역 스타일 및 테마

3. **네이티브 모듈 (Rust)**
   - `native-modules/`: 고성능 연산을 위한 Rust 모듈
   - `build.rs`: 빌드 스크립트
   - `src/lib.rs`: 주요 Rust 구현체

## 3. 핵심 모듈 상세 분석

### 3. 메인 프로세스 모듈

#### 3.1 메인 프로세스 (main.js)


애플리케이션의 진입점으로, 다음과 같은 주요 기능을 담당합니다:

- **애플리케이션 초기화**
  - 모듈 의존성 주입
  - 환경 변수 설정
  - 오류 처리기 설정
  - 네이티브 모듈 로드

- **이벤트 핸들링**
  - 애플리케이션 라이프사이클 이벤트
  - 시스템 이벤트 (전원 상태, 디스플레이 변경 등)
  - 프로세스 간 통신 (IPC) 설정

- **성능 모니터링**
  - 메모리 사용량 추적
  - CPU 사용량 모니터링
  - 응답성 검사

#### 3.2 창 관리 모듈 (window.js)


애플리케이션 창을 관리하는 모듈로, 다음과 같은 기능을 제공합니다:

- **창 생성 및 관리**
  - 메인 창 생성 및 설정
  - 자식 창 관리
  - 창 상태 유지 (크기, 위치, 최대화/최소화 상태)

- **다중 디스플레이 지원**
  - 사용 가능한 디스플레이 감지
  - 창 위치 자동 조정
  - 주 모니터 감지

- **최적화 기능**
  - 백그라운드에서의 리소스 사용 최적화
  - GPU 가속 설정
  - 메모리 사용량 모니터링

#### 3.3 키보드 모듈 (keyboard.js)

키보드 입력을 처리하고 모니터링하는 모듈입니다:

- **글로벌 키보드 후킹**
  - 시스템 전체 키 입력 감지
  - 핫키 등록 및 관리
  - 키 입력 필터링

- **타이핑 통계**
  - 키 입력 속도 측정
  - 정확도 계산
  - 오류 패턴 분석

- **보안 기능**
  - 민감한 입력 필드 감지
  - 보안 키보드 입력 처리
  - 키로거 방지

#### 3.4 메모리 관리 모듈 (memory-manager.js, memory-manager-native.js)

애플리케이션의 메모리 사용을 최적화하는 모듈입니다:

- **메모리 모니터링**
  - 힙 사용량 추적
  - 가비지 컬렉션 모니터링
  - 메모리 누수 감지

- **최적화 전략**
  - 자동 메모리 압축
  - 사용하지 않는 리소스 해제
  - 캐시 관리

- **네이티브 통합**
  - Rust 기반 고성능 메모리 연산
  - 하위 수준 메모리 관리
  - 플랫폼별 최적화

#### 3.5 데이터베이스 모듈 (database.js)


SQLite를 사용한 데이터 지속성 계층을 제공하는 모듈입니다:

- **데이터 관리**
  - 타이핑 통계 저장 및 조회
  - 사용자 설정 관리
  - 데이터 백업 및 복구

- **성능 최적화**
  - 배치 처리 지원
  - 트랜잭션 관리
  - 쿼리 최적화

- **스키마 관리**
  - 마이그레이션 지원
  - 버전 관리
  - 데이터 무결성 검사

#### 3.6 IPC 핸들러 모듈 (ipc-handlers.js, handlers/)

프로세스 간 통신을 관리하는 모듈입니다:

- **핸들러 등록**
  - 메인-렌더러 프로세스 통신
  - 동기/비동기 메시지 처리
  - 오류 처리 및 로깅

- **이벤트 기반 아키텍처**
  - 이벤트 구독/발행
  - 요청-응답 패턴
  - 스트리밍 지원

- **보안 계층**
  - 메시지 검증
  - 접근 제어
  - 속도 제한

#### 3.7 설정 관리 모듈 (settings.js, store.js)

애플리케이션 설정을 관리하는 모듈입니다:

- **설정 관리**
  - 사용자 기본 설정 저장
  - 애플리케이션 구성
  - 환경별 설정 지원

- **데이터 지속성**
  - JSON 기반 저장소
  - 자동 저장
  - 설정 버전 관리

- **보안 기능**
  - 민감한 데이터 암호화
  - 설정 무결성 검증
  - 백업 및 복구

#### 3.8 작업자 관리 모듈 (workers/, worker-manager.js)

CPU 집약적인 작업을 처리하는 워커 스레드를 관리합니다:

- **워커 풀링**
  - 워커 스레드 관리
  - 작업 큐 처리
  - 부하 분산

- **작업 처리**
  - 통계 계산
  - 데이터 처리
  - 배치 작업

- **리소스 관리**
  - 메모리 사용량 제한
  - CPU 사용량 제어
  - 오류 복구

### 4. 모듈 상호작용 및 데이터 흐름

#### 4.1 애플리케이션 시작 흐름

1. **초기화 단계**
   - 메인 프로세스 시작 (`main.js`)
   - 환경 설정 로드 (`settings.js`)
   - 데이터베이스 초기화 (`database.js`)
   - 네이티브 모듈 로드 (`native-module-loader.js`)


2. **UI 준비 단계**
   - 메인 창 생성 (`window.js`)
   - 렌더러 프로세스 시작 (`renderer/`)
   - 초기 데이터 로드 (`ipc-handlers.js`)

3. **서비스 시작 단계**
   - 백그라운드 서비스 시작
   - 자동 업데이트 확인 (`updates.js`)
   - 모니터링 시작 (`stats.js`)

#### 4.2 이벤트 처리 흐름

1. **사용자 입력 처리**
   - 키보드/마우스 이벤트 감지 (`keyboard.js`)
   - 이벤트 전파 및 처리 (`ipc-handlers.js`)
   - 상태 업데이트 및 렌더링

2. **시스템 이벤트 처리**
   - 시스템 이벤트 감지 (전원, 디스플레이 등)
   - 애플리케이션 상태 조정
   - 사용자 알림

3. **데이터 동기화**
   - 로컬 데이터베이스 업데이트
   - 원격 서버와의 동기화 (`data-sync.js`)
   - 충돌 해결

### 5. 성능 고려사항

#### 5.1 메모리 관리
- **효율적인 데이터 구조** 사용
- 메모리 누수 방지
- 가비지 컬렉션 최적화

#### 5.2 CPU 사용량 최적화
- 무거운 작업은 워커 스레드로 이동
- 불필요한 재계산 방지
- 배치 처리 구현

#### 5.3 디스크 I/O 최소화
- 캐싱 전략 구현
- 배치 쓰기 사용
- 인덱스 최적화

### 6. 보안 고려사항

#### 6.1 데이터 보호
- 민감한 데이터 암호화
- 안전한 저장소 사용
- 메모리 정리

#### 6.2 IPC 보안
- 메시지 검증
- 접근 제어
- 속도 제한

#### 6.3 코드 무결성
- 모듈 서명 검증
- 의존성 검사
- 런타임 무결성 검사

### 7. 확장성 및 유지보수

#### 7.1 모듈화
- 명확한 인터페이스 정의
- 느슨한 결합
- 의존성 주입

#### 7.2 테스트 용이성
- 단위 테스트
- 통합 테스트
- 성능 테스트

#### 7.3 문서화
- API 문서
- 아키텍처 다이어그램
- 의사결정 기록

### 8. 전체 프로젝트 구조 상세 분석

### 8.1 프로젝트 개요
Loop 프로젝트는 Electron과 Next.js를 기반으로 한 크로스 플랫폼 데스크톱 애플리케이션으로, 사용자의 타이핑 패턴을 분석하고 성능을 최적화하는 기능을 제공합니다. 프로젝트는 메인 프로세스와 렌더러 프로세스로 구분되어 있으며, 네이티브 모듈을 통한 고성능 연산을 지원합니다.

### 8.2 전체 디렉토리 구조
```
loop_3/
├── src/
│   ├── app/                    # Next.js 애플리케이션 (렌더러 프로세스)
│   │   ├── components/         # 재사용 가능한 React 컴포넌트들
│   │   ├── dashboard/          # 대시보드 관련 페이지
│   │   ├── gpu-test/           # GPU 테스트 페이지
│   │   ├── hooks/              # 커스텀 React 훅
│   │   ├── mini-view/          # 미니 뷰 관련 컴포넌트
│   │   ├── pages/              # 페이지 컴포넌트
│   │   ├── restart/            # 재시작 관련 컴포넌트
│   │   ├── settings/           # 설정 관련 컴포넌트
│   │   ├── types/              # 타입 정의
│   │   └── utils/              # 유틸리티 함수들
│   │
│   ├── lib/                   # 공유 라이브러리
│   │   └── database/           # 데이터베이스 관련 유틸리티
│   │
│   ├── main/                  # Electron 메인 프로세스
│   │   ├── handlers/           # IPC 핸들러들
│   │   ├── workers/            # 워커 스레드
│   │   └── *.js               # 메인 프로세스 스크립트들
│   │
│   ├── native-modules/       # Rust 네이티브 모듈
│   ├── preload/               # 프리로드 스크립트
│   ├── renderer/              # 렌더러 프로세스
│   ├── server/                # 서버 사이드 코드
│   └── types/                 # 전역 타입 정의
├── docs/                      # 프로젝트 문서
└── scripts/                   # 유틸리티 스크립트
```

### 8.3 주요 컴포넌트 상세

#### 8.3.1 앱 컴포넌트 (`/src/app/components/`)

**코어 컴포넌트**
- `AppHeader.tsx` - 메인 애플리케이션 헤더
- `AppFooter.tsx` - 애플리케이션 푸터
- `MainLayout.tsx` - 메인 레이아웃 컴포넌트
- `ClientLayout.tsx` - 클라이언트 사이드 전용 레이아웃
- `ThemeProvider.tsx` - 테마 관리 프로바이더

**기능 컴포넌트**
- `MemoryMonitor.tsx` - 메모리 사용량 모니터링
- `GPUSettingsPanel.tsx` - GPU 설정 패널
- `TypingAnalyzer.tsx` - 타이핑 분석기
- `TypingBox.tsx` - 타이핑 입력 영역
- `TypingStats.tsx` - 타이핑 통계 표시
- `StatsChart.tsx` - 통계 차트
- `NativeModuleTest.tsx` - 네이티브 모듈 테스트
- `Toast.tsx` - 알림 메시지

**대화상자**
- `ConfirmDialog.tsx` - 확인 대화상자
- `SaveConfirmDialog.tsx` - 저장 확인 대화상자

**UI 컴포넌트**
- `Button.tsx` - 재사용 가능한 버튼
- `Card.tsx` - 카드 레이아웃
- `Switch.tsx` - 토글 스위치
- `Badge.tsx` - 상태 뱃지

#### 8.3.2 훅스 (`/src/app/hooks/`)

- `useElectronApi.ts` - Electron API 연동
- `useMemoryManagement.ts` - 메모리 관리
- `useNativeGpu.ts` - GPU 기능 사용
- `usePerformanceOptimization.ts` - 성능 최적화
- `useSettings.ts` - 설정 관리
- `useToast.ts` - 알림 메시지 관리
- `useTypingStats.ts` - 타이핑 통계 관리

#### 8.3.3 유틸리티 (`/src/app/utils/`)

**핵심 유틸리티**
- `api-utils.ts` - API 요청 처리
- `cache-utils.ts` - 캐싱 유틸리티
- `electron.ts` - Electron 관련 유틸리티
- `file-utils.ts` - 파일 처리 유틸리티
- `format-utils.ts` - 데이터 포맷팅

**성능 유틸리티**
- `gpu-acceleration.ts` - GPU 가속 유틸리티
- `performance-metrics.ts` - 성능 메트릭 수집
- `performance-optimizer.ts` - 성능 최적화

**메모리 관리**
- `memory-management.ts` - 메모리 관리 유틸리티
- `memory-optimizer.ts` - 메모리 최적화
- `memory-settings-bridge.ts` - 메모리 설정 브릿지

**타이핑 분석**
- `TypingSpeedCalculator.ts` - 타이핑 속도 계산
- `typing-performance.ts` - 타이핑 성능 분석

### 8.4 메인 프로세스 (`/src/main/`)

**핵심 모듈**
- `main.js` - 메인 프로세스 진입점
- `app-lifecycle.js` - 애플리케이션 생명주기 관리
- `window.js` - 윈도우 관리
- `menu.js` - 애플리케이션 메뉴
- `tray.js` - 시스템 트레이

**기능 모듈**
- `database.js` - SQLite 데이터베이스 연동
- `gpu-utils.js` - GPU 유틸리티
- `keyboard.js` - 키보드 입력 처리
- `memory-manager.js` - 메모리 관리
- `updates.js` - 자동 업데이트
- `screenshot.js` - 스크린샷 기능

**IPC 핸들러**
- `ipc-handlers.js` - IPC 메시지 처리
- `handlers/` - 핸들러 모음
  - `keyboard-handlers.js` - 키보드 이벤트
  - `memory-handlers.js` - 메모리 관리
  - `settings-handlers.js` - 설정 관리
  - `window-handlers.js` - 윈도우 제어

**워커 스레드**
- `workers/` - 워커 스레드 모듈
  - `gpu-simulator.js` - GPU 시뮬레이션
  - `memory-manager.js` - 메모리 관리 워커
  - `pattern-analyzer.js` - 패턴 분석
  - `stats-calculator.js` - 통계 계산

### 8.5 네이티브 모듈 (`/src/native-modules/`)
- `index.js` - 네이티브 모듈 로더
- `libtyping_stats_native.dylib` - macOS 네이티브 라이브러리
- `typing_stats_native.dll` - Windows 네이티브 라이브러리

### 8.6 프리로드 스크립트 (`/src/preload/`)
- `preload.js` - 메인 프리로드 스크립트
- `index.js` - 프리로드 진입점
- `restart.js` - 재시작 관련 스크립트

### 8.7 서버 사이드 (`/src/server/`)
- `native/` - 네이티브 모듈 브릿지
  - `index.js` - 메인 모듈
  - `fallback/` - 폴백 구현
  - `utils/logger.js` - 로깅 유틸리티

### 8.8 타입 정의 (`/src/types/`)
- `app-types.ts` - 애플리케이션 타입
- `gpu-types.ts` - GPU 관련 타입
- `memory-types.ts` - 메모리 관리 타입
- `native-module.d.ts` - 네이티브 모듈 타입
- `ts-electron.d.ts` - Electron 타입 확장

## 9. 주요 의존성

### 9.1 런타임 의존성
- **Electron**: ^35.0.2 - 크로스 플랫폼 데스크톱 애플리케이션
- **Next.js**: ^15.2.4 - React 기반 웹 프레임워크
- **React**: ^18.2.0 - UI 컴포넌트 라이브러리
- **TypeScript**: ^5.8.2 - 정적 타입 체킹
- **better-sqlite3**: ^11.9.1 - SQLite 데이터베이스
- **mongodb**: ^6.16.0 - MongoDB 클라이언트
- **prisma**: ^6.8.2 - 데이터베이스 ORM
- **recharts**: ^2.15.1 - 차트 라이브러리
- **tailwindcss**: ^4.1.4 - 유틸리티 우선 CSS

### 9.2 개발 의존성
- **@types/node**: ^20 - Node.js 타입 정의
- **@types/react**: ^19 - React 타입 정의
- **electron-builder**: ^24.9.1 - 앱 패키징
- **eslint**: ^9.23.0 - 코드 린팅
- **jest**: ^29.7.0 - 테스트 프레임워크
- **prettier**: ^3.2.5 - 코드 포맷터
- **typescript**: ^5.8.2 - TypeScript 컴파일러

## 10. 빌드 및 실행

### 10.1 개발 모드
```bash
yarn dev
```

### 10.2 프로덕션 빌드
```bash
yarn build
yarn electron:package
```

### 10.3 네이티브 모듈 빌드
```bash
yarn build:native
```

## 11. 테스트

### 11.1 유닛 테스트
```bash
yarn test
```

### 11.2 E2E 테스트
```bash
yarn test:e2e
```

## 12. 데이터베이스 모듈 (database.js)

### 12.1 개요

### 8.1 프로젝트 개요
Loop 프로젝트는 Electron과 Next.js를 기반으로 한 크로스 플랫폼 데스크톱 애플리케이션으로, 사용자의 타이핑 패턴을 분석하고 성능을 최적화하는 기능을 제공합니다. 프로젝트는 메인 프로세스와 렌더러 프로세스로 구분되어 있으며, 네이티브 모듈을 통한 고성능 연산을 지원합니다.

### 8.2 프로젝트 구조

#### 8.2.1 주요 디렉토리 구조
```
loop_3/
├── src/
│   ├── main/                  # Electron 메인 프로세스 코드
│   │   ├── handlers/          # IPC 핸들러들
│   │   ├── workers/           # 워커 스레드 관련 코드
│   │   ├── app-lifecycle.js   # 앱 생명주기 관리
│   │   ├── database.js       # 데이터베이스 로직
│   │   ├── gpu-utils.js      # GPU 유틸리티
│   │   ├── index.js          # 메인 진입점
│   │   ├── memory-manager.js # 메모리 관리
│   │   └── window.js         # 윈도우 관리
│   │
│   ├── app/                 # Next.js 애플리케이션
│   │   ├── components/        # React 컴포넌트들
│   │   ├── hooks/            # 커스텀 React 훅
│   │   ├── utils/            # 유틸리티 함수들
│   │   └── page.tsx          # 메인 페이지
│   │
│   ├── native-modules/      # Rust 네이티브 모듈
│   │   ├── src/              # Rust 소스 코드
│   │   └── Cargo.toml        # Rust 의존성 관리
│   │
│   └── preload/             # 프리로드 스크립트
│
├── docs/                    # 프로젝트 문서
└── scripts/                  # 빌드 및 유틸리티 스크립트
```

#### 8.2.2 주요 파일 설명

1. **메인 프로세스**
   - `main.js`: Electron 앱의 메인 진입점
   - `database.js`: SQLite 데이터베이스 연동 및 쿼리 처리
   - `memory-manager.js`: 메모리 사용량 모니터링 및 최적화
   - `gpu-utils.js`: GPU 가속 기능 관리

2. **렌더러 프로세스**
   - `app/page.tsx`: 메인 애플리케이션 페이지
   - `app/components/`: 재사용 가능한 React 컴포넌트들
   - `app/hooks/`: 커스텀 React 훅들
   - `app/utils/`: 유틸리티 함수들

3. **네이티브 모듈**
   - Rust로 작성된 고성능 연산 모듈
   - 메모리 관리, GPU 가속 등 성능이 중요한 작업 처리

### 8.3 주요 의존성

#### 8.3.1 주요 런타임 의존성
- **Electron**: ^35.0.2 - 크로스 플랫폼 데스크톱 애플리케이션 프레임워크
- **Next.js**: ^15.2.4 - React 기반 웹 애플리케이션 프레임워크
- **React**: ^18.2.0 - UI 컴포넌트 라이브러리
- **TypeScript**: ^5.8.2 - 정적 타입 체킹
- **better-sqlite3**: ^11.9.1 - SQLite 데이터베이스 연동
- **mongodb**: ^6.16.0 - MongoDB 데이터베이스 클라이언트
- **prisma**: ^6.8.2 - 데이터베이스 ORM
- **recharts**: ^2.15.1 - 데이터 시각화
- **tailwindcss**: ^4.1.4 - 유틸리티 우선 CSS 프레임워크

#### 8.3.2 주요 개발 의존성
- **@types/node**: ^20 - Node.js 타입 정의
- **@types/react**: ^19 - React 타입 정의
- **@typescript-eslint/***: ^8.0.0 - TypeScript ESLint 플러그인
- **electron-builder**: ^24.9.1 - Electron 앱 패키징
- **eslint**: ^9.23.0 - 코드 린팅
- **jest**: ^29.7.0 - 테스트 프레임워크
- **prettier**: ^3.2.5 - 코드 포맷터
- **tailwindcss**: ^4.1.4 - CSS 유틸리티 프레임워크

### 8.4 빌드 및 실행

#### 개발 모드 실행
```bash
yarn dev
```

#### 프로덕션 빌드
```bash
yarn build
yarn electron:package
```

#### 네이티브 모듈 빌드
```bash
yarn build:native
```

### 8.5 테스트

#### 유닛 테스트 실행
```bash
yarn test
```

#### E2E 테스트 실행
```bash
yarn test:e2e
```

## 9. 데이터베이스 모듈 (database.js)

### 9.1 개요
데이터베이스 모듈은 SQLite를 사용하여 타이핑 통계 및 애플리케이션 설정을 영구적으로 저장하고 관리합니다. 메모리 최적화를 위해 대용량 데이터는 디스크에 저장되며, 효율적인 쿼리 처리를 위한 다양한 기능을 제공합니다.

### 3.2 주요 기능

#### 3.2.1 데이터베이스 초기화
- **파일 경로**: `userData/typing-stats-database.sqlite`
- **초기화 과정**:
  1. 데이터베이스 디렉토리 확인 및 생성
  2. Better-SQLite3를 사용한 데이터베이스 연결
  3. WAL(Write-Ahead Logging) 모드 활성화
  4. 캐시 크기 설정 (약 2MB)
  5. 필요한 테이블 생성

#### 3.2.2 데이터베이스 스키마 최적화

##### 인덱스 전략
```sql
-- 자주 조회되는 컬럼에 대한 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_typing_stats_created_at ON typing_stats(created_at);
CREATE INDEX IF NOT EXISTS idx_typing_stats_browser ON typing_stats(browser_name);

-- 복합 인덱스 (다중 컬럼 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_typing_stats_composite ON typing_stats(browser_name, created_at);

-- 부분 인덱스 (특정 조건의 데이터에 대해서만 인덱싱)
CREATE INDEX IF NOT EXISTS idx_typing_stats_high_usage 
ON typing_stats(key_count) 
WHERE key_count > 1000;
```

##### 파티셔닝 전략
```sql
-- 연도별 파티셔닝 테이블 생성
CREATE TABLE typing_stats_y2023 (
  CHECK (created_at >= '2023-01-01' AND created_at < '2024-01-01')
) INHERITS (typing_stats);

-- 파티션 테이블 인덱스
CREATE INDEX idx_typing_stats_y2023_created ON typing_stats_y2023(created_at);
```

#### 3.2.3 테이블 구조
```sql
CREATE TABLE typing_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT,
  key_count INTEGER,
  typing_time INTEGER,
  window_title TEXT,
  browser_name TEXT,
  total_chars INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 주요 함수 상세

#### 3.3.1 `saveStats(stats)`
- **매개변수**:
  - `stats`: `Object` - 저장할 통계 데이터
- **반환값**: `Object` - `{success: boolean, id: number|null, error: string|null}`
- **기능**: 
  - 트랜잭션을 사용한 원자적 데이터 저장
  - 데이터 유효성 검사
  - 중복 데이터 검사 (동일한 해시값을 가진 데이터)
  - 자동 압축 (대용량 텍스트 데이터의 경우)
- **에러 처리**:
  - 상세한 에러 로깅 (파일 시스템에 별도 저장)
  - 재시도 메커니즘 (최대 3회)
  - 에러 발생 시 대체 저장소에 임시 저장

#### 3.3.2 `getStats(options)`
- **매개변수**:
  - `options`: `Object` - 조회 옵션 (기간, 정렬, 페이징 등)
- **반환값**: `Object` - `{data: Array, total: number, page: number}`
- **성능 최적화**:
  ```javascript
  // 지연 로딩을 위한 커서 기반 페이지네이션
  function getStatsBatch(lastId = 0, limit = 50) {
    return db.prepare(`
      SELECT * FROM typing_stats 
      WHERE id > ? 
      ORDER BY id ASC 
      LIMIT ?
    `).all(lastId, limit);
  }
  
  // 자주 사용되는 통계는 메모리 캐시에 저장
  const statsCache = new LRUCache({
    max: 1000, // 최대 캐시 항목 수
    ttl: 1000 * 60 * 5, // 5분 캐시 유지
  });
  ```

#### 3.3.3 `optimizeDatabase()`
- **주요 기능**:
  - 주기적인 데이터베이스 최적화 (VACUUM, ANALYZE)
  - 인덱스 재구성
  - 조각화 제거
  ```sql
  -- 조각화 제거를 위한 VACUUM
  PRAGMA auto_vacuum = INCREMENTAL;
  PRAGMA incremental_vacuum(100); -- 100페이지씩 점진적 정리
  
  -- 통계 정보 업데이트
  ANALYZE;
  ```

#### 3.3.4 `backupDatabase()`
- **백업 전략**:
  - 증분 백업 (WAL 파일 활용)
  - 암호화된 원격 백업
  - 백업 검증 (체크섬 비교)
  ```javascript
  async function createIncrementalBackup() {
    // 1. WAL 파일 체크포인트
    await db.pragma('wal_checkpoint(RESTART)');
    
    // 2. WAL 파일 백업
    const walPath = `${dbPath}-wal`;
    const backupWal = `${backupDir}/db-${Date.now()}.wal`;
    await fs.copyFile(walPath, backupWal);
    
    // 3. 메인 DB 파일 백업
    await fs.copyFile(dbPath, `${backupDir}/db-${Date.now()}.db`);
  }
  ```

#### 3.3.5 `migrateDatabase(version)`
- **마이그레이션 시스템**:
  - 버전 기반 스키마 마이그레이션
  - 롤백 지원
  ```javascript
  const migrations = {
    1: `ALTER TABLE typing_stats ADD COLUMN device_id TEXT`,
    2: `CREATE INDEX idx_typing_stats_device ON typing_stats(device_id)`
  };
  
  async function migrate() {
    const currentVersion = await getCurrentDbVersion();
    for (let v = currentVersion + 1; v <= targetVersion; v++) {
      try {
        await db.exec('BEGIN');
        await db.exec(migrations[v]);
        await updateDbVersion(v);
        await db.exec('COMMIT');
      } catch (error) {
        await db.exec('ROLLBACK');
        throw error;
      }
    }
  }
  ```

### 3.4 성능 모니터링

#### 3.4.1 쿼리 프로파일링
```javascript
// 모든 쿼리 실행 시간 측정
db.pragma('cipher_profile = true');

// 느린 쿼리 로깅 (100ms 이상)
db.pragma('query_only = 1');
db.pragma('query_only_warning = 100');

// 메모리 사용량 모니터링
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`RSS: ${formatBytes(mem.rss)}, Heap: ${formatBytes(mem.heapUsed)}`);
}, 60000);
```

#### 3.4.2 성능 지표 수집
- 쿼리 실행 시간
- 동시 접속자 수
- 캐시 적중률
- 디스크 I/O 대기 시간

### 3.5 보안 강화

#### 3.5.1 암호화
```javascript
// SQLCipher를 이용한 DB 암호화
const db = new Database('encrypted.db');
db.pragma(`key='${process.env.DB_SECRET}'`);
db.pragma('cipher_page_size = 4096');
db.pragma('kdf_iter = 256000'); // 키 도출 함수 반복 횟수 증가
```

#### 3.5.2 접근 제어
```sql
-- 읽기 전용 사용자 생성
ATTACH DATABASE 'file:app.db?mode=ro' AS readonly;
CREATE VIEW vw_stats AS SELECT * FROM main.typing_stats;
```

#### 3.5.3 감사 로깅
```javascript
// 모든 데이터 수정 작업 로깅
function auditLog(action, table, recordId, userId) {
  db.prepare(`
    INSERT INTO audit_log (action, table_name, record_id, user_id, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(action, table, recordId, userId, getClientIp(), getUserAgent());
}
```

### 3.6 고가용성

#### 3.6.1 복제 설정
```javascript
// 마스터-슬레이브 복제 설정
if (process.env.DB_ROLE === 'slave') {
  // 슬레이브 노드는 읽기 전용
  db.pragma('query_only = 1');
  // 마스터로부터 변경사항 동기화
  syncWithMaster();
}
```

#### 3.6.2 페일오버 전략
- 자동 감지 및 페일오버
- 데이터 일관성 검증
- 충돌 해결 정책 (최종 쓰기 승리 또는 수동 해결)

### 3.7 확장성

#### 3.7.1 샤딩
```javascript
// 사용자 ID 기반 샤딩
function getShard(userId) {
  const shardId = hash(userId) % SHARD_COUNT;
  return shards[shardId];
}
```

#### 3.7.2 읽기 전용 복제본
```javascript
const readReplicas = [
  'readonly1.example.com',
  'readonly2.example.com'
];

function getReadReplica() {
  // 라운드로빈 또는 상태 기반 선택
  return readReplicas[Math.floor(Math.random() * readReplicas.length)];
}
```

#### 3.3.2 `getStatById(id)`
- **매개변수**:
  - `id`: `Number` - 조회할 통계 기록 ID
- **반환값**: `Object|null` - 조회된 기록 또는 null
- **사용 예시**:
  ```javascript
  const stat = getStatById(1);
  console.log('통계 기록:', stat);
  ```

#### 3.3.3 `getAllStats(limit, offset)`
- **매개변수**:
  - `limit`: `Number` (기본값: 50) - 조회할 최대 기록 수
  - `offset`: `Number` (기본값: 0) - 조회 시작 위치
- **반환값**: `Array` - 조회된 기록 배열
- **성능 영향**:
  - 대량의 데이터 조회 시 일시적인 부하 발생 가능
  - 페이징 처리를 위한 offset 파라미터 지원

#### 3.3.4 `getStatsSummaryByPeriod(period, limit)`
- **매개변수**:
  - `period`: `String` (기본값: 'day') - 'day', 'week', 'month' 중 하나
  - `limit`: `Number` (기본값: 7) - 조회할 최대 기간 수
- **반환값**: `Array` - 기간별로 그룹화된 통계 배열
- **사용 예시**:
  ```javascript
  // 최근 7일간 일별 통계 조회
  const dailyStats = getStatsSummaryByPeriod('day', 7);
  ```

#### 3.3.5 `saveSetting(key, value)`
- **매개변수**:
  - `key`: `String` - 설정 키
  - `value`: `Any` - 설정 값 (객체는 자동으로 JSON 문자열로 변환)
- **반환값**: `Boolean` - 저장 성공 여부
- **특이사항**:
  - 객체나 배열은 자동으로 JSON 문자열로 직렬화되어 저장됨
  - 기존 키가 있으면 업데이트, 없으면 새로 생성

#### 3.3.6 `loadSetting(key, defaultValue)`
- **매개변수**:
  - `key`: `String` - 설정 키
  - `defaultValue`: `Any` (선택사항) - 키가 없을 때 반환할 기본값
- **반환값**: `Any` - 저장된 값 또는 기본값
- **특이사항**:
  - JSON 문자열은 자동으로 파싱되어 반환됨
  - 키가 없으면 기본값 반환 (기본값 미지정 시 null)

#### 3.3.7 `optimizeDatabase()`
- **기능**: 데이터베이스 최적화 수행
- **수행 작업**:
  - VACUUM 실행 (파편화 제거)
  - 통계 정보 업데이트
  - WAL 파일 정리
- **권장 사용처**:
  - 주기적 유지보수 시
  - 대량의 데이터 삭제 후

#### 3.3.8 `cleanupOldData(days)`
- **매개변수**:
  - `days`: `Number` (기본값: 30) - 보관할 일수
- **기능**: 지정된 일수 이전의 오래된 데이터 삭제
- **성능 영향**:
  - 대용량 데이터 삭제 시 일시적인 부하 발생 가능
  - 백그라운드에서 주기적으로 실행 권장

#### 3.3.9 `closeDatabase()`
- **기능**: 데이터베이스 연결 종료
- **중요성**:
  - 애플리케이션 종료 시 반드시 호출 필요
  - 데이터 손상 방지를 위한 정상 종료 보장

### 3.4 성능 최적화 전략

1. **WAL(Write-Ahead Logging) 모드**
   - 읽기/쓰기 동시성 향상
   - 디스크 I/O 감소

2. **메모리 캐싱**
   - 자주 접근하는 데이터 캐싱
   - 캐시 크기 제한을 통한 메모리 사용량 제어

3. **배치 처리**
   - 대량 삽입/갱신 시 트랜잭션 사용
   - 주기적인 일괄 처리로 성능 저하 방지

4. **인덱스 최적화**
   - 자주 조회되는 컬럼에 인덱스 적용
   - 불필요한 인덱스 제거로 쓰기 성능 향상

## 4. 업데이트 관리 모듈 (updates.js)

### 4.1 개요
업데이트 관리 모듈은 Electron 애플리케이션의 자동 업데이트 기능을 담당합니다. 이 모듈은 주기적으로 업데이트를 확인하고, 사용자에게 업데이트 알림을 표시하며, 업데이트 다운로드 및 설치를 관리합니다.

### 4.2 주요 기능

#### 4.2.1 자동 업데이트 초기화
- **지원 플랫폼**: Windows, macOS
- **개발 모드**: 비활성화
- **초기화 옵션**:
  - `server`: 업데이트 서버 URL (기본: 'https://update.loop.com')
  - `interval`: 업데이트 확인 간격 (기본: 1시간)
  - `autoDownload`: 자동 다운로드 여부 (기본: true)
  - `autoInstall`: 자동 설치 여부 (기본: false)

#### 4.2.2 업데이트 흐름
1. 주기적 확인 또는 수동 확인으로 업데이트 확인
2. 업데이트 가능 시 알림 표시
3. 사용자 승인 후 다운로드 진행
4. 다운로드 완료 시 설치 안내
5. 애플리케이션 재시작으로 업데이트 적용

### 4.3 API 상세

#### 4.3.1 `initializeAutoUpdater(options)`
- **기능**: 자동 업데이터 초기화
- **매개변수**:
  ```javascript
  {
    server: string,     // 업데이트 서버 URL
    interval: number,    // 확인 간격(ms)
    autoDownload: boolean, // 자동 다운로드 여부
    autoInstall: boolean  // 자동 설치 여부
  }
  ```
- **반환값**: `void`
- **에러 처리**:
  - 지원되지 않는 플랫폼에서 호출 시 경고 로그 출력
  - 초기화 실패 시 오류 로그 출력

#### 4.3.2 `checkForUpdates(userInitiated)`
- **기능**: 업데이트 확인
- **매개변수**:
  - `userInitiated`: `boolean` - 사용자 요청 여부
- **반환값**: `Promise<object>` - 업데이트 상태
- **상태 코드**:
  - `checking`: 업데이트 확인 중
  - `update-available`: 업데이트 가능
  - `update-not-available`: 최신 버전
  - `error`: 오류 발생

#### 4.3.3 `downloadUpdate()`
- **기능**: 업데이트 다운로드
- **반환값**: `Promise<object>` - 다운로드 상태
- **이벤트**:
  - `download-progress`: 다운로드 진행 상황
  - `update-downloaded`: 다운로드 완료

#### 4.3.4 `installUpdate()`
- **기능**: 다운로드된 업데이트 설치
- **반환값**: `boolean` - 설치 시작 성공 여부
- **주의사항**:
  - 설치 후 애플리케이션 자동 재시작
  - 저장되지 않은 작업이 있는 경우 데이터 손실 가능성

#### 4.3.5 `setAutoUpdateEnabled(enabled)`
- **기능**: 자동 업데이트 활성화/비활성화
- **매개변수**:
  - `enabled`: `boolean` - 활성화 여부
- **영향**:
  - `true`: 주기적 업데이트 확인 활성화
  - `false`: 자동 업데이트 비활성화

### 4.4 사용자 인터페이스

#### 4.4.1 업데이트 알림
- **업데이트 가능 시**:
  - 버전 정보 표시
  - 릴리스 노트 링크 제공
  - '지금 업데이트' 및 '나중에' 버튼
- **다운로드 완료 시**:
  - 설치 안내 메시지
  - '지금 다시 시작' 버튼

#### 4.4.2 설정 패널
- 자동 업데이트 활성화/비활성화
- 마지막 업데이트 확인 시간
- 현재 버전 정보
- 업데이트 확인 버튼

### 4.5 보안 고려사항
1. **서버 인증**: HTTPS를 통한 보안 통신
2. **코드 서명**: 모든 업데이트 패키지에 디지털 서명 필수
3. **무결성 검증**: 다운로드 파일의 체크섬 검증
4. **권한 제한**: 업데이트 프로세스에 필요한 최소 권한만 부여

### 4.6 오류 처리
- **네트워크 오류**: 재시도 메커니즘 구현
- **다운로드 실패**: 부분 다운로드 파일 정리 후 재시도
- **무결성 오류**: 손상된 파일 삭제 후 재다운로드
- **권한 오류**: 사용자에게 관리자 권한 요청

## 5. 창 관리 모듈 (window.js)

### 5.1 개요
창 관리 모듈은 Electron 애플리케이션의 메인 윈도우 및 보조 창(미니뷰, 재시작 안내창 등)의 생명주기를 관리합니다. 이 모듈은 윈도우 생성, 크기 조정, 위치 관리, 이벤트 처리 등의 기능을 제공합니다.

### 5.2 주요 기능

#### 5.2.1 메인 윈도우 관리
- **창 생성 옵션**:
  ```javascript
  {
    width: 1200,  // 기본 너비
    height: 800,   // 기본 높이
    webPreferences: {
      preload: string,          // 프리로드 스크립트 경로
      nodeIntegration: false,   // Node.js 통합 비활성화
      contextIsolation: true,   // 컨텍스트 격리 활성화
      sandbox: false,           // 샌드박스 비활성화
      accelerator: 'gpu'|'cpu'  // 하드웨어 가속 설정
    },
    show: false,             // 준비 완료 후 표시
    backgroundColor: string,    // 배경색 (다크/라이트 모드 지원)
    titleBarStyle: 'hidden',   // 커스텀 타이틀바
    frame: false,              // 기본 프레임 비활성화
    icon: string               // 애플리케이션 아이콘
  }
  ```
- **지원 기능**:
  - 다중 디스플레이 지원
  - 창 상태 복원 (최소화/최대화/보통 상태)
  - 다크/라이트 모드 테마 지원
  - 하드웨어 가속 설정

#### 5.2.2 미니뷰 창
- **용도**: 메인 창을 최소화했을 때 표시되는 컴팩트한 뷰
- **기능**:
  - 주요 통계 정보 표시
  - 빠른 액세스 메뉴
  - 드래그를 통한 위치 조정
  - 더블클릭으로 메인 창 복원

#### 5.2.3 재시작 안내 창
- **용도**: 설정 변경 적용을 위한 재시작 안내
- **기능**:
  - 재시작 사유 표시
  - 지금 재시작/나중에 재시작 옵션
  - 카운트다운 타이머

### 5.3 API 상세

#### 5.3.1 `createWindow()`
- **기능**: 메인 애플리케이션 창 생성
- **반환값**: `BrowserWindow` - 생성된 윈도우 인스턴스
- **주요 동작**:
  1. 기존 창이 있으면 포커스
  2. 설정 로드
  3. 디스플레이 해상도에 맞춰 창 크기 조정
  4. 웹 콘텐츠 로드
  5. 준비 완료 후 애니메이션과 함께 표시

#### 5.3.2 `optimizeForBackground()`
- **기능**: 백그라운드 모드에서의 리소스 사용 최적화
- **최적화 대상**:
  - 애니메이션 프레임률 감소
  - 비활성 탭 일시 중지
  - 캐시 정리
  - 백그라운드 타이머 조정

#### 5.3.3 `disableBackgroundOptimization()`
- **기능**: 백그라운드 최적화 해제
- **사용 시점**:
  - 애플리케이셔 포그라운드로 복귀 시
  - 사용자 상호작용 발생 시

#### 5.3.4 `toggleMiniView()`
- **기능**: 미니뷰 창 토글
- **동작**:
  - 미니뷰가 없으면 생성 후 표시
  - 미니뷰가 있으면 제거

### 5.4 이벤트 처리

#### 5.4.1 창 이벤트
- `ready-to-show`: 렌더링 준비 완료 시
- `close`: 창 닫기 시 (실제 종료는 preventDefault()로 방지)
- `closed`: 창이 완전히 닫힌 후
- `resize`: 창 크기 변경 시
- `move`: 창 이동 시
- `enter-full-screen`/`leave-full-screen`: 전체 화면 전환 시

#### 5.4.2 커스텀 이벤트
- `window-state-changed`: 창 상태(최소화/최대화/보통) 변경 시
- `theme-changed`: 다크/라이트 모드 전환 시
- `gpu-accelerated-changed`: GPU 가속 설정 변경 시

### 5.5 성능 최적화

#### 5.5.1 렌더링 최적화
- **이미지 지연 로딩**: 보이는 영역의 이미지만 로드
- **가상 스크롤**: 대용량 목록 렌더링 시 성능 개선
- **CSS will-change 속성**: 애니메이션 성능 향상

#### 5.5.2 메모리 관리
- 창이 보이지 않을 때 리소스 해제
- 사용하지 않는 이벤트 리스너 제거
- 대용량 데이터 캐싱 전략 구현

#### 5.5.3 GPU 가속
- 설정에 따른 소프트웨어/하드웨어 렌더링 전환
- GPU 프로세스 크기 모니터링
- 메모리 누수 방지를 위한 정기적 리소스 정리

## 6. 메인 프로세스 모듈

### 6.1 개요
메인 프로세스 모듈은 Electron 애플리케이션의 핵심 로직을 담당하며, 다음과 같은 주요 기능을 수행합니다:
- 애플리케이션의 생명주기 관리
- 렌더러 프로세스와의 통신(IPC)
- 시스템 리소스 관리
- 네이티브 기능 통합

### 6.2 주요 컴포넌트

#### 6.2.1 애플리케이션 초기화
- **진입점**: `main.js`
- **주요 기능**:
  - Electron 앱 준비 완료(`app.whenReady()`) 대기
  - 환경 변수 및 설정 로드
  - 메인 창 생성
  - IPC 핸들러 등록
  - 자동 업데이트 초기화

#### 6.2.2 IPC 통신
- **주요 채널**:
  - `window-control`: 창 제어 명령 (최소화, 최대화, 닫기 등)
  - `app-command`: 애플리케이션 제어 명령
  - `update-status`: 업데이트 상태 전달
  - `stats-update`: 통계 데이터 업데이트

### 6.3 주요 API

#### 6.3.1 `createWindow()`
- **기능**: 메인 애플리케이션 창 생성 및 초기화
- **주요 동작**:
  1. BrowserWindow 인스턴스 생성
  2. 웹 콘텐츠 로드 (개발 서버 또는 빌드 파일)
  3. 이벤트 리스너 등록
  4. 개발자 도구 설정 (개발 모드에서만)

#### 6.3.2 `handleWindowControls()`
- **기능**: 창 컨트롤 버튼 이벤트 처리
- **처리 명령어**:
  - `minimize`: 창 최소화
  - `maximize`: 창 최대화/복원 토글
  - `close`: 애플리케이션 종료

### 6.4 생명주기 관리

#### 6.4.1 애플리케이션 시작
1. 환경 변수 로드
2. 설정 초기화
3. 데이터베이스 연결
4. 메인 창 생성
5. 백그라운드 서비스 시작

#### 6.4.2 애플리케이션 종료
1. 데이터 저장
2. 데이터베이스 연결 종료
3. 리소스 정리
4. 백그라운드 프로세스 종료

### 6.5 에러 처리
- **예외 처리**: 전역 예외 핸들러 등록
- **크래시 리포팅**: 자동 크래시 리포트 전송
- **복구 메커니즘**: 비정상 종료 시 자동 복구 시도

### 6.6 성능 모니터링
- **메모리 사용량** 추적
- **CPU 사용량** 모니터링
- **디스크 I/O** 측정
- **네트워크 상태** 감시

### 6.7 보안 고려사항
1. **컨텍스트 격리** 활성화
2. **Node.js 통합** 비활성화 (렌더러 프로세스)
3. **콘텐츠 보안 정책(CSP)** 적용
4. **세션 관리** 및 인증 토큰 보호
5. **보안 헤더** 설정

### 6.8 디버깅 및 로깅
- **로깅 레벨**: error, warn, info, debug, verbose
- **로그 위치**: 사용자 데이터 디렉토리
- **원격 디버깅**: 개발자 도구 통합
- **성능 프로파일링**: CPU/힙 프로파일링 지원

### 6.9 테스트 전략
1. **유닛 테스트**: 개별 함수/모듈 테스트
2. **통합 테스트**: 모듈 간 상호작용 테스트
3. **E2E 테스트**: 사용자 시나리오 기반 테스트
4. **성능 테스트**: 부하 테스트 및 벤치마킹

### 6.10 배포 고려사항
- **코드 서명**: 디지털 서명 필수
- **업데이트 채널**: 안정/베타/알파 채널 지원
- **설치 프로그램**: 사용자 친화적인 설치 경험 제공
- **제거 프로그램**: 깔끔한 제거 지원
  - `toggleFullscreen()`: 전체 화면 전환

#### settings.js
- **기능**: 애플리케이션 설정 관리
- **주요 기능**:
  - `loadSettings()`: 설정 로드
  - `saveSettings()`: 설정 저장
  - `applyWindowMode()`: 창 모드 적용

#### updates.js
- **기능**: 자동 업데이트 처리
- **주요 메서드**:
  - `checkForUpdates()`: 업데이트 확인
  - `downloadUpdate()`: 업데이트 다운로드
  - `installUpdate()`: 업데이트 설치

### 3.2 렌더러 프로세스 (Next.js 앱)

#### 3.2.1 개요
렌더러 프로세스는 Next.js 기반의 사용자 인터페이스를 담당하며, 다음과 같은 주요 기능을 수행합니다:
- 사용자 인터페이스 렌더링
- 사용자 상호작용 처리
- 메인 프로세스와의 IPC 통신
- 상태 관리
- 라우팅 및 내비게이션

#### 3.2.2 디렉토리 구조

##### 주요 디렉토리
- `/app`: Next.js 13+ 앱 라우터 기반의 페이지 및 레이아웃
- `/components`: 재사용 가능한 UI 컴포넌트
- `/hooks`: 커스텀 React 훅
- `/utils`: 유틸리티 함수
- `/types`: TypeScript 타입 정의
- `/api`: API 라우트 핸들러

##### 핵심 파일
- `layout.tsx`: 루트 레이아웃 컴포넌트
- `page.tsx`: 메인 페이지 컴포넌트
- `ClientLayout.tsx`: 클라이언트 사이드 전용 레이아웃
- `ClientProvider.tsx`: 클라이언트 사이드 프로바이더

#### 3.2.3 주요 컴포넌트

##### AppHeader
- **위치**: `components/AppHeader.tsx`
- **기능**: 애플리케이션 헤더 표시
- **주요 기능**:
  - 창 컨트롤 (최소화, 최대화, 닫기)
  - 다크 모드 전환
  - 설정 메뉴 접근
  - 사용자 프로필 표시
  - 알림 표시

##### MemoryMonitor
- **위치**: `components/MemoryMonitor.tsx`
- **기능**: 시스템 메모리 사용량 모니터링
- **주요 기능**:
  - 실시간 메모리 사용량 표시
  - 히스토리 차트
  - 임계값 초과 시 경고

#### 3.2.4 상태 관리

##### 로컬 상태
- React의 `useState`, `useReducer` 훅 사용
- 컴포넌트 수준의 간단한 상태 관리

##### 전역 상태
- React Context API를 활용한 상태 공유
- 사용자 세션, 테마, 애플리케이션 설정 등 전역 상태 관리

#### 3.2.5 라우팅

##### 파일 시스템 기반 라우팅
- Next.js 13+의 앱 라우터 사용
- 동적 라우트 세그먼트 (`[param]`)
- 병렬 라우트
- 인터셉팅 라우트

##### 네비게이션
- `next/navigation`의 `useRouter` 훅 사용
- 클라이언트 사이드 네비게이션
- 프로그래매틱 네비게이션
- 스크롤 복원 처리

#### 3.2.6 성능 최적화

##### 코드 분할
- 동적 임포트를 통한 코드 스플리팅
- 컴포넌트 레벨의 지연 로딩

##### 이미지 최적화
- Next.js `Image` 컴포넌트 사용
- 자동 WebP 변환
- 지연 로딩
- 반응형 이미지

#### 3.2.7 테스트 전략

##### 단위 테스트
- Jest + React Testing Library
- 컴포넌트 스냅샷 테스트
- 사용자 상호작용 테스트

##### E2E 테스트
- Cypress 또는 Playwright
- 사용자 시나리오 기반 테스트
- 크로스 브라우저 테스트

#### 3.2.8 접근성
- WAI-ARIA 표준 준수
- 키보드 네비게이션 지원
- 스크린 리더 호환성
- 색상 대비 검사

#### 3.2.9 국제화(i18n)
- 다국어 지원 구조
- 동적 번역 로드
- RTL(오른쪽에서 왼쪽) 언어 지원
- 날짜/시간/숫자 형식 지역화
- **기능**: 메모리 사용량 모니터링
- **주요 기능**:
  - 실시간 메모리 사용량 표시
  - 힙 메모리 추적
  - 메모리 누수 감지

#### GPUSettingsPanel
- **위치**: `components/GPUSettingsPanel.tsx`
- **기능**: GPU 설정 관리
- **주요 기능**:
  - GPU 가속 설정
  - GPU 정보 표시
  - 성능 모니터링

## 4. 데이터 흐름

### 4.1 초기화 과정
1. 메인 프로세스 시작 (`main.js`)
2. 설정 로드 (`settings.js`)
3. 데이터베이스 초기화 (`database.js`)
4. 메인 창 생성 (`window.js`)
5. 렌더러 프로세스 로드 (Next.js)
6. 네이티브 모듈 초기화

### 4.2 사용자 상호작용 처리
1. 사용자 입력 이벤트 발생
2. 이벤트가 IPC를 통해 메인 프로세스로 전달
3. 메인 프로세스에서 해당 이벤트 처리
4. 필요한 경우 네이티브 모듈 호출
5. 처리 결과를 렌더러 프로세스로 반환
6. UI 업데이트

## 5. 성능 최적화

### 5.1 메모리 관리
- **메모리 누수 방지**: 이벤트 리스너 정리
- **효율적인 가비지 컬렉션**: `--expose-gc` 플래그 사용
- **메모리 사용량 모니터링**: `process.memoryUsage()` 활용

### 5.2 렌더링 성능
- **가상화**: 긴 목록에 대한 가상 스크롤링
- **코드 분할**: 동적 임포트를 통한 번들 크기 최적화
- **이미지 최적화**: WebP 포맷 및 지연 로딩

### 5.3 네이티브 모듈 최적화
- **병렬 처리**: Rayon을 이용한 데이터 병렬화
- **메모리 안전성**: Rust의 소유권 모델 활용
- **FFI 오버헤드 최소화**: 일괄 처리 및 버퍼 재사용

## 6. 보안 고려사항

### 6.1 주요 보안 조치
- **콘텐츠 보안 정책 (CSP)**: XSS 공격 방지
- **컨텍스트 격리**: 렌더러 프로세스 격리
- **세션 관리**: 안전한 세션 처리
- **네이티브 바인딩 검증**: 모든 네이티브 호출 검사

### 6.2 데이터 보호
- **민감 데이터 암호화**: 사용자 설정 및 자격 증명 암호화
- **안전한 저장소**: Electron의 safeStorage API 활용
- **네트워크 보안**: HTTPS 및 보안 헤더 적용

## 7. 빌드 및 배포

### 7.1 개발 환경 설정
```bash
# 종속성 설치
yarn install

# 개발 서버 실행
yarn dev

# 프로덕션 빌드
yarn build

# 패키징
yarn package
```

### 7.2 배포 전략
- **자동 업데이트**: Electron 업데이터 통합
- **코드 서인**: 빌드 결과물 검증
- **서명**: 코드 서명 인증서를 통한 실행 파일 서명

## 8. 문제 해결

### 8.1 일반적인 문제
1. **네이티브 모듈 빌드 실패**
   - Rust 툴체인 확인
   - `node-gyp` 종속성 설치

2. **메모리 누수**
   - 개발자 도구의 메모리 프로파일러 사용
   - 이벤트 리스너 정리 확인

3. **렌더링 성능 저하**
   - React DevTools 프로파일러 실행
   - 불필요한 리렌더링 확인

## 9. 향후 개선 사항

### 9.1 성능 향상
- WebAssembly를 통한 크로스 플랫폼 최적화
- 메인 스레드 차단 방지를 위한 워커 스레드 활용도 향상

### 9.2 기능 확장
- 플러그인 시스템 도입
- 사용자 정의 테마 및 스킨 지원
- 클라우드 동기화 기능 추가

### 9.3 개발자 경험 개선
- API 문서 자동화
- 통합 테스트 커버리지 확대
- 디버깅 도구 개선

## 10. 결론

Loop 프로젝트는 현대적인 데스크톱 애플리케이션 개발의 모범 사례를 보여주는 훌륭한 예시입니다. Electron, React, Next.js, Rust를 조합하여 크로스 플랫폼 호환성과 뛰어난 성능을 동시에 달성했습니다. 이 문서에서 설명한 아키텍처와 구현 세부사항은 비슷한 요구사항을 가진 프로젝트에 참고 자료로 활용될 수 있습니다.

향후 지속적인 유지보수와 개선을 통해 더욱 견고하고 확장 가능한 애플리케이션으로 발전시킬 수 있을 것입니다.
