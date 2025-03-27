# 환경 설정 가이드

이 문서는 Typing Stats 앱의 개발 및 배포를 위한 환경 설정 방법을 설명합니다.

## 환경 변수 설정

애플리케이션은 다양한 환경 변수를 사용하여 구성됩니다. 이러한 변수들은 다음과 같은 방법으로 설정할 수 있습니다:

### 1. .env 파일 생성

프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 필요한 환경 변수를 추가합니다:

```bash
# .env 파일 예시
DEPLOY_TOKEN=your_vercel_token_here
PRODUCTION_URL=https://typing-stats-app.vercel.app
STAGING_URL=https://typing-stats-app-staging.vercel.app
```

참고: `.env.example` 파일을 복사하여 시작할 수 있습니다.

> ⚠️ **주의**: 실제 토큰이나 민감한 정보를 `.env.example` 파일이나 버전 관리 시스템에 커밋하지 마세요. `.env` 파일은 항상 `.gitignore`에 포함시켜 실수로 커밋되지 않도록 해야 합니다.

### 2. 명령줄에서 환경 변수 설정

#### Windows (PowerShell)
```powershell
$env:DEPLOY_TOKEN="your_token_here"
$env:PRODUCTION_URL="https://your-app.vercel.app"
```

#### Linux/Mac (Bash/Zsh)
```bash
export DEPLOY_TOKEN="your_token_here"
export PRODUCTION_URL="https://your-app.vercel.app"
```

## Vercel 연결 및 배포 설정

Vercel CLI를 통해 환경 변수를 설정하고 배포를 관리하려면 다음 단계를 따라야 합니다:

### 1. Vercel CLI 설치

먼저 Vercel CLI가 설치되어 있어야 합니다:

```bash
npm i -g vercel
```

### 2. Vercel 로그인

터미널에서 다음 명령을 실행하여 Vercel 계정에 로그인합니다:

```bash
vercel login
```

브라우저 창이 열리고 Vercel 계정으로 로그인을 요청합니다. 로그인이 성공하면 터미널로 돌아옵니다.

### 3. 프로젝트 연결

로컬 프로젝트를 Vercel의 프로젝트에 연결합니다:

```bash
vercel link
```

이 과정에서:
- 기존 프로젝트에 연결할지 새 프로젝트를 생성할지 선택합니다.
- 개인 계정이나 팀 스코프를 선택합니다.
- 프로젝트 이름을 확인합니다.

연결이 완료되면 `.vercel` 폴더와 `project.json` 파일이 생성됩니다. 이 파일은 `.gitignore`에 포함시켜야 합니다.

### 4. 환경 변수 설정

이제 프로젝트가 연결되었으니 환경 변수를 설정할 수 있습니다:

```bash
# 프로덕션 환경에 변수 추가
vercel env add DEPLOY_TOKEN production
vercel env add PRODUCTION_URL production

# 미리보기(프리뷰) 환경에 변수 추가
vercel env add DEPLOY_TOKEN preview
vercel env add PRODUCTION_URL preview

# 개발 환경에 변수 추가
vercel env add DEPLOY_TOKEN development
vercel env add PRODUCTION_URL development
```

각 명령을 실행하면 변수 값을 입력하라는 메시지가 표시됩니다.

### 5. 환경 변수 확인

설정된 환경 변수를 확인하려면:

```bash
vercel env ls
```

### 6. 로컬 환경에 환경 변수 가져오기

Vercel에 설정된 환경 변수를 로컬 개발 환경에 가져오려면:

```bash
vercel env pull .env.local
```

이 명령은 설정된 모든 환경 변수를 `.env.local` 파일로 가져옵니다.

## 필수 환경 변수

### 배포 관련 변수

| 변수 이름 | 설명 | 필수 여부 |
|----------|------|----------|
| `DEPLOY_TOKEN` | Vercel 배포 토큰 | 배포 시 필수 |
| `PRODUCTION_URL` | 프로덕션 환경 URL | 선택 (기본값: typing-stats-app.vercel.app) |
| `STAGING_URL` | 스테이징 환경 URL | 선택 (기본값: typing-stats-app-staging.vercel.app) |

## Vercel 토큰 얻기

1. [Vercel 웹사이트](https://vercel.com)에 로그인합니다.
2. 계정 설정(Account Settings)으로 이동합니다.
3. 토큰(Tokens) 탭을 선택합니다.
4. "토큰 생성(Create Token)" 버튼을 클릭합니다.
5. 토큰 이름을 입력하고 범위를 선택합니다(일반적으로 "Full Access" 권장).
6. 생성된 토큰을 안전한 곳에 복사하여 저장합니다.

> ⚠️ **보안 경고**: 토큰은 절대로 버전 관리 시스템에 저장하거나 공개 저장소에 커밋하지 마세요. 만약 토큰이 노출되었다면 즉시 Vercel 대시보드에서 해당 토큰을 취소하고 새 토큰을 생성해야 합니다.

## CI/CD 환경 변수 설정

GitHub Actions 또는 GitLab CI에서 환경 변수를 설정하는 방법:

### GitHub Actions

1. 레포지토리 페이지에서 "Settings" 탭으로 이동합니다.
2. 왼쪽 사이드바에서 "Secrets and variables" > "Actions"를 선택합니다.
3. "New repository secret" 버튼을 클릭합니다.
4. 이름(Name)에 `DEPLOY_TOKEN`을 입력하고 값(Value)에 Vercel 토큰을 입력합니다.
5. "Add secret" 버튼을 클릭합니다.
6. 필요한 다른 변수들도 같은 방식으로 추가합니다.

### GitLab CI

1. 프로젝트 페이지에서 "Settings" > "CI/CD"로 이동합니다.
2. "Variables" 섹션을 펼칩니다.
3. "Add Variable" 버튼을 클릭합니다.
4. 키(Key)에 `DEPLOY_TOKEN`을 입력하고 값(Value)에 Vercel 토큰을 입력합니다.
5. "Add Variable" 버튼을 클릭합니다.
6. 필요한 다른 변수들도 같은 방식으로 추가합니다.

## 로컬 개발 환경

로컬 개발 환경에서는 환경 변수가 없어도 대부분의 기능이 작동합니다. 배포 기능을 로컬에서 테스트하려는 경우에만 환경 변수를 설정하면 됩니다.

## 문제 해결

### 환경 변수가 인식되지 않는 경우

1. `.env` 파일이 올바른 위치(프로젝트 루트 디렉토리)에 있는지 확인합니다.
2. Node.js 앱을 재시작하여 변경된 환경 변수를 적용합니다.
3. 환경 변수가 올바른 형식으로 설정되었는지 확인합니다(공백이나 따옴표 주의).
