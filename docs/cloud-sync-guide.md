# 클라우드 동기화 가이드

이 문서는 Typing Stats 앱을 Google Drive 또는 다른 클라우드 스토리지와 동기화할 때 발생할 수 있는 문제를 해결하기 위한 가이드입니다.

## 문제점

클라우드 동기화 서비스(Google Drive, Dropbox 등)와 Git/npm을 함께 사용할 때 다음과 같은 문제가 발생할 수 있습니다:

1. Git 인덱싱 오류: `error: short read while indexing`
2. npm 설치 오류: `npm warn tar TAR_ENTRY_ERROR UNKNOWN: unknown error, write`
3. 빌드 아티팩트가 불필요하게 동기화되어 성능 저하

## 해결 방법

### 초기 설정

프로젝트를 클라우드 동기화 환경에 맞게 초기화하려면:

```bash
npm run sync:prepare
```

이 명령은 다음 작업을 수행합니다:
- `.gdignore` 파일 생성 (Google Drive가 특정 폴더를 무시하도록 설정)
- `.gitignore` 파일 업데이트
- 불필요한 빌드 아티팩트 정리

### 동기화 문제 해결

동기화 후 발생하는 문제를 해결하려면:

```bash
npm run sync:cleanup
```

이 명령은 다음 작업을 수행합니다:
- npm 캐시 정리
- Git 저장소 정리
- 임시 파일 제거

### npm 오류 해결

npm 관련 오류가 계속 발생하는 경우:

```bash
npm run sync:fix-npm
```

### Git 오류 해결

Git 관련 오류가 계속 발생하는 경우:

```bash
npm run sync:fix-git
```

## 모범 사례

1. **큰 파일은 동기화하지 않기**: `node_modules`, `native-modules/target`와 같은 폴더는 `.gdignore`에 추가하여 동기화에서 제외해야 합니다.

2. **작업 전후 정리**: 다른 기기에서 작업하기 전에 `sync:prepare`를, 작업 후에는 `sync:cleanup`을 실행하세요.

3. **독립적인 빌드**: 각 기기에서 독립적으로 `npm install`과 빌드 과정을 수행하세요.

4. **충돌 방지**: 여러 기기에서 동시에 같은 파일을 편집하지 마세요.

## 주의사항

- `.git` 폴더의 동기화는 문제를 일으킬 수 있으므로, 가능하면 Git 원격 저장소를 사용하세요.
- Rust의 `target` 폴더와 같은 빌드 아티팩트는 동기화에서 제외해야 합니다.
