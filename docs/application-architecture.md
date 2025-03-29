# Typing Stats App 아키텍처 및 설계 문서

## 개요

Typing Stats App은 사용자의 타이핑 습관, 속도 및 정확도를 추적하고 분석하는 데스크톱 애플리케이션입니다. Next.js와 Electron을 결합하여 크로스 플랫폼 지원을 제공하며, Rust로 작성된 네이티브 모듈을 통해 키 입력 추적 및 고성능 데이터 처리 기능을 구현합니다.

## 주요 기능

- **타이핑 속도 및 정확도 측정**: 분당 타자수(WPM), 정확도, 오류율 등을 실시간으로 계산
- **키 입력 패턴 분석**: 자주 사용하는 키, 문제가 있는 키, 타이핑 흐름 분석
- **통계 데이터 시각화**: 차트 및 그래프로 타이핑 통계 표시
- **시간별 개선 추적**: 타이핑 능력 향상 정도를 시간에 따라 추적
- **백그라운드 모니터링**: 시스템 트레이에서 실행되어 백그라운드에서 데이터 수집

## 기술 스택

### 프론트엔드
- **Next.js**: 리액트 기반 프레임워크로 UI 구현
- **React**: 사용자 인터페이스 컴포넌트
- **Recharts / Chart.js**: 데이터 시각화
- **TypeScript**: 타입 안정성 제공

### 백엔드
- **Electron**: 데스크톱 애플리케이션 프레임워크
- **Rust**: 네이티브 모듈로 키 입력 추적 및 고성능 연산 제공
- **Node.js**: JavaScript 런타임

### 데이터베이스
- **SQLite / MySQL**: 로컬 데이터 저장과 선택적 서버 동기화
- **Prisma**: 데이터베이스 ORM

### 배포 및 인프라
- **Vercel**: 웹 버전 호스팅 및 배포
- **GitHub / GitLab**: 소스 코드 관리 및 CI/CD

## 아키텍처 개요

Typing Stats App은 다계층(Multi-tier) 아키텍처를 기반으로 설계되었으며, 각 레이어는 특정 책임을 담당합니다. 이런 구조는 코드의 모듈성과 유지보수성을 향상시킵니다.

### 아키텍처 다이어그램

## 데이터 흐름

1. **키 입력 캡처**:
   - Rust 네이티브 모듈이 키보드 입력을 추적
   - 입력 이벤트를 애플리케이션에 전달

2. **데이터 처리 및 분석**:
   - 원시 키 입력 데이터를 처리하여 유의미한 메트릭으로 변환
   - 타이핑 패턴과 성능 지표 계산

3. **데이터 저장**:
   - 분석된 데이터를 로컬 데이터베이스에 저장
   - 필요에 따라 원격 서버와 동기화

4. **데이터 표시**:
   - UI 컴포넌트를 통해 처리된 데이터를 시각적으로 표시
   - 차트와 그래프를 사용하여 통계 시각화

## 주요 컴포넌트 

### 1. 키 로거 모듈
- 시스템 키보드 입력 추적
- 타이핑 속도 및 패턴 분석
- 사용자 프라이버시 보호 기능

### 2. 분석 엔진
- 타이핑 통계 계산
- 트렌드 및 패턴 식별
- 성능 향상 제안

### 3. 대시보드
- 주요 타이핑 메트릭 표시
- 시간별/일별/주별 통계
- 개선 영역 하이라이팅

### 4. 설정 및 사용자 프로필
- 개인화 설정
- 배경/포그라운드 모드 전환
- 데이터 내보내기 및 백업

## 배포 프로세스

애플리케이션 배포는 두 가지 경로로 이루어집니다:

### 웹 배포 (Vercel)
1. GitHub/GitLab 저장소에 코드 푸시
2. CI/CD 파이프라인 트리거
3. 테스트 실행 및 빌드
4. Vercel에 배포
5. 도메인 연결 (eloop.kro.kr)

### 데스크톱 배포
1. Electron 애플리케이션 빌드
2. 네이티브 모듈 컴파일 및 패키징
3. 인스톨러 생성 (Windows/macOS/Linux)
4. 배포 채널을 통해 배포

## 성능 고려사항

