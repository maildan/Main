# Cargo 및 개발 환경 가이드라인

## 빌드 및 실행 절차

### 1. Cargo 빌드 절차
```powershell
# 1. src-tauri 디렉터리로 이동
cd src-tauri

# 2. cargo 빌드 실행
cargo build

# 3. 루트 디렉터리로 복귀
cd ..

# 4. 개발 서버 실행
yarn run dev
```

### 2. PowerShell 명령어 작성 규칙
**⚠️ 중요: PowerShell에서는 `&&` 연산자를 사용하지 않습니다.**

✅ **올바른 예시:**
```powershell
cd src-tauri; cargo build
cd ..; yarn run dev
```

❌ **잘못된 예시:**
```powershell
cd src-tauri && cargo build  # PowerShell에서 오류 발생
cd .. && yarn run dev         # PowerShell에서 오류 발생
```

## 코드 구조 관리

### 3. 파일 분할 규칙
- 코드 라인 수가 **500줄 이상**이 되면 별도 파일로 분할
- 관련 기능별로 모듈화하여 관리

### 4. Tauri 개발 참고사항
- **Tauri V2 공식 문서** 참조: https://v2.tauri.app/start/
- 최신 API 및 베스트 프랙티스 적용

## 개발 환경 설정

### 5. 프로젝트 구조 파악
- **모든 작업 전에 Loop 디렉터리 전체 구조를 먼저 파악**
- 기존 코드와의 호환성 고려

### 6. 터미널 작업 디렉터리
- 기본 작업 위치: `D:\Codes\Loop\`
- 별도 디렉터리 이동이 필요한 경우에만 `cd` 명령 사용

### 7. 🚨 **무한 루프 방지 (중요!)**
**⚠️ 경고: 터미널 명령어 실행 시 반드시 주의!**

- **터미널 명령 실행 후 `Ctrl + C`로 프로세스 종료**
- **백그라운드 프로세스 상태 확인 후 적절한 조치**
- **장시간 실행되는 명령어는 반드시 모니터링**
- **프로세스가 응답하지 않을 경우 즉시 종료**

**백그라운드 프로세스 관리:**
```powershell
# 실행 중인 프로세스 확인
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*cargo*"}

# 프로세스 강제 종료 (필요 시)
Stop-Process -Name "node" -Force
Stop-Process -Name "cargo" -Force
```