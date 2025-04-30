#!/usr/bin/env node

/**
 * 모듈 감사 도구를 CI/CD 파이프라인에 추가하는 스크립트
 * 이 스크립트는 GitHub Actions 워크플로우 파일을 생성하거나 업데이트합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

// 워크플로우 디렉토리 경로
const WORKFLOW_DIR = path.join(process.cwd(), '.github', 'workflows');
const WORKFLOW_FILE = path.join(WORKFLOW_DIR, 'module-audit.yml');

// 기본 워크플로우 설정
const DEFAULT_WORKFLOW = `name: Module Audit

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]
  workflow_dispatch:
  schedule:
    - cron: '0 0 * * 1'  # 매주 월요일 자정에 실행

jobs:
  module-audit:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          cache: 'yarn'
          
      - name: Install dependencies
        run: yarn install --frozen-lockfile
        
      - name: Run module audit
        run: node scripts/module-audit.js --verbose
        
      - name: Check for serious issues
        run: |
          ISSUES=$(cat module-audit-report.json | jq '.summary.totalIssues')
          SERIOUS_ISSUES=$(cat module-audit-report.json | jq '.summary.seriousIssues')
          
          echo "발견된 총 이슈: $ISSUES"
          echo "심각한 이슈: $SERIOUS_ISSUES"
          
          # 보고서 아티팩트로 저장
          mkdir -p audit-reports
          cp module-audit-report.json audit-reports/
          
          # 심각한 이슈가 있으면 경고만 표시 (CI 실패는 선택사항)
          if [ "$SERIOUS_ISSUES" -gt 0 ]; then
            echo "::warning::심각한 모듈 이슈가 $SERIOUS_ISSUES개 발견되었습니다. 보고서를 확인하세요."
            # 선택적으로 CI를 실패시키려면 아래 줄의 주석을 제거하세요
            # exit 1
          fi
          
      - name: Upload audit report
        uses: actions/upload-artifact@v3
        with:
          name: module-audit-report
          path: audit-reports/
          retention-days: 90
`;

// 사용자 정의 수정 스크립트
const CUSTOM_SCRIPT = `#!/usr/bin/env node

/**
 * 모듈 감사 결과를 처리하는 사용자 정의 스크립트
 * 이 스크립트는 module-audit.js의 결과를 분석하고 추가 작업을 수행합니다.
 */

const fs = require('fs');

// 보고서 읽기
const report = JSON.parse(fs.readFileSync('module-audit-report.json', 'utf8'));

// 추가 분석 수행
console.log('모듈 감사 결과 분석:');
console.log('------------------------');
console.log(\`총 모듈: \${report.summary.totalModules}\`);
console.log(\`사용되지 않는 모듈: \${report.summary.unusedModules?.length || 0}\`);
console.log(\`큰 모듈: \${report.summary.largeModules?.length || 0}\`);
console.log(\`깊은 종속성: \${report.summary.deepDependencies?.length || 0}\`);
console.log(\`자동 수정 가능한 이슈: \${report.summary.fixableIssues?.length || 0}\`);
console.log('------------------------');

// 심각한 이슈 정의
const seriousIssues = (report.largeModules?.filter(m => m.size > 1000000) || []).length +
                      (report.deepDependencies?.filter(d => d.depth > 10) || []).length;

// 결과에 심각한 이슈 수 추가
report.summary.seriousIssues = seriousIssues;

// 업데이트된 보고서 저장
fs.writeFileSync('module-audit-report.json', JSON.stringify(report, null, 2));

// 필요에 따라 다른 시스템에 알림 전송
// 예: Slack, 이메일 등

// 종료 코드 설정 (CI/CD 파이프라인에서 사용)
process.exit(seriousIssues > 5 ? 1 : 0);
`;

/**
 * 워크플로우 파일 생성 또는 업데이트
 */
function setupWorkflow() {
  console.log(chalk.blue('CI/CD 파이프라인에 모듈 감사를 설정합니다...'));
  
  // .github/workflows 디렉토리 확인 및 생성
  if (!fs.existsSync(WORKFLOW_DIR)) {
    console.log(chalk.yellow('.github/workflows 디렉토리가 없습니다. 생성합니다...'));
    fs.mkdirSync(WORKFLOW_DIR, { recursive: true });
  }
  
  // 워크플로우 파일 생성 또는 업데이트
  const fileExists = fs.existsSync(WORKFLOW_FILE);
  
  if (fileExists) {
    console.log(chalk.yellow('기존 module-audit.yml 파일이 있습니다. 업데이트합니다...'));
    const existingContent = fs.readFileSync(WORKFLOW_FILE, 'utf8');
    
    // 기존 파일을 백업
    fs.writeFileSync(`${WORKFLOW_FILE}.bak`, existingContent);
    console.log(chalk.green('기존 파일이 .bak으로 백업되었습니다.'));
  }
  
  // 새 워크플로우 파일 작성
  fs.writeFileSync(WORKFLOW_FILE, DEFAULT_WORKFLOW);
  console.log(chalk.green(`워크플로우 파일이 생성되었습니다: ${WORKFLOW_FILE}`));
  
  return !fileExists;
}

/**
 * 사용자 정의 처리 스크립트 추가
 */
function addCustomScript() {
  const scriptPath = path.join(process.cwd(), 'scripts', 'process-audit-results.js');
  
  // 스크립트 생성
  fs.writeFileSync(scriptPath, CUSTOM_SCRIPT);
  fs.chmodSync(scriptPath, '755'); // 실행 권한 추가
  
  console.log(chalk.green(`사용자 정의 처리 스크립트가 생성되었습니다: ${scriptPath}`));
}

/**
 * package.json 업데이트
 */
function updatePackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log(chalk.red('package.json 파일을 찾을 수 없습니다.'));
    return false;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // scripts 섹션이 없으면 생성
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    // 스크립트 추가
    packageJson.scripts['audit:modules'] = 'node scripts/module-audit.js';
    packageJson.scripts['audit:modules:fix'] = 'node scripts/module-audit.js --fix';
    packageJson.scripts['audit:modules:ci'] = 'node scripts/module-audit.js --verbose && node scripts/process-audit-results.js';
    
    // 업데이트된 package.json 저장
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(chalk.green('package.json에 모듈 감사 스크립트가 추가되었습니다.'));
    
    return true;
  } catch (error) {
    console.error(chalk.red('package.json 업데이트 중 오류가 발생했습니다:'), error);
    return false;
  }
}