- **메모리 사용량**: 장기간 실행에도 메모리 누수 방지
- **CPU 사용량**: 백그라운드 모드에서 최소 CPU 사용
- **저장소 크기**: 효율적인 데이터 저장 전략
- **응답성**: UI 반응성을 위한 비동기 처리

## 보안 고려사항

- **키 로깅 범위**: 민감한 정보(암호 등) 제외
- **데이터 암호화**: 저장된 타이핑 데이터 암호화
- **사용자 동의**: 데이터 수집 전 명시적 동의
- **응용 프로그램 격리**: 네이티브 모듈의 시스템 접근 제한

## 확장 계획

- **클라우드 동기화**: 여러 기기 간 통계 동기화
- **팀 기능**: 그룹 및 조직 내 타이핑 통계 비교
- **커스텀 훈련**: 타이핑 약점에 맞춘 훈련 모드
- **다국어 지원**: 다양한 언어 레이아웃 및 UI 지원
- **플러그인 시스템**: 써드파티 기능 확장 지원

## 개발 환경 설정

새로운 개발 환경을 설정하려면:

1. 저장소 복제: `git clone [repository-url]`
2. 의존성 설치: `npm install --legacy-peer-deps`
3. Rust 도구체인 설치: [rustup.rs](https://rustup.rs)
4. 네이티브 모듈 빌드: `npm run build:native`
5. 개발 서버 실행: `npm run dev`

자세한 내용은 [환경 설정 가이드](./environment-setup.md)를 참조하세요.

## 문제 해결

일반적인 문제 및 해결 방법:

- **네이티브 모듈 빌드 실패**: `npm run fix:build-errors` 및 `npm run fix:permissions` 실행
- **배포 오류**: `docs/domains-troubleshooting.md` 참조
- **클라우드 동기화 문제**: `npm run sync:cleanup` 실행

## 결론

Typing Stats App은 현대적인 웹 기술과 네이티브 시스템 통합을 조합하여 타이핑 습관 개선을 위한 강력한 도구를 제공합니다. 모듈식 아키텍처를 통해 유지보수성과 확장성을 보장하며, 크로스 플랫폼 지원으로 다양한 환경에서 사용할 수 있습니다. 


Typing Stats App의 상세 아키텍처
계층화된 아키텍처 (Layered Architecture)
Typing Stats App은 다음과 같은 계층화된 아키텍처로 구성되어 있습니다:

+-------------------------------------------+
|                  UI 계층                   |
|  +-------------------------------------+  |
|  | Next.js 컴포넌트 | React 컴포넌트    |  |
|  | 데이터 시각화    | 사용자 설정 UI   |  |
+--+-------------------------------------+--+
|                서비스 계층                |
|  +-------------------------------------+  |
|  | 타이핑 분석 | 통계 계산 | 데이터 변환 |  |
|  | 설정 관리   | 사용자 프로필 서비스    |  |
+--+-------------------------------------+--+
|                데이터 계층                |
|  +-------------------------------------+  |
|  | Prisma ORM | 데이터 접근 레이어      |  |
|  | 쿼리 최적화 | 데이터 마이그레이션    |  |
+--+-------------------------------------+--+
|               네이티브 계층               |
|  +-------------------------------------+  |
|  | Rust 모듈   | 키보드 입력 캡처       |  |
|  | 고성능 알고리즘 | OS 시스템 통합     |  |
+--+-------------------------------------+--+
|              저장소 계층                  |
|  +-------------------------------------+  |
|  | SQLite/MySQL | 로컬/클라우드 동기화  |  |
+--+-------------------------------------+--+

주요 모듈 상세 설명
1. UI 모듈 (Next.js + React)

src/
├── pages/              // Next.js 페이지 라우팅
│   ├── index.tsx       // 메인 대시보드 페이지
│   ├── stats/          // 통계 관련 페이지들
│   ├── settings/       // 설정 페이지
│   └── profile/        // 사용자 프로필 페이지
├── components/         // 재사용 가능한 React 컴포넌트
│   ├── common/         // 공통 UI 요소
│   ├── charts/         // 차트 컴포넌트 
│   ├── dashboard/      // 대시보드 관련 컴포넌트
│   └── settings/       // 설정 관련 컴포넌트
└── styles/             // CSS 및 스타일 파일



2. 서비스 모듈

src/
├── services/
│   ├── typing/               # 타이핑 관련 서비스
│   │   ├── analyzer.ts       # 타이핑 패턴 분석
│   │   ├── metrics.ts        # 타이핑 메트릭 계산 (WPM, 정확도)
│   │   └── keyboard.ts       # 키보드 레이아웃 처리
│   ├── stats/                # 통계 서비스
│   │   ├── aggregator.ts     # 데이터 집계 및 통계
│   │   └── trends.ts         # 추세 분석
│   └── settings/             # 설정 관리 서비스
└── utils/                    # 유틸리티 함수


3. 데이터 접근 계층
src/
├── models/              # 데이터 모델 정의
│   ├── typing.ts        # 타이핑 관련 모델
│   ├── user.ts          # 사용자 프로필 모델
│   └── settings.ts      # 설정 모델
├── repositories/        # 데이터 액세스 객체
│   ├── typing-repo.ts   # 타이핑 데이터 리포지토리
│   ├── user-repo.ts     # 사용자 데이터 리포지토리
│   └── settings-repo.ts # 설정 데이터 리포지토리
└── prisma/              # Prisma ORM 설정
    ├── schema.prisma    # 데이터베이스 스키마
    └── migrations/      # DB 마이그레이션



4. 네이티브 모듈 (Rust)

native-modules/
├── src/
│   ├── lib.rs           # 진입점 및 모듈 등록
│   ├── keylogger/       # 키 입력 추적 모듈
│   │   ├── mod.rs       # 모듈 정의
│   │   ├── windows.rs   # Windows 플랫폼 구현
│   │   ├── macos.rs     # macOS 플랫폼 구현
│   │   └── linux.rs     # Linux 플랫폼 구현
│   ├── metrics/         # 성능 측정 및 최적화 모듈
│   │   ├── mod.rs
│   │   └── calculations.rs
│   └── utils/           # 유틸리티 및 헬퍼 함수
├── Cargo.toml           # Rust 프로젝트 설정
└── build.rs             # 빌드 스크립트


5. Electron 메인 프로세스

src/
├── electron/
│   ├── main.ts          # Electron 메인 프로세스
│   ├── preload.ts       # 사전 로드 스크립트
│   ├── ipc/             # IPC (프로세스 간 통신)
│   │   ├── channels.ts  # 채널 정의
│   │   └── handlers.ts  # 이벤트 핸들러
│   └── tray.ts          # 시스템 트레이 통합


데이터 모델 스키마

// DB 스키마 (Prisma 형식)
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  createdAt DateTime @default(now())
  sessions  Session[]
  settings  Settings?
}

