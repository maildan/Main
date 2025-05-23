# 데이터베이스 설계 문서

## 대용량 트래픽 처리 아키텍처

### 주요 데이터베이스 계층

1. **MongoDB Atlas (3초 주기 POST 쓰기 계층)**
   - 실시간 통계 데이터를 빠르게 저장
   - 3초마다 타이핑 통계 데이터 동기화
   - Replica-set 3 노드(Primary-Secondary-Secondary) 구성으로 고가용성 확보
   - WriteConcern:"majority", j:true 설정으로 데이터 내구성 보장

2. **Supabase/PostgreSQL (주 1회 ETL 백업 계층)**
   - 주기적으로 MongoDB 데이터를 장기 보존용으로 전송
   - 데이터 분석 및 대시보드용 최적화된 스키마
   - 트래픽 부하 분산 및 데이터 백업 역할

3. **로컬 SQLite (오프라인 캐싱 계층)**
   - 네트워크 연결 없이도 로컬에서 데이터 유지
   - 장애 발생 시 데이터 손실 방지
   - 응답 시간 개선을 위한 로컬 캐싱

## 장애 대응 메커니즘

### MongoDB Atlas 장애 대응
- Primary 노드 장애 시 자동 페일오버로 수 초 내 복구
- 클라이언트 드라이버가 새 Primary로 자동 재시도
- 로컬 메모리/디스크 대기열로 일시적 네트워크 장애 대비

### 네트워크 장애 대응
- 3초 간격의 동기화 실패 시 로컬 대기열에 저장
- 대기열은 FIFO 방식으로 처리되며 멱등성 보장
- 네트워크 재연결 시 자동으로 누락된 데이터 동기화

### 데이터 무결성 보장
- 멱등성 키를 사용해 중복 처리 방지
- Resume Token으로 MongoDB Change Stream 복구
- Dead Letter Queue(DLQ)에 실패한 작업 기록 및 관리

## 설계 고려사항

1. **대용량 트래픽 처리**
   - MongoDB의 수평적 확장성을 활용한 쓰기 처리
   - 배치 처리로 네트워크 오버헤드 최소화
   - 인덱스 최적화를 통한 쿼리 성능 향상

2. **데이터 손실 방지**
   - 멀티 레이어 저장 전략 (메모리 → MongoDB → Supabase)
   - TTL 인덱스로 자동 데이터 관리
   - 오류 복구 메커니즘 구현

3. **모니터링 및 알림**
   - 동기화 상태 실시간 모니터링
   - 오류 발생 시 재시도 메커니즘 구현
   - 성능 지표 수집 및 분석

## IPC 핸들러 모듈화 구조

IPC(Inter-Process Communication) 핸들러 모듈이 중앙화된 단일 파일 구조에서 기능별로 모듈화된 구조로 리팩토링되었습니다.

### 새로운 디렉토리 구조

```
src/main/handlers/
├── index.js           # 모든 핸들러를 통합 관리하는 인덱스 파일
├── tracking-handlers.js   # 모니터링 관련 핸들러
├── settings-handlers.js   # 설정 관련 핸들러
├── window-handlers.js     # 창/윈도우 관련 핸들러
├── memory-handlers.js     # 메모리 관리 관련 핸들러
├── restart-handlers.js    # 앱 재시작 관련 핸들러
├── system-info-handlers.js # 시스템 정보 관련 핸들러
└── keyboard-handlers.js   # 키보드 관련 핸들러
```

### 모듈화의 이점

1. **코드 유지보수성 향상**: 기능별로 코드가 분리되어 특정 기능 수정 시 관련 파일만 확인하면 됩니다.
2. **가독성 향상**: 파일 크기가 작아져 핸들러의 목적과 동작을 이해하기 쉬워졌습니다.
3. **확장성 개선**: 새로운 기능 추가 시 해당 기능에 맞는 새 핸들러 모듈만 추가하면 됩니다.
4. **코드 재사용성**: 공통 기능을 재사용할 수 있어 중복 코드가 줄었습니다.
5. **테스트 용이성**: 모듈별로 독립적인 테스트가 가능해졌습니다.

### 사용 방법

모든 IPC 핸들러는 `handlers/index.js`를 통해 등록됩니다:

```javascript
const ipcHandlers = require('./handlers');

// 모든 IPC 핸들러 등록
ipcHandlers.setupAllHandlers();

// 특정 기능에 직접 접근도 가능
ipcHandlers.trackingHandlers.sendStatusToRenderer();
```

### 기존 코드와의 호환성

기존 코드와의 호환성을 위해 `ipc-handlers.js` 파일은 유지되었으며, 새 모듈 구조를 사용하도록 리팩토링되었습니다:

```javascript
const ipcHandlers = require('./handlers');

function setupIpcHandlers() {
  ipcHandlers.setupAllHandlers();
}

// 호환성을 위한 내보내기
module.exports = {
  setupIpcHandlers,
  setupKeyboardListenerIfNeeded: ipcHandlers.setupKeyboardListenerIfNeeded,
  cleanupKeyboardListener: ipcHandlers.cleanupKeyboardListener,
  sendStatusToRenderer: ipcHandlers.sendStatusToRenderer
};
```

이 모듈화 작업으로 코드베이스의 구조가 개선되었으며, 향후 기능 추가 및 유지보수가 용이해졌습니다. HHGG