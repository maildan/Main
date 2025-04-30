#!/usr/bin/env node

/**
 * 모듈 종속성 테스트 실행 스크립트
 * 
 * 이 스크립트는 다음 작업을 수행합니다:
 * 1. 의존성 그래프 생성 (madge 사용)
 * 2. 순환 참조 검사
 * 3. 타입 체크
 * 4. 불필요한 종속성 검사
 * 5. 테스트 실행 (선택적)
 */

const path = require('path');
const fs = require('fs');
const { execSync, exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const REPORT_DIR = path.join(ROOT_DIR, 'reports');

// 색상 코드
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// 보고서 생성 디렉토리 확인
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

/**
 * CLI로부터 인자 파싱
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    skipTypeCheck: args.includes('--skip-typecheck'),
    skipTests: args.includes('--skip-tests'),
    skipCircular: args.includes('--skip-circular'),
    skipGraph: args.includes('--skip-graph'),
    verbose: args.includes('--verbose'),
    help: args.includes('--help') || args.includes('-h'),
    targetModule: args.find(arg => !arg.startsWith('-'))
  };

  if (options.help) {
    console.log(`
${COLORS.cyan}모듈 종속성 테스트 실행 스크립트${COLORS.reset}

사용법:
  node module-test-runner.js [옵션] [대상모듈]

옵션:
  --skip-typecheck    타입 체크 건너뛰기
  --skip-tests        테스트 실행 건너뛰기
  --skip-circular     순환 참조 검사 건너뛰기
  --skip-graph        의존성 그래프 생성 건너뛰기
  --verbose           상세 출력
  --help, -h          도움말 표시

예시:
  node module-test-runner.js                      # 전체 검사 실행
  node module-test-runner.js --skip-tests         # 테스트 제외하고 실행
  node module-test-runner.js src/app/utils        # 특정 모듈만 검사
    `);
    process.exit(0);
  }

  return options;
}

/**
 * 의존성 그래프 생성
 */
async function generateDependencyGraph(targetDir = SRC_DIR, options = {}) {
  console.log(`\n${COLORS.cyan}=== 의존성 그래프 생성 중... ===${COLORS.reset}`);

  try {
    // madge가 설치되어 있는지 확인
    try {
      execSync('npx madge --version', { stdio: 'ignore' });
    } catch (error) {
      console.log(`${COLORS.yellow}madge가 설치되어 있지 않습니다. 설치합니다...${COLORS.reset}`);
      execSync('npm install -g madge', { stdio: 'inherit' });
    }

    // 그래프 생성
    console.log(`대상 디렉토리: ${targetDir}`);
    
    // JSON 형식으로 의존성 데이터 생성
    const { stdout: dependencyJson } = await execPromise(
      `npx madge --include-npm --extensions ts,tsx,js,jsx --json "${targetDir}"`
    );
    
    // 결과 저장
    const jsonFilePath = path.join(REPORT_DIR, 'dependency-graph.json');
    fs.writeFileSync(jsonFilePath, dependencyJson);
    console.log(`${COLORS.green}의존성 데이터 생성 완료: ${jsonFilePath}${COLORS.reset}`);

    // 시각화 이미지 생성
    if (!options.skipGraph) {
      console.log('의존성 그래프 이미지 생성 중...');
      const graphImagePath = path.join(REPORT_DIR, 'dependency-graph.svg');
      
      await execPromise(
        `npx madge --include-npm --extensions ts,tsx,js,jsx --image "${graphImagePath}" "${targetDir}"`
      );
      
      console.log(`${COLORS.green}의존성 그래프 이미지 생성 완료: ${graphImagePath}${COLORS.reset}`);
    }

    return JSON.parse(dependencyJson);
  } catch (error) {
    console.error(`${COLORS.red}의존성 그래프 생성 실패:${COLORS.reset}`, error.message);
    return null;
  }
}

/**
 * 순환 참조 검사
 */
async function checkCircularDependencies(targetDir = SRC_DIR) {
  console.log(`\n${COLORS.cyan}=== 순환 참조 검사 중... ===${COLORS.reset}`);

  try {
    const { stdout, stderr } = await execPromise(
      `npx madge --circular --extensions ts,tsx,js,jsx "${targetDir}"`
    );

    if (stderr) {
      console.error(`${COLORS.red}오류:${COLORS.reset}`, stderr);
    }

    const circularDependencies = stdout.trim();
    if (circularDependencies) {
      console.error(`${COLORS.red}순환 참조 발견:${COLORS.reset}\n${circularDependencies}`);
      
      // 순환 참조 JSON 저장
      try {
        const { stdout: circularJson } = await execPromise(
          `npx madge --circular --json --extensions ts,tsx,js,jsx "${targetDir}"`
        );
        
        const jsonFilePath = path.join(REPORT_DIR, 'circular-dependencies.json');
        fs.writeFileSync(jsonFilePath, circularJson);
        console.log(`${COLORS.yellow}순환 참조 데이터 저장: ${jsonFilePath}${COLORS.reset}`);
      } catch (error) {
        console.error('순환 참조 JSON 생성 실패:', error.message);
      }
      
      return false;
    } else {
      console.log(`${COLORS.green}순환 참조 없음${COLORS.reset}`);
      return true;
    }
  } catch (error) {
    console.error(`${COLORS.red}순환 참조 검사 실패:${COLORS.reset}`, error.message);
    return false;
  }
}

/**
 * 타입 체크
 */
async function runTypeCheck() {
  console.log(`\n${COLORS.cyan}=== 타입 체크 중... ===${COLORS.reset}`);

  try {
    const { stdout, stderr } = await execPromise('npx tsc --noEmit');
    
    if (stderr) {
      console.error(`${COLORS.red}타입 체크 중 오류:${COLORS.reset}`, stderr);
    }
    
    if (stdout.includes('error')) {
      console.error(`${COLORS.red}타입 오류 발견:${COLORS.reset}\n${stdout}`);
      return false;
    } else {
      console.log(`${COLORS.green}타입 체크 통과${COLORS.reset}`);
      return true;
    }
  } catch (error) {
    console.error(`${COLORS.red}타입 체크 실패:${COLORS.reset}`);
    console.error(error.stdout || error.message);
    return false;
  }
}

/**
 * 불필요한 종속성 검사 (dependency-cruiser 사용)
 */
async function checkUnnecessaryDependencies(targetDir = SRC_DIR) {
  console.log(`\n${COLORS.cyan}=== 불필요한 종속성 검사 중... ===${COLORS.reset}`);

  try {
    // dependency-cruiser가 설치되어 있는지 확인
    try {
      execSync('npx depcruise --version', { stdio: 'ignore' });
    } catch (error) {
      console.log(`${COLORS.yellow}dependency-cruiser가 설치되어 있지 않습니다. 설치합니다...${COLORS.reset}`);
      execSync('npm install -g dependency-cruiser', { stdio: 'inherit' });
    }

    // 기본 설정 파일이 없는 경우 생성
    const configPath = path.join(ROOT_DIR, '.dependency-cruiser.js');
    if (!fs.existsSync(configPath)) {
      console.log(`${COLORS.yellow}dependency-cruiser 설정 파일이 없습니다. 기본 설정 파일을 생성합니다...${COLORS.reset}`);
      execSync('npx depcruise --init', { stdio: 'inherit', cwd: ROOT_DIR });
    }

    // 불필요한 종속성 검사
    const outputPath = path.join(REPORT_DIR, 'dependency-report.html');
    await execPromise(
      `npx depcruise --output-type html --output-to "${outputPath}" "${targetDir}"`
    );

    console.log(`${COLORS.green}종속성 분석 리포트 생성 완료: ${outputPath}${COLORS.reset}`);
    return true;
  } catch (error) {
    console.error(`${COLORS.red}불필요한 종속성 검사 실패:${COLORS.reset}`, error.message);
    if (error.stdout) console.error(error.stdout);
    return false;
  }
}

/**
 * 테스트 실행
 */
async function runTests(targetModule = null) {
  console.log(`\n${COLORS.cyan}=== 테스트 실행 중... ===${COLORS.reset}`);

  const testCommand = targetModule
    ? `npx jest --testPathPattern=${targetModule}`
    : 'npx jest';

  try {
    const { stdout, stderr } = await execPromise(testCommand);
    
    if (stderr && !stderr.includes('PASS')) {
      console.error(`${COLORS.red}테스트 중 오류:${COLORS.reset}`, stderr);
    }
    
    console.log(stdout);
    
    if (stdout.includes('FAIL')) {
      console.error(`${COLORS.red}테스트 실패${COLORS.reset}`);
      return false;
    } else {
      console.log(`${COLORS.green}테스트 통과${COLORS.reset}`);
      return true;
    }
  } catch (error) {
    console.error(`${COLORS.red}테스트 실행 실패:${COLORS.reset}`);
    console.error(error.stdout || error.message);
    return false;
  }
}

/**
 * 중심성 허브 분석
 */
function analyzeHubs(dependencyGraph) {
  const dependencies = {};
  const dependents = {};
  
  // 각 모듈의 종속성과 종속모듈 카운트
  Object.entries(dependencyGraph).forEach(([module, deps]) => {
    if (!dependencies[module]) {
      dependencies[module] = deps.length;
    }
    
    deps.forEach(dep => {
      if (!dependents[dep]) {
        dependents[dep] = 0;
      }
      dependents[dep]++;
    });
  });
  
  // 중요도 점수 계산 (종속성 + 종속모듈 수)
  const scores = {};
  const allModules = new Set([
    ...Object.keys(dependencies),
    ...Object.keys(dependents)
  ]);
  
  allModules.forEach(module => {
    scores[module] = (dependencies[module] || 0) + (dependents[module] || 0);
  });
  
  // 점수 기준 내림차순 정렬
  const sortedModules = Object.entries(scores)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .map(([module, score]) => ({
      module,
      dependenciesCount: dependencies[module] || 0,
      dependentsCount: dependents[module] || 0,
      score
    }));
  
  // 상위 10개 모듈 출력
  console.log(`\n${COLORS.cyan}=== 중심성 허브 분석 (상위 10개) ===${COLORS.reset}`);
  
  const top10 = sortedModules.slice(0, 10);
  const table = top10.map(({ module, dependenciesCount, dependentsCount, score }) => ({
    '모듈': module,
    '사용하는 모듈 수': dependenciesCount,
    '사용되는 횟수': dependentsCount,
    '중요도 점수': score
  }));
  
  console.table(table);
  
  // 결과 저장
  const jsonFilePath = path.join(REPORT_DIR, 'module-hubs.json');
  fs.writeFileSync(jsonFilePath, JSON.stringify(sortedModules, null, 2));
  console.log(`${COLORS.green}중심성 분석 데이터 저장: ${jsonFilePath}${COLORS.reset}`);
  
  return top10;
}

/**
 * 메인 실행 함수
 */
async function main() {
  const options = parseArgs();
  const targetDir = options.targetModule ? path.join(SRC_DIR, options.targetModule) : SRC_DIR;
  
  console.log(`\n${COLORS.magenta}=== 모듈 종속성 테스트 시작 ===${COLORS.reset}`);
  console.log(`대상: ${targetDir}`);
  
  let success = true;
  let dependencyGraph = null;
  
  // 의존성 그래프 생성
  if (!options.skipGraph) {
    dependencyGraph = await generateDependencyGraph(targetDir, { skipGraph: false });
    if (!dependencyGraph) {
      success = false;
    } else {
      // 중심성 허브 분석
      analyzeHubs(dependencyGraph);
    }
  }
  
  // 순환 참조 검사
  if (!options.skipCircular) {
    const circularCheckResult = await checkCircularDependencies(targetDir);
    success = success && circularCheckResult;
  }
  
  // 타입 체크
  if (!options.skipTypeCheck) {
    const typeCheckResult = await runTypeCheck();
    success = success && typeCheckResult;
  }
  
  // 불필요한 종속성 검사
  const depsCheckResult = await checkUnnecessaryDependencies(targetDir);
  success = success && depsCheckResult;
  
  // 테스트 실행
  if (!options.skipTests) {
    const testResult = await runTests(options.targetModule);
    success = success && testResult;
  }
  
  // 종료 상태 표시
  console.log(`\n${COLORS.magenta}=== 모듈 종속성 테스트 종료 ===${COLORS.reset}`);
  if (success) {
    console.log(`${COLORS.green}모든 테스트 통과${COLORS.reset}`);
  } else {
    console.log(`${COLORS.red}일부 테스트 실패${COLORS.reset}`);
    process.exit(1);
  }
}

// 스크립트 실행
main().catch(error => {
  console.error(`${COLORS.red}실행 중 오류 발생:${COLORS.reset}`, error);
  process.exit(1);
}); 