model Session {
  id        String   @id @default(uuid())
  startTime DateTime @default(now())
  endTime   DateTime?
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  typingData TypingData[]
  application String?  // 어떤 애플리케이션에서 작업했는지
}

model TypingData {
  id          String   @id @default(uuid())
  timestamp   DateTime @default(now())
  key         String   // 누른 키
  pressTime   Int      // 키 누름 지속 시간 (ms)
  session     Session  @relation(fields: [sessionId], references: [id])
  sessionId   String
  isError     Boolean  @default(false)
}

model Settings {
  id             String  @id @default(uuid())
  user           User    @relation(fields: [userId], references: [id])
  userId         String  @unique
  trackInPrivate Boolean @default(false) // 개인정보 모드에서 추적 여부
  themeMode      String  @default("system") // light, dark, system
  autoStart      Boolean @default(true) // 시스템 시작 시 자동 실행
  syncEnabled    Boolean @default(false) // 클라우드 동기화 사용 여부
}

model DailyStats {
  id        String   @id @default(uuid())
  date      DateTime @unique
  userId    String
  wpm       Float    // 평균 분당 타자수
  accuracy  Float    // 정확도 (%)
  duration  Int      // 총 타이핑 시간 (분)
  keyCount  Int      // 총 타이핑 키 수
  errorCount Int     // 오타 수
}


통신 프로토콜
Electron IPC 통신

