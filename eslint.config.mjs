import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// 현재 파일 위치 가져오기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// eslint-disable-next-line import/no-default-export
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
];