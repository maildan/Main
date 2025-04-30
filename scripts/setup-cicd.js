/**
 * CI/CD 설정 초기화 스크립트
 * 이 스크립트는 CI/CD 파이프라인 설정을 초기화합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * CI/CD 설정 초기화 함수
 */
function setupCICD() {
  console.log('📝 CI/CD 설정 초기화 시작...');
  
  try {
    // GitHub Actions 설정 디렉토리 생성
    const githubDir = path.join(process.cwd(), '.github');
    const workflowsDir = path.join(githubDir, 'workflows');
    
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir);
      console.log('✅ .github 디렉토리 생성 완료');
    }
    
    if (!fs.existsSync(workflowsDir)) {
      fs.mkdirSync(workflowsDir);
      console.log('✅ .github/workflows 디렉토리 생성 완료');
    }
    
    // GitHub Actions 워크플로우 파일 생성
    const cicdYmlPath = path.join(workflowsDir, 'ci-cd.yml');
    if (!fs.existsSync(cicdYmlPath)) {
      const cicdYmlContent = `# GitHub Actions CI/CD 워크플로우 설정
name: CI/CD Pipeline

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]
  workflow_dispatch:

jobs:
  test:
    name: 테스트
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Node.js 설정
      uses: actions/setup-node@v3
      with:
        node-version: 18
        cache: 'npm'
    
    - name: 의존성 설치
      run: npm ci --legacy-peer-deps
    
    - name: 린트 검사 실행
      run: npm run lint:check
    
    - name: 타입 검사 실행
      run: npm run typecheck
    
    - name: 테스트 실행
      run: npm run test:ci
  
  build:
    name: 빌드
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master' || github.ref == 'refs/heads/develop')
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Node.js 설정
      uses: actions/setup-node@v3
      with:
        node-version: 18
        cache: 'npm'
    
    - name: 의존성 설치
      run: npm ci --legacy-peer-deps
    
    - name: 네이티브 모듈 빌드
      run: npm run build:native
    
    - name: Next.js 빌드
      run: npm run build
    
    - name: 빌드 결과물 업로드
      uses: actions/upload-artifact@v3
      with:
        name: build-files
        path: .next/
`;
      
      fs.writeFileSync(cicdYmlPath, cicdYmlContent, 'utf8');
      console.log('✅ GitHub Actions CI/CD 워크플로우 파일 생성 완료');
    } else {
      console.log('⚠️ GitHub Actions CI/CD 워크플로우 파일이 이미 존재합니다');
    }
    
    // GitLab CI/CD 파일 생성
    const gitlabCIPath = path.join(process.cwd(), '.gitlab-ci.yml');
    if (!fs.existsSync(gitlabCIPath)) {
      const gitlabCIContent = `# GitLab CI/CD 파이프라인 설정
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

cache:
  key: \${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/

test:
  stage: test
  image: node:\${NODE_VERSION}
  script:
    - npm ci --legacy-peer-deps
    - npm run lint:check
    - npm run typecheck
    - npm run test:ci
  artifacts:
    reports:
      junit: junit.xml

build:
  stage: build
  image: node:\${NODE_VERSION}
  script:
    - npm ci --legacy-peer-deps
    - npm run build:native
    - npm run build
  artifacts:
    paths:
      - .next/
      - out/
  only:
    - main
    - master
    - develop
`;
      
      fs.writeFileSync(gitlabCIPath, gitlabCIContent, 'utf8');
      console.log('✅ GitLab CI/CD 파이프라인 파일 생성 완료');
    } else {
      console.log('⚠️ GitLab CI/CD 파이프라인 파일이 이미 존재합니다');
    }
    
    // CI/CD 가이드 문서 추가
    const docsDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir);
      console.log('✅ docs 디렉토리 생성 완료');
    }
    
    const cicdGuidePath = path.join(docsDir, 'ci-cd-guide.md');
    if (!fs.existsSync(cicdGuidePath)) {
      const cicdGuideContent = `# CI/CD 설정 가이드

이 문서는 Typing Stats 앱의 CI/CD(지속적 통합/지속적 배포) 설정에 대한 가이드입니다.

## GitHub Actions

GitHub Actions를 사용하면 코드 저장소에서 직접 워크플로우를 자동화할 수 있습니다.

### 워크플로우 개요

현재 설정된 워크플로우는 다음과 같은 단계로 구성됩니다:

1. **테스트**: 코드 품질 및 기능 테스트
   - 린트 검사 (ESLint)
   - 타입 검사 (TypeScript)
   - 유닛 테스트 (Jest)

2. **빌드**: 애플리케이션 빌드
   - 네이티브 모듈 컴파일
   - Next.js 애플리케이션 빌드

### 브랜치 전략

- \`main\` / \`master\`: 프로덕션 환경에 배포되는 안정적인 코드
- \`develop\`: 개발 중인 코드, 다음 릴리스를 위한 통합 브랜치
- 기능 브랜치: \`feature/기능-이름\` 형식으로 새 기능 개발

## GitLab CI/CD

GitLab에서도 유사한 CI/CD 파이프라인이 설정되어 있습니다.

### 파이프라인 단계

1. **test**: 코드 테스트
2. **build**: 애플리케이션 빌드
3. **deploy**: 배포 (main/master 브랜치에서만 실행)

### 로컬 개발 환경과의 통합

CI/CD 파이프라인은 \`package.json\`의 스크립트와 일치하도록 구성되었습니다.
`;
      
      fs.writeFileSync(cicdGuidePath, cicdGuideContent, 'utf8');
      console.log('✅ CI/CD 가이드 문서 생성 완료');
    } else {
      console.log('⚠️ CI/CD 가이드 문서가 이미 존재합니다');
    }
    
    // .gitignore에 CI/CD 관련 파일 추가
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      let gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      
      // CI/CD 관련 무시 항목이 없으면 추가
      if (!gitignoreContent.includes('.eslintcache')) {
        gitignoreContent += '\n# CI/CD 관련\n.eslintcache\njunit.xml\ncoverage/\n';
        fs.writeFileSync(gitignorePath, gitignoreContent, 'utf8');
        console.log('✅ .gitignore 파일 업데이트 완료');
      }
    }
    
    console.log('✅ CI/CD 설정 초기화 완료');
    
  } catch (error) {
    console.error('❌ CI/CD 설정 중 오류 발생:', error);
    process.exit(1);
  }
}

// 스크립트 실행
setupCICD();