// 메인 프로세스와 렌더러 프로세스 간 통신 채널
channels: {
  // 키 입력 관련
  KEY_EVENT: 'key-event',
  START_TRACKING: 'start-tracking',
  STOP_TRACKING: 'stop-tracking',
  
  // 데이터 관련
  GET_STATS: 'get-stats',
  SAVE_SETTINGS: 'save-settings',
  GET_SETTINGS: 'get-settings',
  
  // 시스템 관련
  APP_READY: 'app-ready',
  MINIMIZE_TO_TRAY: 'minimize-to-tray',
  QUIT_APP: 'quit-app'
}


Rust-JS 브릿지 인터페이스

// Rust 네이티브 모듈에서 노출하는 함수들
interface NativeModuleAPI {
  // 키보드 추적 관련
  startKeyLogger: (options: KeyLoggerOptions) => void;
  stopKeyLogger: () => void;
  isTracking: () => boolean;
  
  // 성능 분석 관련
  calculateWPM: (keyPresses: KeyPress[], duration: number) => number;
  calculateAccuracy: (keyPresses: KeyPress[]) => number;
  analyzeKeyboardHeatmap: (keyPresses: KeyPress[]) => KeyHeatmap;
  
  // 시스템 관련
  getActiveWindow: () => WindowInfo;
  isPrivateMode: (windowInfo: WindowInfo) => boolean;
}

interface KeyPress {
  key: string;
  timestamp: number;
  duration: number;
  isError: boolean;
}

interface WindowInfo {
  title: string;
  processName: string;
  path: string;
}


보안 및 최적화 전략
보안 전략
민감 정보 필터링: 비밀번호 필드, 결제 창 등에서는 키 로깅 자동 비활성화
데이터 암호화: SQLite DB 암호화 및 네트워크 통신 TLS 사용
권한 축소: 네이티브 모듈은 필요한 최소 시스템 권한만 사용
사용자 동의: 첫 실행 시 데이터 수집 범위와 용도에 대한 명시적 동의 요구
성능 최적화
증분 분석: 실시간으로 모든 통계를 재계산하지 않고 증분 업데이트
지연 동기화: 장기 분석 데이터는 유휴 시간에 계산 및 동기화
메모리 관리: Rust에서 고성능 알고리즘으로 메모리 사용 최적화
가비지 컬렉션: JavaScript 메모리 관리 최적화를 위한 명시적 GC 호출
DB 인덱싱: 자주 조회하는 필드에 적절한 인덱스 생성
배포 및 확장성
자동화된 배포 파이프라인
GitHub Actions를 통한 CI/CD 파이프라인
플랫폼별 빌드 (Windows, macOS, Linux)
자동 버전 관리 및 릴리스 노트 생성
코드 품질 및 테스트 자동화
시스템 요구사항
OS: Windows 10/11, macOS 11+, Linux (Ubuntu 20.04+)
CPU: 듀얼 코어 이상
RAM: 최소 4GB
저장 공간: 100MB+
Rust: 1.83.0 이상
Node.js: 18 LTS 이상
이 아키텍처는 사용자 경험을 최우선으로 하면서, 성능과 확장성을 모두 고려하여 설계되었습니다. 모듈식 구조로 인해 새로운 기능 추가와 유지보수가 용이하며, Rust 네이티브 모듈을 통해 고성능 시스템 통합을 제공합니다.


이거 md 파일로 변경해줘Typing Stats App의 상세 아키텍처
계층화된 아키텍처 (Layered Architecture)
Typing Stats App은 다음과 같은 계층화된 아키텍처로 구성되어 있습니다:

+-------------------------------------------+
|                  UI 계층                   |
|  +-------------------------------------+  |
|  | Next.js 컴포넌트 | React 컴포넌트    |  |
|  | 데이터 시각화    | 사용자 설정 UI   |  |
+--+-------------------------------------+--+
|                서비스 계층                |
|  +-------------------------------------+  |
|  | 타이핑 분석 | 통계 계산 | 데이터 변환 |  |
|  | 설정 관리   | 사용자 프로필 서비스    |  |
+--+-------------------------------------+--+
|                데이터 계층                |
|  +-------------------------------------+  |
|  | Prisma ORM | 데이터 접근 레이어      |  |
|  | 쿼리 최적화 | 데이터 마이그레이션    |  |
+--+-------------------------------------+--+
|               네이티브 계층               |
|  +-------------------------------------+  |
|  | Rust 모듈   | 키보드 입력 캡처       |  |
|  | 고성능 알고리즘 | OS 시스템 통합     |  |
+--+-------------------------------------+--+
|              저장소 계층                  |
|  +-------------------------------------+  |
|  | SQLite/MySQL | 로컬/클라우드 동기화  |  |
+--+-------------------------------------+--+

