# Google Drive 환경에서의 개발 가이드

이 문서는 Google Drive와 같은 클라우드 동기화 환경에서 프로젝트를 개발할 때 발생할 수 있는 문제들과 해결 방법을 설명합니다.

## 공통적인 문제점

클라우드 스토리지(Google Drive, Dropbox, OneDrive 등)에서 개발 작업을 할 때 다음과 같은 문제가 자주 발생합니다:

1. **파일 락 문제**: 클라우드 서비스가 동기화 중에 파일을 잠그므로 npm이나 Git이 파일에 접근할 수 없음
2. **권한 문제**: 동기화 중인 파일에 쓰기 권한이 제한됨
3. **성능 저하**: 대량의 작은 파일(예: node_modules)을 동기화할 때 성능이 크게 저하됨
4. **파일 손상**: 동기화 과정에서 파일이 손상될 가능성

## 해결 방법

### 1. 전용 도구 사용

이 프로젝트는 클라우드 동기화 환경에서 작업을 돕기 위한 특별한 도구를 제공합니다:

```bash
# Google Drive 환경에서 npm 설치 문제 해결 도구
npm run gdrive-install

# npm 오류 해결 도구 (일반적인 npm 오류)
npm run fix:npm-errors
```

### 2. 동기화 제외 설정

`.gdignore` 파일을 사용하여 특정 폴더를 Google Drive 동기화에서 제외합니다:

```
# node_modules/ 등 대용량 폴더를 제외
node_modules/
.next/
out/
build/
dist/
.git/
```

다음 명령어로 동기화 준비와 정리를 자동화할 수 있습니다:

```bash
# 동기화 준비 (작업 시작 전)
npm run sync:prepare

# 동기화 정리 (작업 완료 후)
npm run sync:cleanup
```

### 3. 권한 문제 해결

권한 문제가 발생하는 경우:

```bash
# 파일 권한 수정 도구 실행
npm run fix:permissions
```

Windows에서는 관리자 권한으로 명령 프롬프트를 열어 다음 명령을 실행할 수 있습니다:

```cmd
attrib -R "G:\다른 컴퓨터\내 노트북\typing-stats-app\*.*" /S
```

### 4. 빌드 오류 해결

빌드 과정에서 오류가 발생하는 경우:

```bash
npm run fix:build-errors
```

### 5. 심각한 설치 문제 해결

모든 방법이 실패할 경우, 다음과 같이 임시 디렉토리를 사용하여 설치하는 방법을 시도해보세요:

1. 프로젝트의 package.json을 로컬 디스크의 임시 폴더로 복사
2. 임시 폴더에서 npm install 실행
3. 생성된 node_modules 폴더를 프로젝트로 복사

이 과정은 `gdrive-npm-installer.js` 스크립트가 자동으로 수행합니다:

```bash
node scripts/gdrive-npm-installer.js
```

## 모범 사례

### 로컬 복사본으로 작업하기

가장 좋은 방법은 Google Drive에서 로컬 디스크로 프로젝트 복사본을 만들어 작업하는 것입니다:

```bash
# 로컬 디스크에 복사
xcopy /E /I /H "G:\다른 컴퓨터\내 노트북\typing-stats-app" "C:\Projects\typing-stats-app"

# 로컬 복사본에서 작업 후 다시 Google Drive로 복사
xcopy /E /I /H /Y "C:\Projects\typing-stats-app" "G:\다른 컴퓨터\내 노트북\typing-stats-app" 
```

### 동기화 중지 후 작업하기

중요한 작업을 수행할 때는 Google Drive 동기화를 일시적으로 중지한 후 작업을 완료하세요:

1. Google Drive 앱의 설정에서 동기화 일시 중지
2. 작업 수행 (npm install, build 등)
3. 작업 완료 후 동기화 재개

## 문제 해결

### ENOENT, EPERM, busy 오류

이런 오류는 파일에 접근할 수 없거나 파일이 사용 중일 때 발생합니다:

```
Error: ENOENT: no such file or directory
Error: EPERM: operation not permitted
Error: EBUSY: resource busy or locked
```

**해결 방법**:
- 파일 탐색기에서 해당 폴더를 닫고 다시 시도
- 컴퓨터를 재부팅하고 다시 시도
- `npm run fix:permissions` 실행

### 설치가 계속 실패할 경우

다음 단계를 순서대로 시도해보세요:

1. `npm cache clean --force`로 캐시 정리
2. `npm run gdrive-install`로 특별 설치 도구 실행
3. 로컬 디스크에 프로젝트를 복사하여 작업
4. 다른 패키지 매니저 시도 (예: pnpm, yarn)

### LOCK 파일 문제

npm이 .lock 파일에 접근할 수 없다는 오류가 발생하면:

```
npm ERR! code ELOCKVERIFY
npm ERR! ELOCKVERIFY Invalid or corrupted package-lock.json
```

**해결 방법**:
```bash
# 잠금 파일 제거 및 강제 설치
rm -f package-lock.json
npm install --no-package-lock --force
```

### 심볼릭 링크 지원 문제

Google Drive는 일반적으로 심볼릭 링크를 지원하지 않습니다. 심볼릭 링크를 생성하려고 할 때 다음과 같은 오류가 발생할 수 있습니다:

```
장치에서 기호화된 링크를 지원하지 않습니다.
```

**해결 방법**:
1. 정션 포인트 사용하기: Windows에서는 심볼릭 링크 대신 정션 포인트를 사용할 수 있습니다.
   ```bash
   # 정션 포인트 생성 스크립트 실행
   node scripts/setup-junction-nodemodules.js
   ```

2. 수동으로 정션 포인트 생성:
   ```cmd
   mklink /J node_modules C:\원하는\외부\경로\node_modules
   ```

자세한 정보는 [심볼릭 링크/정션 포인트 설정 가이드](./symlink-setup-guide.md)를 참조하세요.

## 결론

Google Drive 환경에서 개발하는 것은 편리하지만 여러 기술적 문제를 일으킬 수 있습니다. 위의 도구와 방법을 사용하면 대부분의 문제를 해결할 수 있습니다. 그러나 중요한 프로젝트의 경우, 로컬 디스크에서 작업하고 Git을 사용하여 버전을 관리하는 것이 가장 안전합니다.
