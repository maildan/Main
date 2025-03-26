module.exports = {
  root: true,
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier' // Prettier와 ESLint 충돌 방지
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {},
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        paths: ['src']
      }
    }
  },
  rules: {
    // 기본 규칙
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    
    // 타입스크립트 관련 규칙
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'warn', // 경고 수준으로 조정
    '@typescript-eslint/ban-ts-comment': ['warn', { 
      'ts-ignore': 'allow-with-description' 
    }],
    '@typescript-eslint/no-require-imports': 'error', // require() 스타일 import 금지
    
    // 리액트 관련 규칙
    'react/react-in-jsx-scope': 'off', // Next.js에서는 React import가 필요 없음
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // 코드 스타일
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    
    // 빈 인터페이스 허용 설정
    '@typescript-eslint/no-empty-interface': ['error', {
      'allowSingleExtends': true
    }],
    
    // Next.js의 Image 컴포넌트 사용 권장
    '@next/next/no-img-element': 'warn',
    
    // require 스타일 import 막기 (ESM 사용 권장)
    '@next/next/no-assign-module-variable': 'error',
    
    // 성능을 위해 일부 규칙 조정
    'react/prop-types': 'off', // TypeScript를 사용할 때는 불필요
    '@typescript-eslint/no-var-requires': 'warn' // 오류 대신 경고로 변경
  },
  
  // JS 파일은 CommonJS 허용, TS 파일은 ESM 강제
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      rules: {
        '@next/next/no-assign-module-variable': 'off',
        '@typescript-eslint/no-require-imports': 'off'
      }
    },
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'warn'
      }
    }
  ],
  
  // 무시할 파일/폴더 설정
  ignorePatterns: [
    'node_modules/',
    '.next/',
    'out/',
    'dist/',
    'build/',
    '*.config.js',
    '*.config.mjs'
  ],
  
  // 캐시 설정 추가
  cache: true,
  cacheLocation: '.eslintcache',
  
  // 병렬 처리 지원
  reportUnusedDisableDirectives: true
};