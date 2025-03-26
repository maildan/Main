const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * ESLint 설정 초기화 스크립트
 */
function setupESLint() {
  console.log('📋 ESLint 초기화 스크립트 실행 중...');
  
  try {
    // .eslintignore 파일 생성
    const eslintIgnorePath = path.join(process.cwd(), '.eslintignore');
    const eslintIgnoreContent = `
# 빌드 출력
.next/
out/
dist/
build/

# 의존성
node_modules/
*.d.ts

# Rust/Native 모듈 관련 파일
native-modules/
*.rs

# 구성 파일
next.config.js
postcss.config.js
tailwind.config.js
*.config.js
*.config.mjs
*.json
*.lock

# 기타
.github/
.vscode/
public/
`;

    fs.writeFileSync(eslintIgnorePath, eslintIgnoreContent.trim(), 'utf8');
    console.log('✅ .eslintignore 파일 생성 완료');

    // VS Code 설정 디렉토리 확인
    const vscodeDir = path.join(process.cwd(), '.vscode');
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir);
    }

    // VS Code settings.json 생성/업데이트
    const vscodeSettingsPath = path.join(vscodeDir, 'settings.json');
    let vscodeSettings = {};
    
    if (fs.existsSync(vscodeSettingsPath)) {
      try {
        vscodeSettings = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf8'));
      } catch (err) {
        console.warn('경고: 기존 VS Code 설정 파싱 실패, 새 설정으로 대체합니다.');
      }
    }

    // ESLint 관련 설정 추가/업데이트
    vscodeSettings = {
      ...vscodeSettings,
      "editor.formatOnSave": true,
      "editor.codeActionsOnSave": {
        "source.fixAll.eslint": "explicit"
      },
      "eslint.validate": [
        "javascript",
        "javascriptreact",
        "typescript",
        "typescriptreact"
      ],
      "typescript.tsdk": "node_modules\\typescript\\lib",
      "typescript.enablePromptUseWorkspaceTsdk": true,
      "editor.defaultFormatter": "dbaeumer.vscode-eslint",
      "[typescript]": {
        "editor.defaultFormatter": "dbaeumer.vscode-eslint"
      },
      "[typescriptreact]": {
        "editor.defaultFormatter": "dbaeumer.vscode-eslint"
      },
      "[javascript]": {
        "editor.defaultFormatter": "dbaeumer.vscode-eslint"
      },
      "eslint.workingDirectories": [
        {
          "mode": "auto"
        }
      ],
      "eslint.run": "onSave",
      "javascript.updateImportsOnFileMove.enabled": "always",
      "typescript.updateImportsOnFileMove.enabled": "always"
    };

    fs.writeFileSync(vscodeSettingsPath, JSON.stringify(vscodeSettings, null, 2), 'utf8');
    console.log('✅ VS Code 설정 업데이트 완료');

    // ESLint 자동 수정 실행
    console.log('🔍 ESLint 자동 수정 실행 중...');
    try {
      execSync('npm run lint:fix', { stdio: 'inherit' });
      console.log('✅ ESLint 자동 수정 완료');
    } catch (err) {
      console.warn('⚠️ ESLint 자동 수정 중 오류가 발생했습니다. 일부 파일은 수동 수정이 필요할 수 있습니다.');
    }

    // ESLint 가이드 문서 복사
    const docsDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir);
    }
    
    const eslintGuidePath = path.join(docsDir, 'eslint-guide.md');
    const eslintGuideContent = `# ESLint 가이드

## 시작하기

이 프로젝트는 코드 품질 유지를 위해 ESLint를 사용합니다. ESLint는 코드 스타일과 잠재적인 문제를 자동으로 검사하고 수정해 줍니다.

## 기본 명령어

\`\`\`bash
# 코드 검사
npm run lint

# 자동 수정 가능한 문제 수정
npm run lint:fix

# 경고 없이 모든 타입스크립트 파일 검사
npm run lint:strict

# 모든 파일의 오류를 자동으로 수정
npm run lint:fix-all
\`\`\`

## 자주 발생하는 ESLint 오류와 해결 방법

### 1. any 타입 사용 (no-explicit-any)

❌ 잘못된 방법:
\`\`\`typescript
function processData(data: any) {
  return data.value;
}
\`\`\`

✅ 올바른 방법:
\`\`\`typescript
interface DataType {
  value: string;
}

function processData(data: DataType) {
  return data.value;
}
\`\`\`

또는 unknown 타입 사용:
\`\`\`typescript
function processData(data: unknown) {
  if (typeof data === 'object' && data && 'value' in data) {
    return (data as { value: string }).value;
  }
  return undefined;
}
\`\`\`

### 2. 미사용 변수 (no-unused-vars)

❌ 잘못된 방법:
\`\`\`typescript
function calculate(a: number, b: number) {
  return a * 2; // b is unused
}
\`\`\`

✅ 올바른 방법:
\`\`\`typescript
function calculate(a: number, _b: number) {
  return a * 2; // 사용하지 않는 매개변수는 _로 시작
}
\`\`\`

### 3. React Hook 의존성 배열 문제 (react-hooks/exhaustive-deps)

❌ 잘못된 방법:
\`\`\`tsx
useEffect(() => {
  fetchData(userId);
}, []); // userId가 의존성 배열에 없음
\`\`\`

✅ 올바른 방법:
\`\`\`tsx
useEffect(() => {
  fetchData(userId);
}, [userId]); // userId를 의존성 배열에 추가
\`\`\`

## VS Code 설정

VS Code에서 ESLint를 활용하는 최적의 방법:

1. VS Code ESLint 확장 프로그램 설치
2. 저장 시 자동 수정을 활성화하려면:
   - \`Ctrl + ,\` 또는 \`Cmd + ,\`로 설정 열기
   - "editor.codeActionsOnSave"를 검색하고 다음과 같이 설정:
   \`\`\`json
   "editor.codeActionsOnSave": {
     "source.fixAll.eslint": true
   }
   \`\`\`

## 팀 내 ESLint 적용 가이드

1. PR을 생성하기 전에 항상 \`npm run lint\` 실행
2. 자동 수정이 불가능한 오류는 수동으로 해결
3. 특별한 경우에만 규칙을 비활성화하고, 그 이유를 주석으로 설명
`;
    
    fs.writeFileSync(eslintGuidePath, eslintGuideContent, 'utf8');
    console.log('✅ ESLint 가이드 문서 생성 완료');

    console.log('\n🎉 ESLint 초기화 완료! 이제 개발을 시작할 수 있습니다.');
    console.log('📚 ESLint 가이드: docs/eslint-guide.md');
    
  } catch (error) {
    console.error('❌ ESLint 초기화 중 오류 발생:', error);
    process.exit(1);
  }
}

setupESLint();
