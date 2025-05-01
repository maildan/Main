
# Loop 프로젝트 기술 문서

## 1. 디렉토리 개요

Loop는 Electron 기반의 하이브리드 데스크톱 애플리케이션으로, 사용자의 타이핑 패턴과 시스템 성능을 분석하고 최적화하는 도구입니다. 프로젝트는 다음과 같은 주요 디렉토리 구조로 구성되어 있습니다:

### 루트 디렉토리 (`loop_3/`)

```
loop_3/
├── .git/               # Git 저장소
├── .next/              # Next.js 빌드 출력물
├── dist/               # 앱 배포 파일
├── src/                # 소스 코드
├── native-modules/     # Rust 네이티브 모듈
├── prisma/             # 데이터베이스 스키마
├── docs/               # 문서 파일
├── scripts/            # 자동화 스크립트
├── logs/               # 로그 파일
└── [설정 파일들]       # 각종 설정 파일
```

### 소스 코드 디렉토리 (`src/`)

```
src/
├── app/                # Next.js 앱 (UI 렌더러)
├── main/               # Electron 메인 프로세스
├── preload/            # Electron 프리로드 스크립트
├── server/             # 서버 측 로직
├── types/              # TypeScript 타입 정의
└── preload.js          # 메인 프리로드 스크립트
```

### 기술 스택 경계

1. **TypeScript/React (렌더러)**: `src/app/` 디렉토리
   - Next.js 기반 UI 컴포넌트
   - React 훅과 상태 관리
   - 렌더러 프로세스 로직

2. **JavaScript/Node.js (메인 프로세스)**: `src/main/` 디렉토리
   - Electron 메인 프로세스 로직
   - 시스템 통합 및 IPC 통신
   - 워커 스레드 관리

3. **Rust (네이티브 모듈)**: `native-modules/` 디렉토리
   - 성능 중심 로직
   - 메모리 최적화
   - GPU 가속
   - 워커 스레드 구현

4. **Prisma (데이터베이스)**: `prisma/` 디렉토리
   - ORM 스키마 정의
   - 마이그레이션 관리

## 2. 주요 로직 흐름

### 입력 처리 흐름 (키보드 이벤트)

```
사용자 키 입력
   ↓
main/keyboard.js (저수준 키보드 이벤트 캡처)
   ↓
main/stats.js (키 입력 처리 및 통계 계산)
   ↓
main/workers/ (워커 스레드에서 무거운 계산 처리)
   ↓
main/ipc-handlers.js (IPC 메시지로 결과 전송)
   ↓
preload.js (컨텍스트 브리지)
   ↓
app/hooks/useTypingStats.ts (데이터 수신 및 상태 관리)
   ↓
app/components/TypingAnalyzer.tsx (UI 렌더링)
```

### 메모리 최적화 흐름

```
app/components/MemoryMonitor.tsx (메모리 상태 모니터링 UI)
   ↓
app/hooks/useMemoryManagement.ts (메모리 관리 로직)
   ↓
app/utils/native-memory-bridge.ts (네이티브 모듈 브리지)
   ↓
preload.js (IPC 통신)
   ↓
main/ipc-handlers.js (IPC 메시지 수신)
   ↓
main/memory-manager.js & memory-manager-native.js (메모리 최적화 로직)
   ↓
server/native/index.js (네이티브 모듈 호출)
   ↓
native-modules/src/memory/ (Rust 구현)
   ↓
결과 반환 (역방향으로 UI까지)
```

### GPU 가속 흐름

```
app/components/GPUSettingsPanel.tsx (GPU 설정 UI)
   ↓
app/hooks/useNativeGpu.ts (GPU 설정 로직)
   ↓
app/utils/nativeModuleClient.ts (네이티브 클라이언트)
   ↓
preload.js (IPC 통신)
   ↓
main/ipc-handlers.js (IPC 메시지 수신)
   ↓
main/gpu-utils.js (GPU 설정 로직)
   ↓
server/native/index.js (네이티브 모듈 호출)
   ↓
native-modules/src/gpu/ (Rust 구현)
   ↓
결과 반환 (UI 업데이트)
```

### 데이터 저장 흐름

```
app/components/ (데이터 저장 요청 UI)
   ↓
app/hooks/ (상태 관리 훅)
   ↓
preload.js (IPC 통신)
   ↓
main/ipc-handlers.js (IPC 메시지 수신)
   ↓
main/database.js (데이터베이스 로직)
   ↓
Prisma Client API
   ↓
MySQL 데이터베이스
```

