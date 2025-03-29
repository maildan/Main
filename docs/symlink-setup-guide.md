# Google Drive에서 심볼릭 링크/정션 포인트로 node_modules 관리하기

이 가이드는 Google Drive와 같은 클라우드 동기화 폴더에서 발생하는 npm 관련 문제(ENOTDIR, EINVAL 등)를 해결하기 위해 심볼릭 링크 또는 정션 포인트를 사용하는 방법을 설명합니다.

## 문제 설명

Google Drive에서 npm 설치 과정 중 다음과 같은 오류가 발생할 수 있습니다:

```
npm error code ENOTDIR
npm error syscall mkdir
npm error path G:\다른 컴퓨터\내 노트북\project\node_modules\some-package\node_modules
npm error errno -4052
npm error ENOTDIR: not a directory, mkdir 'G:\다른 컴퓨터\내 노트북\project\node_modules\some-package\node_modules'
```

이 문제는 Google Drive의 파일 잠금 메커니즘과 동기화 방식이 npm의 파일 처리 방식과 충돌하여 발생합니다.

## 해결 방법

### 1. 정션 포인트 사용하기 (권장)

Windows에서 Google Drive 같은 클라우드 스토리지에서는 심볼릭 링크를 지원하지 않는 경우가 많습니다. 이런 경우 정션 포인트(Junction Point)를 사용하면 문제를 해결할 수 있습니다.

#### 자동 설정 (스크립트 사용)

1. 관리자 권한으로 명령 프롬프트 또는 PowerShell을 실행합니다.
2. 다음 명령을 실행합니다:
   ```
   node scripts/setup-junction-nodemodules.js
   ```
3. 스크립트가 안내하는 대로 단계를 진행합니다.

#### 수동 설정

Windows에서 수동으로 정션 포인트를 설정하려면:

1. 기존 `node_modules` 폴더가 있다면 삭제합니다:
   ```
   rd /s /q node_modules
   ```

2. 외부 저장소 경로를 생성합니다:
   ```
   mkdir C:\Users\사용자명\typing-stats-modules\프로젝트명\node_modules
   ```

3. 정션 포인트를 생성합니다 (관리자 권한 필요할 수 있음):
   ```
   mklink /J node_modules C:\Users\사용자명\typing-stats-modules\프로젝트명\node_modules
   ```

4. npm 설치를 실행합니다:
   ```
   npm install
   ```

### 2. 심볼릭 링크 사용하기 

클라우드 스토리지가 심볼릭 링크를 지원하는 경우 이 방법을 사용할 수 있습니다.

#### 자동 설정 (스크립트 사용)

1. 관리자 권한으로 명령 프롬프트 또는 PowerShell을 실행합니다.
2. 다음 명령을 실행합니다:
   ```
   node scripts/setup-symlink-nodemodules.js
   ```
3. 스크립트가 안내하는 대로 단계를 진행합니다.

#### 수동 설정

Windows에서 수동으로 설정하려면:

1. 기존 `node_modules` 폴더가 있다면 삭제합니다:
   ```
   rd /s /q node_modules
   ```

2. 외부 저장소 경로를 생성합니다:
   ```
   mkdir C:\Users\사용자명\typing-stats-modules\프로젝트명\node_modules
   ```

3. 심볼릭 링크를 생성합니다 (관리자 권한 필요):
   ```
   mklink /D node_modules C:\Users\사용자명\typing-stats-modules\프로젝트명\node_modules
   ```

4. npm 설치를 실행합니다:
   ```
   npm install
   ```

## 정션 포인트와 심볼릭 링크의 차이점

- **정션 포인트**: Windows 파일 시스템 내에서만 작동하지만, Google Drive와 같은 클라우드 저장소에서도 잘 동작합니다.
- **심볼릭 링크**: 더 범용적이지만 특정 클라우드 저장소에서는 지원되지 않을 수 있습니다.

## 주의 사항

1. **관리자 권한**: Windows에서 심볼릭 링크와 정션 포인트를 생성하려면 관리자 권한이 필요할 수 있습니다.
2. **각 컴퓨터별 설정**: 이 설정은 현재 컴퓨터에만 적용됩니다. 다른 컴퓨터에서 작업할 때는 각각 설정해야 합니다.
3. **백업**: 중요한 파일은 항상 백업해두세요.

## 대안적 접근법

심볼릭 링크나 정션 포인트를 사용하기 어렵다면 다음과 같은 방법도 고려해보세요:

1. **로컬 작업 후 동기화**: 프로젝트를 로컬 드라이브(예: C:\Projects)에 복제하여 작업한 후, 완료된 변경사항만 Google Drive에 복사합니다.

2. **동기화 제외 설정**: Google Drive 설정에서 `node_modules` 폴더를 동기화 대상에서 제외합니다. 이 방법은 Google Drive 클라이언트 설정에 따라 가능 여부가 달라질 수 있습니다.

3. **.gdignore 파일**: 프로젝트 루트에 `.gdignore` 파일을 생성하고 내부에 `node_modules/`를 추가하여 Google Drive가 해당 폴더를 무시하도록 설정합니다.

