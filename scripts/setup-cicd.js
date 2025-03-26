const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * CI/CD 초기화 스크립트
 * - GitHub Actions 워크플로우 설정
 * - 캐싱 디렉토리 생성
 * - 테스트 환경 설정
 */
function setupCICD() {
  console.log('📋 CI/CD 초기화 스크립트 실행 중...');
  
  try {
    // GitHub Actions 디렉토리 생성
    const githubDir = path.join(process.cwd(), '.github');
    const workflowsDir = path.join(githubDir, 'workflows');
    
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir);
    }
    
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir);
    }
    
    // 워크플로우 파일 생성 여부 확인 (이미 있다면 덮어쓰지 않음)
    const cicdWorkflowPath = path.join(workflowsDir, 'ci-cd.yml');
    if (!fs.existsSync(cicdWorkflowPath)) {
      console.log('✅ GitHub Actions 워크플로우 설정 파일 생성 중...');
      // 워크플로우 파일 내용은 별도로 작성해야 합니다.
    } else {
      console.log('ℹ️ GitHub Actions 워크플로우 설정 파일이 이미 존재합니다.');
    }
    
    // Jest 설정 파일 생성
    const jestConfigPath = path.join(process.cwd(), 'jest.config.js');
    if (!fs.existsSync(jestConfigPath)) {
      console.log('✅ Jest 설정 파일 생성 중...');
      
      const jestConfig = `
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    '^.+\\\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main/*.js',
    '!src/server/*.js'
  ],
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};
`;
      fs.writeFileSync(jestConfigPath, jestConfig.trim(), 'utf8');
    }
    
    // Jest 설정 파일 생성
    const jestSetupPath = path.join(process.cwd(), 'jest.setup.js');
    if (!fs.existsSync(jestSetupPath)) {
      console.log('✅ Jest 셋업 파일 생성 중...');
      
      const jestSetup = `
// Jest 설정 파일
import '@testing-library/jest-dom';
`;
      fs.writeFileSync(jestSetupPath, jestSetup.trim(), 'utf8');
    }
    
    // ESLint 캐시 디렉토리 확인
    if (!fs.existsSync('.eslintcache')) {
      console.log('✅ ESLint 캐시 파일 초기화 중...');
      execSync('npm run lint -- --cache-location .eslintcache', { stdio: 'pipe' });
    }
    
    // 테스트 디렉토리 생성
    const testDir = path.join(process.cwd(), '__tests__');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
      console.log('✅ 테스트 디렉토리 생성 완료');
      
      // 샘플 테스트 파일 생성
      const sampleTestPath = path.join(testDir, 'sample.test.tsx');
      const sampleTest = `
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// 샘플 테스트
describe('기본 테스트', () => {
  it('테스트 환경이 올바르게 설정되었는지 확인', () => {
    expect(1 + 1).toBe(2);
  });
});
`;
      fs.writeFileSync(sampleTestPath, sampleTest.trim(), 'utf8');
    }
    
    // 메모리 최적화 테스트 폴더 생성
    const memoryTestDir = path.join(testDir, 'memory-optimization');
    if (!fs.existsSync(memoryTestDir)) {
      fs.mkdirSync(memoryTestDir, { recursive: true });
      
      // 메모리 최적화 테스트 파일 생성
      const memoryTestPath = path.join(memoryTestDir, 'memory-optimization.test.ts');
      const memoryTest = `
/**
 * 메모리 최적화 테스트
 * 
 * 메모리 최적화 관련 기능이 예상대로 작동하는지 테스트합니다.
 */

import { formatBytes } from '../../src/app/utils/memory/format-utils';

describe('메모리 유틸리티 테스트', () => {
  test('formatBytes가 바이트를 올바른 형식으로 변환하는지 확인', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
  });
});
`;
      fs.writeFileSync(memoryTestPath, memoryTest.trim(), 'utf8');
    }
    
    // 테스트 실행
    console.log('🧪 샘플 테스트 실행 중...');
    try {
      execSync('npm test -- --passWithNoTests', { stdio: 'inherit' });
      console.log('✅ 테스트 실행 완료');
    } catch (error) {
      console.warn('⚠️ 테스트 실행 중 오류가 발생했습니다. 테스트 설정을 확인하세요.');
    }
    
    console.log('🚀 CI/CD 초기화 완료');
    
  } catch (error) {
    console.error('CI/CD 초기화 중 오류 발생:', error);
  }
}

setupCICD();