## 3. 컴포넌트 설명

### 렌더러 프로세스 주요 컴포넌트

#### `MemoryMonitor.tsx`
- **역할**: 실시간 메모리 사용량 모니터링 및 시각화
- **주요 기능**:
  - 메모리 사용량 그래프 표시
  - 가비지 컬렉션 요청 기능
  - 메모리 상태 경고 표시 (안전, 주의, 위험)
- **데이터 흐름**:
  - `useMemoryManagement` 훅을 통해 메모리 데이터 수신
  - ChartJS를 사용한 그래프 시각화
  - 메모리 최적화 API 호출

#### `TypingAnalyzer.tsx`
- **역할**: 타이핑 패턴 분석 및 성능 지표 표시
- **주요 기능**:
  - WPM(분당 단어 수) 계산
  - 정확도, 일관성 점수 표시
  - 피로도 분석
  - GPU 가속 분석 옵션
- **데이터 흐름**:
  - 키 입력 데이터 수신
  - 로컬 분석 또는 GPU 가속 분석 수행
  - 분석 결과 시각화

#### `NativeModuleTest.tsx`
- **역할**: 네이티브 모듈 연결 상태 테스트 및 표시
- **주요 기능**:
  - 네이티브 모듈 로드 상태 확인
  - 폴백 모드 감지
  - 사용 가능한 함수 목록 표시
  - 메모리 최적화 테스트
- **데이터 흐름**:
  - API 요청을 통해 네이티브 모듈 상태 확인
  - 상태에 따른 UI 렌더링

### 메인 프로세스 주요 모듈

#### `keyboard.js`
- **역할**: 저수준 키보드 이벤트 캡처 및 처리
- **주요 기능**:
  - 글로벌 키보드 이벤트 리스너 설정
  - 키 입력 필터링 및 정규화
  - 키 이벤트 큐 관리
- **API 및 인터페이스**:
  - `startKeyboardMonitoring()`: 모니터링 시작
  - `stopKeyboardMonitoring()`: 모니터링 중지
  - `onKeyEvent`: 키 이벤트 콜백

#### `stats.js`
- **역할**: 타이핑 통계 계산 및 분석
- **주요 기능**:
  - 키 입력 데이터 집계
  - WPM, KPM 계산
  - 타이핑 패턴 분석
  - 시간별 통계 추적
- **API 및 인터페이스**:
  - `startTracking()`: 통계 추적 시작
  - `stopTracking()`: 통계 추적 중지
  - `processKeyInput(keyData)`: 키 입력 처리
  - `getStats()`: 현재 통계 반환

#### `memory-manager.js`
- **역할**: 메모리 사용량 최적화 및 관리
- **주요 기능**:
  - 메모리 사용량 모니터링
  - 가비지 컬렉션 트리거
  - 메모리 임계값 관리
  - 자동 최적화 스케줄링
- **API 및 인터페이스**:
  - `getMemoryInfo()`: 메모리 정보 반환
  - `optimizeMemory(level)`: 메모리 최적화
  - `setupMemoryMonitoring()`: 모니터링 설정

#### `ipc-handlers.js`
- **역할**: IPC 메시지 처리 및 라우팅
- **주요 기능**:
  - 렌더러 프로세스와 통신
  - 요청 핸들링 및 응답 전송
  - 이벤트 브로드캐스팅
- **API 및 인터페이스**:
  - 다양한 IPC 채널 핸들러 등록
  - 네이티브 모듈 API 노출

### 네이티브 모듈 주요 구성요소

#### `lib.rs`
- **역할**: Rust 네이티브 모듈 진입점
- **주요 기능**:
  - 모듈 등록 및 초기화
  - Node.js 바인딩 설정
  - 네이티브 모듈 메타데이터 제공
- **API 및 인터페이스**:
  - `get_timestamp()`: 타임스탬프 반환
  - `get_native_module_version()`: 모듈 버전 정보
  - `initialize_native_modules()`: 모듈 초기화

#### 네이티브 메모리 모듈
- **역할**: 효율적인 메모리 관리 및 최적화
- **주요 기능**:
  - 메모리 사용량 분석
  - 가비지 컬렉션 최적화
  - 메모리 풀 관리
- **API 및 인터페이스**:
  - `get_memory_info()`: 메모리 정보 반환
  - `optimize_memory(level)`: 메모리 최적화 수행
  - `force_garbage_collection()`: GC 강제 실행