/**
 * 필요한 종속성 확인 및 설치
 */
function checkDependencies() {
  const requiredDeps = ['chalk', 'ora', 'yargs'];
  const devDeps = ['madge', 'dependency-cruiser', 'jq-web'];
  
  console.log(chalk.blue('필요한 종속성을 확인합니다...'));
  
  try {
    // package.json 읽기
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const missingDeps = requiredDeps.filter(dep => !deps[dep]);
    const missingDevDeps = devDeps.filter(dep => !deps[dep]);
    
    if (missingDeps.length > 0 || missingDevDeps.length > 0) {
      console.log(chalk.yellow('누락된 종속성을 설치합니다...'));
      
      if (missingDeps.length > 0) {
        const depsString = missingDeps.join(' ');
        execSync(`yarn add ${depsString}`, { stdio: 'inherit' });
      }
      
      if (missingDevDeps.length > 0) {
        const devDepsString = missingDevDeps.join(' ');
        execSync(`yarn add -D ${devDepsString}`, { stdio: 'inherit' });
      }
      
      console.log(chalk.green('종속성이 설치되었습니다.'));
    } else {
      console.log(chalk.green('모든 필요한 종속성이 이미 설치되어 있습니다.'));
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red('종속성 확인 중 오류가 발생했습니다:'), error);
    return false;
  }
}

/**
 * 메인 함수
 */
function main() {
  console.log(chalk.bold.blue('모듈 감사를 CI/CD 파이프라인에 추가합니다...'));
  
  // 종속성 확인 및 설치
  if (!checkDependencies()) {
    console.error(chalk.red('종속성 설치 실패로 설정을 중단합니다.'));
    process.exit(1);
  }
  
  // 워크플로우 설정
  const isNewWorkflow = setupWorkflow();
  
  // 사용자 정의 스크립트 추가
  addCustomScript();
  
  // package.json 업데이트
  updatePackageJson();
  
  console.log(chalk.bold.green('\n모듈 감사가 CI/CD 파이프라인에 성공적으로 추가되었습니다!'));
  console.log(chalk.blue('다음 명령으로 모듈 감사를 실행할 수 있습니다:'));
  console.log(chalk.cyan('  yarn audit:modules'));
  console.log(chalk.cyan('  yarn audit:modules:fix'));
  
  if (isNewWorkflow) {
    console.log(chalk.yellow('\n참고: 새 GitHub Actions 워크플로우가 생성되었습니다.'));
    console.log(chalk.yellow('프로젝트에 맞게 .github/workflows/module-audit.yml 파일을 검토하고 수정하세요.'));
  }
}

// 스크립트 실행
main(); 