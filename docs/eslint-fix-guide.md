# ESLint 오류 해결 가이드

## ESLint 9.x 이상에서의 설정 방법

ESLint 9.x 이상 버전에서는 `.eslintrc.js`와 `.eslintignore` 대신 `eslint.config.mjs` 파일을 사용합니다.

### 주요 변경 사항

1. **구성 파일 변경**: `.eslintrc.js` → `eslint.config.mjs`
2. **무시 패턴 설정 변경**: `.eslintignore` 파일 대신 `eslint.config.mjs` 내의 `ignores` 속성 사용
3. **플랫 설정**: 계층적 확장 대신 플랫 배열 구성 사용

## 이미 발생한 ESLint 오류 해결하기

발생 가능한 오류와 해결 방법을 설명합니다.

### 1. `.eslintignore` 파일 관련 경고

```
ESLintIgnoreWarning: The ".eslintignore" file is no longer supported. 
```

**해결 방법**: 다음 명령어로 ESLint 설정을 자동으로 수정합니다.

```bash
npm run fix:eslint-config
```

이 명령은 `.eslintignore`의 내용을 `eslint.config.mjs`의 `ignores` 속성으로 이전합니다.

### 2. ESLint 패치 오류

```
Error: Failed to patch ESLint because the calling module was not recognized.
```

**해결 방법**: 이 문제는 ESLint 9.x와의 호환성 문제입니다. 다음 명령어로 해결합니다.

```bash
npm run fix:eslint-config
npm run lint:fix
```

## VS Code에서 ESLint 사용하기

VS Code에서 ESLint를 최대한 활용하려면:

1. VS Code ESLint 확장 프로그램 설치
2. 설정에 다음을 추가하여 저장 시 자동 수정 활성화:

```json
"editor.codeActionsOnSave": {
  "source.fixAll.eslint": "explicit"
},
"eslint.options": {
  "overrideConfigFile": "eslint.config.mjs"
},
"eslint.experimental.useFlatConfig": true
```
