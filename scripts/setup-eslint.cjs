const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * ESLint 설정 초기화 스크립트
 * ESLint 9.x와 호환되는 설정을 생성합니다.
 */
function setupESLint() {
  console.log('📋 ESLint 초기화 스크립트 실행 중...');
  
  try {
    // eslint.config.mjs 파일 확인 및 필요시 기본 템플릿 생성
    const eslintConfigPath = path.join(process.cwd(), 'eslint.config.mjs');
    if (!fs.existsSync(eslintConfigPath)) {
      const eslintConfigContent = `import globals from 'globals';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import eslintConfigNext from 'eslint-config-next';
const { nextConfig } = eslintConfigNext;
import importPlugin from 'eslint-plugin-import';

export default [
  // 기본 정적 파일 및 빌드 결과물 무시
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'native-modules/**',
      '*.config.js',
      '*.config.mjs',
      '*.json',
      '*.lock',
      '.github/**',
      '.vscode/**',
      'public/**',
      'coverage/**',
      'logs/'
    ],
  },
  
  // Next.js ESLint 구성 추가
  ...nextConfig(),

  // 모든 JavaScript 파일에 대한 기본 구성
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        process: 'readonly',
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
    },
  },

  // TypeScript 파일 구성
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        process: 'readonly',
      },
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'import': importPlugin,
    },
    rules: {
      // 타입스크립트 관련 규칙
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': ['warn', { 
        'ts-ignore': 'allow-with-description' 
      }],
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],

      // 리액트 관련 규칙
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // 코드 스타일
      'semi': ['error', 'always'],
      'quotes': ['error', 'single'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // 서버 코드에 대한 설정
  {
    files: ['**/server/**/*.js', '**/server/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // 테스트 파일에 대한 설정
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*.ts', '**/__tests__/**/*.tsx'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
`;

      fs.writeFileSync(eslintConfigPath, eslintConfigContent, 'utf8');
      console.log('✅ eslint.config.mjs 파일 생성 완료');
    } else {
      console.log('ℹ️ eslint.config.mjs 파일이 이미 존재합니다.');
    }

    // 이전 스타일 .eslintrc.js가 있으면, 백업 후 새 스타일로 마이그레이션 제안
    const oldEslintRcPath = path.join(process.cwd(), '.eslintrc.js');
    if (fs.existsSync(oldEslintRcPath)) {
      const backupPath = path.join(process.cwd(), '.eslintrc.js.bak');
      fs.copyFileSync(oldEslintRcPath, backupPath);
      console.log(`⚠️ 레거시 .eslintrc.js 파일을 발견했습니다. ${backupPath}로 백업했습니다.`);
      console.log('⚠️ ESLint 9.x에서는 eslint.config.mjs 파일이 권장됩니다.');
    }
    
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
        console.warn('⚠️ 경고: 기존 VS Code 설정 파싱 실패, 새 설정으로 대체합니다.');
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
      "eslint.options": {
        "overrideConfigFile": "eslint.config.mjs"
      },
      "eslint.experimental.useFlatConfig": true,
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

## ESLint 9.x 사용하기

이 프로젝트는 ESLint 9.x를 사용하여 코드 품질을 유지합니다. ESLint 9.x에서는 기존 설정 방식이 크게 변경되었습니다.

## 설정 파일

ESLint 9.x에서는 \`.eslintrc.js\` 대신 \`eslint.config.mjs\` 파일을 사용합니다:

\`\`\`javascript
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
\`\`\`

## 파일 제외 설정

\`.eslintignore\` 파일은 더 이상 지원되지 않습니다. 대신 \`eslint.config.mjs\`의 \`ignores\` 속성을 사용합니다:

\`\`\`javascript
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
\`\`\`

## 기본 명령어

\`\`\`bash
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
2. 설정에 다음을 추가:
   \`\`\`json
   "editor.codeActionsOnSave": {
     "source.fixAll.eslint": "explicit"
   }
   \`\`\`

## 문제 해결

ESLint 설정에 문제가 발생하면:

\`\`\`bash
# ESLint 설정 자동 수정
npm run fix:eslint-config

# ESLint 캐시 삭제 후 실행
npm run lint -- --no-cache

# 의존성 재설치
npm ci --legacy-peer-deps
\`\`\`
`;

    fs.writeFileSync(eslintGuidePath, eslintGuideContent, 'utf8');
    console.log('✅ ESLint 가이드 문서 생성 완료');

    // ESLint 오류 수정 가이드 문서
    const eslintFixGuidePath = path.join(docsDir, 'eslint-fix-guide.md');
    const eslintFixGuideContent = `# ESLint 오류 해결 가이드

## ESLint 9.x 이상에서의 설정 방법

ESLint 9.x 이상 버전에서는 \`.eslintrc.js\`와 \`.eslintignore\` 대신 \`eslint.config.mjs\` 파일을 사용합니다.

### 주요 변경 사항

1. **구성 파일 변경**: \`.eslintrc.js\` → \`eslint.config.mjs\`
2. **무시 패턴 설정 변경**: \`.eslintignore\` 파일 대신 \`eslint.config.mjs\` 내의 \`ignores\` 속성 사용
3. **플랫 설정**: 계층적 확장 대신 플랫 배열 구성 사용

## 이미 발생한 ESLint 오류 해결하기

발생 가능한 오류와 해결 방법을 설명합니다.

### 1. \`.eslintignore\` 파일 관련 경고

\`\`\`
ESLintIgnoreWarning: The ".eslintignore" file is no longer supported. 
\`\`\`

**해결 방법**: 다음 명령어로 ESLint 설정을 자동으로 수정합니다.

\`\`\`bash
npm run fix:eslint-config
\`\`\`

이 명령은 \`.eslintignore\`의 내용을 \`eslint.config.mjs\`의 \`ignores\` 속성으로 이전합니다.

### 2. ESLint 패치 오류

\`\`\`
Error: Failed to patch ESLint because the calling module was not recognized.
\`\`\`

**해결 방법**: 이 문제는 ESLint 9.x와의 호환성 문제입니다. 다음 명령어로 해결합니다.

\`\`\`bash
npm run fix:eslint-config
npm run lint:fix
\`\`\`

## VS Code에서 ESLint 사용하기

VS Code에서 ESLint를 최대한 활용하려면:

1. VS Code ESLint 확장 프로그램 설치
2. 설정에 다음을 추가하여 저장 시 자동 수정 활성화:

\`\`\`json
"editor.codeActionsOnSave": {
  "source.fixAll.eslint": "explicit"
},
"eslint.options": {
  "overrideConfigFile": "eslint.config.mjs"
},
"eslint.experimental.useFlatConfig": true
\`\`\`
`;

    fs.writeFileSync(eslintFixGuidePath, eslintFixGuideContent, 'utf8');
    console.log('✅ ESLint 오류 수정 가이드 문서 생성 완료');

    console.log('');
    console.log('📝 ESLint 설정이 성공적으로 완료되었습니다!');
    console.log('💡 자세한 내용은 docs/eslint-guide.md 와 docs/eslint-fix-guide.md 파일을 참조하세요.');
  } catch (error) {
    console.error('❌ ESLint 설정 중 오류가 발생했습니다:', error);
  }
}

setupESLint();
