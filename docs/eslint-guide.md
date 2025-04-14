# ESLint 가이드

## ESLint 9.x 사용하기

이 프로젝트는 ESLint 9.x를 사용하여 코드 품질을 유지합니다. ESLint 9.x에서는 기존 설정 방식이 크게 변경되었습니다.

## 설정 파일

ESLint 9.x에서는 `.eslintrc.js` 대신 `eslint.config.mjs` 파일을 사용합니다:

```javascript
// eslint.config.mjs
export default [
  // 설정 객체들의 배열
  {
    // 기본 설정
  },
  {
    // 특정 파일에만 적용되는 설정
    files: ["src/**/*.ts"],
    // 규칙
    rules: {
      // ...
    }
  }
];
```

## 파일 제외 설정

`.eslintignore` 파일은 더 이상 지원되지 않습니다. 대신 `eslint.config.mjs`의 `ignores` 속성을 사용합니다:

```javascript
export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      // 기타 제외할 패턴
    ]
  },
  // 나머지 설정
];
```

## 기본 명령어

```bash
# 코드 검사
npm run lint

# 자동 수정 가능한 문제 수정
npm run lint:fix

# 경고 없이 모든 파일 검사
npm run lint:strict

# 모든 파일의 오류를 자동으로 수정
npm run lint:fix-all

# ESLint 설정 자체에 문제가 있는 경우 해결
npm run fix:eslint-config
```

## 자주 발생하는 ESLint 오류와 해결 방법

### 1. any 타입 사용 (no-explicit-any)

❌ 잘못된 방법:
```typescript
function processData(data: any) {
  return data.value;
}
```

✅ 올바른 방법:
```typescript
interface DataType {
  value: string;
}

function processData(data: DataType) {
  return data.value;
}
```

### 2. 미사용 변수 (no-unused-vars)

❌ 잘못된 방법:
```typescript
function calculate(a: number, b: number) {
  return a * 2; // b is unused
}
```

✅ 올바른 방법:
```typescript
function calculate(a: number, _b: number) {
  return a * 2; // 사용하지 않는 매개변수는 _로 시작
}
```

### 3. React Hook 의존성 배열 문제 (react-hooks/exhaustive-deps)

❌ 잘못된 방법:
```tsx
useEffect(() => {
  fetchData(userId);
}, []); // userId가 의존성 배열에 없음
```

✅ 올바른 방법:
```tsx
useEffect(() => {
  fetchData(userId);
}, [userId]); // userId를 의존성 배열에 추가
```

## VS Code 설정

VS Code에서 ESLint를 활용하는 최적의 방법:

1. VS Code ESLint 확장 프로그램 설치
2. 설정에 다음을 추가:
   ```json
   "editor.codeActionsOnSave": {
     "source.fixAll.eslint": "explicit"
   },
   "eslint.options": {
     "overrideConfigFile": "eslint.config.mjs"
   },
   "eslint.experimental.useFlatConfig": true,
   "editor.formatOnSave": true,
   "editor.defaultFormatter": "esbenp.prettier-vscode"
   ```

3. `eslint.config.mjs` 파일이 프로젝트 루트에 있는지 확인

## 자동 수정과 코드 품질 관리

코드 품질을 효과적으로 관리하기 위해:

1. 커밋 전 자동 검사:
   ```bash
   npm run lint:strict
   ```

2. 코드 품질 문제 자동 수정:
   ```bash
   npm run lint:fix-all
   ```

3. CI/CD 파이프라인에서 린트 확인 설정

## 문제 해결

ESLint 설정에 문제가 발생하면:

```bash
# ESLint 설정 자동 수정
npm run fix:eslint-config

# ESLint 캐시 삭제 후 실행
npm run lint -- --no-cache

# 의존성 재설치
npm ci --legacy-peer-deps
```

## 최신 ESLint 활용 모범 사례

1. **커스텀 규칙 생성**: 팀 표준에 맞는 규칙 설정
2. **규칙 우선순위 이해**: 충돌하는 규칙 해결 방법 숙지
3. **플러그인 효율적 사용**: TypeScript, React 등 관련 플러그인 활용
4. **IDE 통합**: 실시간 피드백을 통해 문제 즉시 해결
