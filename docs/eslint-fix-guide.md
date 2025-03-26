# ESLint 오류 자동 수정 가이드

## 스크립트 실행 방법

프로젝트의 ESLint 오류를 자동으로 수정하기 위한 여러 스크립트가 준비되어 있습니다. 다음 방법으로 실행할 수 있습니다:

### 1. npm 스크립트를 통해 실행

```bash
# package.json에 정의된 lint:fix 스크립트 실행
npm run lint:fix

# 모든 파일의 오류를 자동으로 수정
npm run lint:fix-all
```

### 2. 스크립트 직접 실행

```bash
# fix-eslint-errors.js 스크립트 직접 실행
node scripts/fix-eslint-errors.js
```

## 스크립트가 수행하는 작업

`fix-eslint-errors.js` 스크립트는 다음과 같은 자동 수정 작업을 수행합니다:

1. **any 타입 검색**: TypeScript에서 `any` 타입을 사용하는 위치를 찾아 `any-errors.json` 파일로 저장합니다.
2. **미사용 변수 수정**: 사용되지 않는 변수들을 자동으로 수정합니다. 변수명 앞에 `_`를 추가합니다.
3. **모듈 import 스타일 검사**: ESM과 CommonJS 스타일의 import 문법을 검사합니다.
4. **기본 포맷팅 수정**: 세미콜론, 따옴표 등 기본적인 코드 스타일 문제를 수정합니다.

## ESLint 오류 수정 우선순위

ESLint 오류를 수정할 때는 다음 우선순위를 따르는 것이 좋습니다:

1. 자동으로 수정 가능한 오류부터 해결 (`npm run lint:fix`)
2. any 타입 관련 오류 해결 (타입 안전성 향상)
3. 미사용 변수 문제 해결
4. 나머지 수동으로 해결해야 하는 문제 해결

## 자주 발생하는 ESLint 오류와 수동 수정 방법

### 1. any 타입 사용 (no-explicit-any)

**문제**:
```typescript
function processData(data: any) {
  return data.value;
}
```

**해결 방법**:
```typescript
interface DataType {
  value: string;
}

function processData(data: DataType) {
  return data.value;
}
```

또는 unknown 타입과 타입 가드 사용:
```typescript
function processData(data: unknown) {
  if (typeof data === 'object' && data && 'value' in data) {
    return (data as { value: string }).value;
  }
  return undefined;
}
```

### 2. 미사용 변수 (no-unused-vars)

**문제**:
```typescript
function calculate(a: number, b: number) {
  return a * 2; // b is unused
}
```

**해결 방법**:
```typescript
function calculate(a: number, _b: number) {
  return a * 2; // 사용하지 않는 매개변수는 _로 시작
}
```

### 3. import/require 스타일 (no-assign-module-variable)

**문제**:
```javascript
const module = require('./module'); // module은 예약어
```

**해결 방법**:
```javascript
const moduleImport = require('./module'); // 다른 이름 사용
```

또는 ESM 문법 사용:
```javascript
import * as moduleImport from './module';
```

## 수동 수정이 필요한 케이스

자동 수정으로 해결되지 않는 일부 오류는 수동으로 수정해야 합니다:

1. **복잡한 타입 문제**: 제네릭이나 복잡한 타입 구조가 필요한 경우
2. **알고리즘 로직 문제**: 코드 로직 자체를 변경해야 하는 경우
3. **외부 라이브러리 호환성 문제**: 타입 정의가 없는 외부 라이브러리를 사용하는 경우

이러한 경우에는 VS Code에서 표시되는 ESLint 오류 메시지를 참고하여 수동으로 수정하세요.

## 트러블슈팅

### 스크립트 실행 실패 시

스크립트 실행이 실패하면 다음을 확인하세요:

1. Node.js가 올바르게 설치되어 있는지 확인
2. 필요한 종속성이 설치되어 있는지 확인 (`npm install`)
3. 스크립트 경로가 올바른지 확인 (프로젝트 루트에서 실행)

### 특정 파일이 수정되지 않을 때

1. `.eslintignore` 파일에서 해당 파일이 무시 목록에 있는지 확인
2. 파일 확장자가 ESLint 설정의 대상에 포함되어 있는지 확인

## 참고 자료

- [ESLint 공식 문서](https://eslint.org/docs/latest/)
- [TypeScript ESLint 플러그인](https://typescript-eslint.io/)