주요 모듈 상세 설명
1. UI 모듈 (Next.js + React)

src/
├── pages/              # Next.js 페이지 라우팅
│   ├── index.tsx       # 메인 대시보드 페이지
│   ├── stats/          # 통계 관련 페이지들
│   ├── settings/       # 설정 페이지
│   └── profile/        # 사용자 프로필 페이지
├── components/         # 재사용 가능한 React 컴포넌트
│   ├── common/         # 공통 UI 요소
│   ├── charts/         # 차트 컴포넌트 
│   ├── dashboard/      # 대시보드 관련 컴포넌트
│   └── settings/       # 설정 관련 컴포넌트
└── styles/             # CSS 및 스타일 파일


2. 서비스 모듈

src/
├── services/
│   ├── typing/               # 타이핑 관련 서비스
│   │   ├── analyzer.ts       # 타이핑 패턴 분석
│   │   ├── metrics.ts        # 타이핑 메트릭 계산 (WPM, 정확도)
│   │   └── keyboard.ts       # 키보드 레이아웃 처리
│   ├── stats/                # 통계 서비스
│   │   ├── aggregator.ts     # 데이터 집계 및 통계
│   │   └── trends.ts         # 추세 분석
│   └── settings/             # 설정 관리 서비스
└── utils/                    # 유틸리티 함수


3. 데이터 접근 계층
src/
├── models/              # 데이터 모델 정의
│   ├── typing.ts        # 타이핑 관련 모델
│   ├── user.ts          # 사용자 프로필 모델
│   └── settings.ts      # 설정 모델
├── repositories/        # 데이터 액세스 객체
│   ├── typing-repo.ts   # 타이핑 데이터 리포지토리
│   ├── user-repo.ts     # 사용자 데이터 리포지토리
│   └── settings-repo.ts # 설정 데이터 리포지토리
└── prisma/              # Prisma ORM 설정
    ├── schema.prisma    # 데이터베이스 스키마
    └── migrations/      # DB 마이그레이션



4. 네이티브 모듈 (Rust)

native-modules/
├── src/
│   ├── lib.rs           # 진입점 및 모듈 등록
│   ├── keylogger/       # 키 입력 추적 모듈
│   │   ├── mod.rs       # 모듈 정의
│   │   ├── windows.rs   # Windows 플랫폼 구현
│   │   ├── macos.rs     # macOS 플랫폼 구현
│   │   └── linux.rs     # Linux 플랫폼 구현
│   ├── metrics/         # 성능 측정 및 최적화 모듈
│   │   ├── mod.rs
│   │   └── calculations.rs
│   └── utils/           # 유틸리티 및 헬퍼 함수
├── Cargo.toml           # Rust 프로젝트 설정
└── build.rs             # 빌드 스크립트


5. Electron 메인 프로세스

src/
├── electron/
│   ├── main.ts          # Electron 메인 프로세스
│   ├── preload.ts       # 사전 로드 스크립트
│   ├── ipc/             # IPC (프로세스 간 통신)
│   │   ├── channels.ts  # 채널 정의
│   │   └── handlers.ts  # 이벤트 핸들러
│   └── tray.ts          # 시스템 트레이 통합


데이터 모델 스키마

// DB 스키마 (Prisma 형식)
model User {
  id        String   @id @default(uuid())
  username  String   @unique
  createdAt DateTime @default(now())
  sessions  Session[]
  settings  Settings?
}

model Session {
  id        String   @id @default(uuid())
  startTime DateTime @default(now())
  endTime   DateTime?
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  typingData TypingData[]
  application String?  // 어떤 애플리케이션에서 작업했는지
}

model TypingData {
  id          String   @id @default(uuid())
  timestamp   DateTime @default(now())
  key         String   // 누른 키
  pressTime   Int      // 키 누름 지속 시간 (ms)
  session     Session  @relation(fields: [sessionId], references: [id])
  sessionId   String
  isError     Boolean  @default(false)
}

