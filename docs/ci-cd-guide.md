# CI/CD 설정 가이드

이 문서는 Typing Stats 앱의 CI/CD(지속적 통합/지속적 배포) 설정에 대한 가이드입니다.

## GitHub Actions

GitHub Actions를 사용하면 코드 저장소에서 직접 워크플로우를 자동화할 수 있습니다.

### 워크플로우 개요

현재 설정된 워크플로우는 다음과 같은 단계로 구성됩니다:

1. **테스트**: 코드 품질 및 기능 테스트
   - 린트 검사 (ESLint)
   - 타입 검사 (TypeScript)
   - 유닛 테스트 (Jest)

2. **빌드**: 애플리케이션 빌드
   - 네이티브 모듈 컴파일
   - Next.js 애플리케이션 빌드

3. **배포**: 환경별 배포
   - 프로덕션 배포 (main/master 브랜치)
   - 스테이징 배포 (develop 브랜치)

### 배포 환경 설정

GitHub Actions에서 배포를 위해 다음과 같은 시크릿을 설정해야 합니다:

- `DEPLOY_TOKEN`: 배포 서비스에 인증하기 위한 토큰
- `PRODUCTION_URL`: 프로덕션 환경 URL
- `STAGING_URL`: 스테이징 환경 URL

이러한 시크릿은 GitHub 저장소 설정의 "Secrets and variables" > "Actions" 섹션에서 추가할 수 있습니다.

### 브랜치 전략

- `main` / `master`: 프로덕션 환경에 배포되는 안정적인 코드
- `develop`: 개발 중인 코드, 스테이징 환경에 자동 배포
- 기능 브랜치: `feature/기능-이름` 형식으로 새 기능 개발

### 워크플로우 실행 조건

- Push 이벤트: `main`, `master`, `develop` 브랜치에 코드가 푸시될 때
- Pull Request 이벤트: `main`, `master`, `develop` 브랜치에 PR이 생성될 때

## GitLab CI/CD

GitLab에서도 유사한 CI/CD 파이프라인이 설정되어 있습니다.

### 파이프라인 단계

1. **test**: 코드 테스트
2. **build**: 애플리케이션 빌드
3. **deploy**: 배포
   - deploy_production: main/master 브랜치에서 프로덕션 환경으로 배포
   - deploy_staging: develop 브랜치에서 스테이징 환경으로 배포

### GitLab CI/CD 특징

- 캐싱: `node_modules`를 캐싱하여 빌드 속도 개선
- 아티팩트: 빌드 결과물을 아티팩트로 저장하여 다음 단계에서 사용 가능
- 환경: 프로덕션 환경에 대한 명시적 배포 단계

### CI/CD 변수 설정

GitLab에서 배포를 위해 다음 변수들을 설정해야 합니다:
- `DEPLOY_TOKEN`: 배포 서비스에 인증하기 위한 토큰
- `PRODUCTION_URL`: 프로덕션 환경 URL
- `STAGING_URL`: 스테이징 환경 URL

이러한 변수는 GitLab 프로젝트의 "Settings" > "CI/CD" > "Variables" 섹션에서 추가할 수 있습니다.

## CI/CD 환경 변수

필요한 환경 변수는 GitHub Secrets 또는 GitLab CI/CD Variables에 설정해야 합니다:

- `NODE_VERSION`: 사용할 Node.js 버전 (기본값: 20)
- 기타 애플리케이션별 시크릿 및 API 키

## 로컬 개발 환경과의 통합

CI/CD 파이프라인은 `package.json`의 스크립트와 일치하도록 구성되었습니다:

```json
"scripts": {
  "lint:check": "eslint --cache --max-warnings=0 --ext .js,.jsx,.ts,.tsx .",
  "typecheck": "tsc --noEmit",
  "test:ci": "jest --ci --coverage",
  "build": "next build",
  "build:native": "cd native-modules && cargo build --release --verbose"
}
```

이렇게 하면 로컬 개발 환경과 CI/CD 환경에서 동일한 명령을 실행할 수 있습니다.
