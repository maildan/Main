// Jest 설정 파일
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  // next.config.js와 .env 파일을 읽어들이기 위한 Next.js 앱 경로
  dir: './',
});

// Jest에 전달할 커스텀 설정
const customJestConfig = {
  // 각 테스트 파일 실행 전에 실행할 설정 파일 추가
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // TypeScript 경로 매핑을 위한 모듈 네임맵퍼
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/app/components/$1',
    '^@/pages/(.*)$': '<rootDir>/src/app/pages/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/app/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/src/app/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
  },
  
  // 테스트 환경
  testEnvironment: 'jest-environment-jsdom',
  
  // 테스트 대상에서 제외할 파일 패턴
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/src/server/'
  ],
  
  // 테스트 폴더와 파일 이름 패턴
  testMatch: [
    '**/__tests__/**/*.ts?(x)',
    '**/?(*.)+(spec|test).ts?(x)'
  ],
  
  // 코드 변환 설정
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // 코드 커버리지 설정
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};

// createJestConfig를 내보내 Next.js에서 사용
export default createJestConfig(customJestConfig);
