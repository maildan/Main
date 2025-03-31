import globals from 'globals';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import eslintConfigNext from 'eslint-config-next';
const { nextConfig } = eslintConfigNext;
import importPlugin from 'eslint-plugin-import';

export default [
  // 기본 정적 파일 및 빌드 결과물 무시 - .eslintignore 파일 내용을 여기로 이전
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
      // 빌드 출력
      '.next/',
      'out/',
      'dist/',
      'build/',

      // 의존성
      'node_modules/',
      '*.d.ts',

      // Rust/Native 모듈 관련 파일
      'native-modules/',
      '*.rs',

      // 기타
      '.github/',
      '.vscode/',
      'public/',
      'logs/',
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
