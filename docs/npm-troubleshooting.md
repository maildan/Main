# npm 문제 해결 가이드

이 문서는 Typing Stats App 개발 중에 발생할 수 있는 npm 관련 오류를 해결하는 방법을 설명합니다.

## TAR_ENTRY_ERROR 및 EBADF 오류

### 증상

npm 설치 중 다음과 같은 오류가 표시됩니다:

```
npm warn tar TAR_ENTRY_ERROR UNKNOWN: unknown error, write
npm error code EBADF
npm error syscall write
npm error errno -4083
npm error EBADF: bad file descriptor, write
```

### 빠른 해결 방법

자동 해결 스크립트를 실행합니다:

```bash
npm run fix:npm-errors
```

또는

```bash
npm run fix:tar-errors
```

### 수동 해결 단계

자동 스크립트가 실패하면 다음 단계를 순서대로 시도하세요:

1. **npm 캐시 정리**
   ```bash
   npm cache clean --force
   ```

2. **npm 잠금 파일 삭제**
   - Windows:
     ```
     del %USERPROFILE%\.npm\_locks\* /q
     ```
   - Linux/Mac:
     ```
     rm -f ~/.npm/_locks/*
     ```

3. **node_modules 폴더 삭제**
   - Windows:
     ```
     rmdir /s /q node_modules
     ```
   - Linux/Mac:
     ```
     rm -rf node_modules
     ```

4. **package-lock.json 파일 삭제**
   - Windows:
     ```
     del package-lock.json
     ```
   - Linux/Mac:
     ```
     rm package-lock.json
     ```

5. **의존성 재설치**
   ```bash
   npm install --no-package-lock
   ```

## Google Drive/Dropbox 환경에서의 특별 문제 해결

클라우드 동기화 서비스(Google Drive, Dropbox 등)에서 npm 관련 작업을 할 때는 다음과 같은 추가 문제가 발생할 수 있습니다:

### "액세스 거부" 또는 "권한 없음" 오류

#### 원인

클라우드 동기화 서비스가 파일을 잠그거나 동기화 중일 때 파일 접근에 제한이 생깁니다.

#### 해결 방법

1. **클라우드 동기화 일시 중지**
   - Google Drive에서 백업 및 동기화 앱 일시 중지
   - Dropbox 동기화 일시 중지

2. **동기화 준비/정리 스크립트 사용**
   ```bash
   # 작업 시작 전
   npm run sync:prepare
   
   # 작업 완료 후
   npm run sync:cleanup
   ```

3. **강제 설치 옵션 사용**
   ```bash
   npm install --no-package-lock --no-fund --no-audit --force
   ```
   
   또는
   
   ```bash
   npm ci --legacy-peer-deps --no-audit --force
   ```

4. **파일 액세스 문제가 계속되면**:
   - **Windows**:
     - 관리자 권한으로 명령 프롬프트를 열고 다음 명령 실행:
       ```
       rmdir /s /q node_modules
       npm install --no-package-lock
       ```
   
   - **macOS/Linux**:
     ```
     sudo rm -rf node_modules
     npm install --no-package-lock
     ```

## 높은 권한(관리자) 해결 방법

일반적인 방법이 실패하면 관리자/루트 권한으로 다음 단계를 시도해 보세요:

### Windows에서

1. 관리자 권한으로 명령 프롬프트 열기
2. 프로젝트 폴더로 이동
3. 다음 명령 실행:
   ```
   npm cache clean --force
   rmdir /s /q node_modules
   del package-lock.json
   npm install --legacy-peer-deps
   ```

### Linux/Mac에서

```bash
sudo rm -rf ~/.npm
sudo rm -rf node_modules
rm package-lock.json
npm install --legacy-peer-deps
```

## 추가 문제 해결 팁

### 시스템 임시 폴더 정리

일부 경우에는 시스템 임시 폴더에 npm 임시 파일이 남아있을 수 있습니다:

- Windows:
  ```
  del /f /s /q %TEMP%\npm-*
  ```
- Linux/Mac:
  ```
  rm -rf /tmp/npm-*
  ```

### 디스크 공간 확인

`npm install`은 상당한 디스크 공간이 필요합니다. 디스크 공간이 충분한지 확인하세요:

- Windows: 파일 탐색기에서 드라이브 속성 확인
- Linux/Mac: 터미널에서 `df -h` 명령 실행

### npm 재설치

npm 자체에 문제가 있는 경우:

```bash
npm install -g npm@latest
```

### 클라우드 동기화 관련 문제

클라우드 동기화 서비스(예: OneDrive, Google Drive)로 인한 파일 잠금 문제가 발생할 수 있습니다:

1. 클라우드 동기화를 일시적으로 중지
2. `npm run sync:prepare` 실행
3. npm 명령 실행
4. 완료 후 `npm run sync:cleanup` 실행
5. 클라우드 동기화 재활성화

### 다른 패키지 관리자 사용

npm에 지속적인 문제가 있으면 다른 패키지 관리자를 시도해 보세요:

```bash
# pnpm 사용
npx pnpm install

# yarn 사용
npx yarn install
```

## 지속적인 문제가 있는 경우

위의 모든 방법이 실패하면 다음을 시도해 보세요:

1. 컴퓨터 재부팅
2. 다른 네트워크 환경에서 시도 (일부 기업 방화벽에서 npm 설치 문제 발생 가능)
3. 별도의 디렉토리에 프로젝트를 새로 복제하고, 필요한 파일만 복사
4. Node.js를 최신 LTS 버전으로 업데이트