#### 네이티브 GPU 모듈
- **역할**: GPU 가속 연산 제공
- **주요 기능**:
  - GPU 정보 수집
  - 병렬 연산 처리
  - 가속 설정 관리
- **API 및 인터페이스**:
  - `get_gpu_info()`: GPU 정보 반환
  - `set_gpu_acceleration(enabled)`: GPU 가속 설정
  - `perform_gpu_computation(task_type, params)`: GPU 연산 수행

## 4. 주요 커스텀 훅

### `useTypingStats.ts`
- **역할**: 타이핑 통계 상태 관리
- **주요 기능**:
  - 타이핑 데이터 수신 및 처리
  - 통계 상태 관리
  - 트래킹 시작/중지 제어
- **사용법**: 컴포넌트에서 타이핑 통계 데이터 접근

### `useMemoryManagement.ts`
- **역할**: 메모리 사용량 데이터 및 최적화 관리
- **주요 기능**:
  - 메모리 정보 폴링
  - 최적화 요청 처리
  - 메모리 상태 캐싱
- **사용법**: 메모리 모니터링 컴포넌트에서 사용

### `useNativeGpu.ts`
- **역할**: GPU 가속 기능 제어
- **주요 기능**:
  - GPU 상태 확인
  - 가속 설정 변경
  - 연산 처리 요청
- **사용법**: GPU 가속이 필요한 컴포넌트에서 사용

### `useElectronApi.ts`
- **역할**: Electron API 안전한 접근 제공
- **주요 기능**:
  - 브라우저/Node.js 환경 감지
  - Electron API 래핑
  - 기본값 제공
- **사용법**: Electron 기능 사용 시 안전하게 접근

## 5. 네이티브 모듈 브릿지

### `nativeModuleClient.ts`
- **역할**: 프론트엔드와 네이티브 모듈 간 통신 클라이언트
- **주요 기능**:
  - 네이티브 기능 요청 함수 제공
  - 오류 처리 및 폴백
  - 상태 캐싱
- **API 및 인터페이스**:
  - `getMemoryInfo()`: 메모리 정보 요청
  - `optimizeMemory(level)`: 메모리 최적화 요청
  - `performGpuComputation(taskType, params)`: GPU 연산 요청

### `native-memory-bridge.ts`
- **역할**: 메모리 관련 네이티브 기능 브릿지
- **주요 기능**:
  - 메모리 요청 오류 처리
  - 폴백 메커니즘
  - 브릿지 상태 관리
- **API 및 인터페이스**:
  - `requestNativeMemoryInfo()`: 메모리 정보 요청
  - `requestNativeMemoryOptimization(level)`: 최적화 요청
  - `requestNativeGarbageCollection()`: GC 요청

### `server/native/index.js`
- **역할**: Node.js와 Rust 네이티브 모듈 간 브릿지
- **주요 기능**:
  - 네이티브 모듈 로딩
  - 오류 처리 및 폴백
  - API 표면 정의
- **API 및 인터페이스**:
  - 네이티브 모듈 함수 래핑
  - 폴백 함수 제공
  - 상태 체크 함수

## 6. 데이터베이스 스키마

### Prisma 스키마 (`schema.prisma`)
- **주요 모델**:
  - `TypingLog`: 타이핑 세션 로그
    - 타이밍 정보
    - 키 카운트
    - 타이핑 시간
    - 타임스탬프

## 7. 빌드 및 배포 프로세스

- **개발 환경**: `yarn dev` (Next.js + Electron)
- **빌드 프로세스**:
  1. `yarn build:native`: Rust 네이티브 모듈 빌드
  2. `yarn build`: Next.js 앱 빌드
  3. `yarn electron:package`: Electron 패키징

## 8. 성능 최적화 특징

- **메모리 관리**:
  - 자동 최적화 기능
  - 주기적 GC
  - 메모리 임계값 설정
  - 네이티브 메모리 풀링

- **워커 스레딩**:
  - CPU 집약적 작업 오프로딩
  - 워커 풀 관리
  - 작업 분배 알고리즘

- **GPU 가속**:
  - 연산 가속
  - 자동 폴백 메커니즘
  - 하드웨어 감지

이 Loop 프로젝트는 웹 기술과 네이티브 성능의 장점을 결합한 하이브리드 아키텍처를 구현하여, 사용자의 타이핑 행동을 분석하고 성능을 최적화하는 고성능 데스크톱 애플리케이션을 제공합니다.
