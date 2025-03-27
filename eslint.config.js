import globals from 'globals';
import typescriptParser from '@typescript-eslint/parser';
import typescriptPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin';
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
    ],
  },

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
      'next': nextPlugin,
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

  // Next.js 페이지 및 컴포넌트에 대한 특별 규칙
  {
    files: ['**/app/**/*.tsx', '**/pages/**/*.tsx'],
    rules: {
      'next/no-html-link-for-pages': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
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