model Settings {
  id             String  @id @default(uuid())
  user           User    @relation(fields: [userId], references: [id])
  userId         String  @unique
  trackInPrivate Boolean @default(false) // 개인정보 모드에서 추적 여부
  themeMode      String  @default("system") // light, dark, system
  autoStart      Boolean @default(true) // 시스템 시작 시 자동 실행
  syncEnabled    Boolean @default(false) // 클라우드 동기화 사용 여부
}

model DailyStats {
  id        String   @id @default(uuid())
  date      DateTime @unique
  userId    String
  wpm       Float    // 평균 분당 타자수
  accuracy  Float    // 정확도 (%)
  duration  Int      // 총 타이핑 시간 (분)
  keyCount  Int      // 총 타이핑 키 수
  errorCount Int     // 오타 수
}


통신 프로토콜
Electron IPC 통신

// 메인 프로세스와 렌더러 프로세스 간 통신 채널
channels: {
  // 키 입력 관련
  KEY_EVENT: 'key-event',
  START_TRACKING: 'start-tracking',
  STOP_TRACKING: 'stop-tracking',
  
  // 데이터 관련
  GET_STATS: 'get-stats',
  SAVE_SETTINGS: 'save-settings',
  GET_SETTINGS: 'get-settings',
  
  // 시스템 관련
  APP_READY: 'app-ready',
  MINIMIZE_TO_TRAY: 'minimize-to-tray',
  QUIT_APP: 'quit-app'
}


Rust-JS 브릿지 인터페이스

// Rust 네이티브 모듈에서 노출하는 함수들
interface NativeModuleAPI {
  // 키보드 추적 관련
  startKeyLogger: (options: KeyLoggerOptions) => void;
  stopKeyLogger: () => void;
  isTracking: () => boolean;
  
  // 성능 분석 관련
  calculateWPM: (keyPresses: KeyPress[], duration: number) => number;
  calculateAccuracy: (keyPresses: KeyPress[]) => number;
  analyzeKeyboardHeatmap: (keyPresses: KeyPress[]) => KeyHeatmap;
  
  // 시스템 관련
  getActiveWindow: () => WindowInfo;
  isPrivateMode: (windowInfo: WindowInfo) => boolean;
}

interface KeyPress {
  key: string;
  timestamp: number;
  duration: number;
  isError: boolean;
}

interface WindowInfo {
  title: string;
  processName: string;
  path: string;
}


보안 및 최적화 전략
보안 전략
민감 정보 필터링: 비밀번호 필드, 결제 창 등에서는 키 로깅 자동 비활성화
데이터 암호화: SQLite DB 암호화 및 네트워크 통신 TLS 사용
권한 축소: 네이티브 모듈은 필요한 최소 시스템 권한만 사용
사용자 동의: 첫 실행 시 데이터 수집 범위와 용도에 대한 명시적 동의 요구
성능 최적화
증분 분석: 실시간으로 모든 통계를 재계산하지 않고 증분 업데이트
지연 동기화: 장기 분석 데이터는 유휴 시간에 계산 및 동기화
메모리 관리: Rust에서 고성능 알고리즘으로 메모리 사용 최적화
가비지 컬렉션: JavaScript 메모리 관리 최적화를 위한 명시적 GC 호출
DB 인덱싱: 자주 조회하는 필드에 적절한 인덱스 생성
배포 및 확장성
자동화된 배포 파이프라인
GitHub Actions를 통한 CI/CD 파이프라인
플랫폼별 빌드 (Windows, macOS, Linux)
자동 버전 관리 및 릴리스 노트 생성
코드 품질 및 테스트 자동화
시스템 요구사항
OS: Windows 10/11, macOS 11+, Linux (Ubuntu 20.04+)
CPU: 듀얼 코어 이상
RAM: 최소 4GB
저장 공간: 100MB+
Rust: 1.83.0 이상
Node.js: 18 LTS 이상
이 아키텍처는 사용자 경험을 최우선으로 하면서, 성능과 확장성을 모두 고려하여 설계되었습니다. 모듈식 구조로 인해 새로운 기능 추가와 유지보수가 용이하며, Rust 네이티브 모듈을 통해 고성능 시스템 통합을 제공합니다.



Typing Stats App은 다음과 같은 계층화된 아키텍처를 사용합니다:

