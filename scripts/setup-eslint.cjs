/**
 * ESLint 구성 자동 설정 스크립트
 * ESLint 8/9 버전을 위한 구성 파일을 생성합니다.
 */

const fs = require('fs');
const path = require('path');

// 경로 설정
const rootDir = path.resolve(__dirname, '..');
const eslintConfigPath = path.join(rootDir, 'eslint.config.mjs');
const oldEslintignorePath = path.join(rootDir, '.eslintignore');
const packageJsonPath = path.join(rootDir, 'package.json');

console.log('📝 ESLint 구성 파일 설정 시작...');

// eslint.config.mjs 파일 생성
const eslintConfig = `import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// 현재 파일 위치 가져오기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  // 무시할 파일 설정 (이전 .eslintignore 대체)
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'build/**',
      'out/**',
      'public/**',
      'native-modules/**',
      'release/**',
      '.vscode/**',
      '.github/**',
      'logs/**',
      'scripts/**/*.cjs',
      'main.cjs',
      'next.config.js',
      'next.config.cjs',
      'next.config.mjs',
      '**/*.json',
      '**/*.md'
    ]
  },
  
  // JavaScript 표준 설정
  js.configs.recommended,
  
  // Next.js와 React 설정
  {
    plugins: {
      react: reactPlugin,
      next: nextPlugin,
      '@typescript-eslint': tsPlugin
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        project: path.join(__dirname, './tsconfig.json')
      }
    },
    settings: {
      react: {
        version: 'detect'
      },
      next: {
        rootDir: __dirname
      }
    },
    rules: {
      // Next.js 규칙
      'next/core-web-vitals': 'error',
      
      // React 규칙
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      
      // TypeScript 규칙
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // 일반 규칙
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'no-unused-vars': 'off' // TypeScript 규칙으로 대체
    }
  },
  
  // CJS 파일에는 독립적인 설정 적용
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs'
    },
    rules: {
      'no-console': 'off', // CJS 파일에서는 콘솔 허용
      '@typescript-eslint/no-var-requires': 'off'
    }
  },
  
  // Electron 메인 프로세스 파일
  {
    files: ['src/main/**/*', 'main.cjs'],
    rules: {
      'no-console': 'off', // 메인 프로세스는 콘솔 로그 허용
      '@typescript-eslint/no-var-requires': 'off' // Electron에서는 require 허용
    }
  }
];`;

try {
  fs.writeFileSync(eslintConfigPath, eslintConfig);
  console.log(`✅ ${eslintConfigPath} 파일이 생성되었습니다`);
  
  // 기존 .eslintignore 파일이 있으면 이름 변경
  if (fs.existsSync(oldEslintignorePath)) {
    const backupPath = `${oldEslintignorePath}.bak`;
    fs.renameSync(oldEslintignorePath, backupPath);
    console.log(`ℹ️ .eslintignore 파일이 ${backupPath}로 이름 변경되었습니다`);
    console.log('   (ESLint 9에서는 더 이상 .eslintignore를 지원하지 않습니다)');
  }
  
  // package.json에서 ESLint 스크립트 업데이트
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // ESLint 관련 스크립트 업데이트
    if (packageJson.scripts) {
      packageJson.scripts.lint = 'eslint --config eslint.config.mjs "src/**/*.{js,jsx,ts,tsx}"';
      packageJson.scripts['lint:fix'] = 'eslint --fix --config eslint.config.mjs "src/**/*.{js,jsx,ts,tsx}"';
      packageJson.scripts['lint:strict'] = 'eslint --config eslint.config.mjs "src/**/*.{js,jsx,ts,tsx}" --max-warnings=0';
      packageJson.scripts['lint:fix-all'] = 'node scripts/fix-eslint-errors.cjs';
      packageJson.scripts['setup:eslint'] = 'node scripts/setup-eslint.cjs';
      packageJson.scripts['optimize:eslint'] = 'node scripts/optimize-eslint-performance.cjs';
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ package.json의 ESLint 스크립트가 업데이트되었습니다');
    }
  } catch (err) {
    console.error('❌ package.json 업데이트 중 오류가 발생했습니다:', err);
  }
  
  console.log('\n🎉 ESLint 설정이 완료되었습니다!');
  console.log('\n다음 명령어로 린트를 실행할 수 있습니다:');
  console.log('  npm run lint         # 린트 실행');
  console.log('  npm run lint:fix     # 자동 수정 가능한 문제 해결');
  console.log('  npm run lint:strict  # 경고 없이 엄격한 린트 실행');
  
} catch (err) {
  console.error('❌ ESLint 구성 파일 생성 중 오류가 발생했습니다:', err);
}
