# ESLint 가이드

## 시작하기

이 프로젝트는 코드 품질 유지를 위해 ESLint를 사용합니다. ESLint는 코드 스타일과 잠재적인 문제를 자동으로 검사하고 수정해 줍니다.

## 기본 명령어

```bash
# 코드 검사
npm run lint

# 자동 수정 가능한 문제 수정
npm run lint:fix

# 경고 없이 모든 타입스크립트 파일 검사
npm run lint:strict

# 모든 파일의 오류를 자동으로 수정
npm run lint:fix-all
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

또는 unknown 타입 사용:
```typescript
function processData(data: unknown) {
  if (typeof data === 'object' && data && 'value' in data) {
    return (data as { value: string }).value;
  }
  return undefined;
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
2. 저장 시 자동 수정을 활성화하려면:
   - `Ctrl + ,` 또는 `Cmd + ,`로 설정 열기
   - "editor.codeActionsOnSave"를 검색하고 다음과 같이 설정:
   ```json
   "editor.codeActionsOnSave": {
     "source.fixAll.eslint": true
   }
   ```

## 팀 내 ESLint 적용 가이드

1. PR을 생성하기 전에 항상 `npm run lint` 실행
2. 자동 수정이 불가능한 오류는 수동으로 해결
3. 특별한 경우에만 규칙을 비활성화하고, 그 이유를 주석으로 설명
