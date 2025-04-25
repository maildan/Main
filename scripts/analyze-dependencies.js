#!/usr/bin/env node

/**
 * Loop 모듈 종속성 분석 스크립트
 * 
 * 이 스크립트는 프로젝트의 모듈 종속성을 분석하고 종속성 그래프를 생성하며
 * 순환 참조 및 높은 결합도를 가진 모듈을 식별합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 프로젝트 루트 디렉토리 설정
const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const REPORT_DIR = path.join(ROOT_DIR, 'reports', 'dependencies');

// 색상 코드 설정
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// 커맨드 라인 인수 파싱
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose') || args.includes('-v'),
  generateGraph: args.includes('--graph'),
  skipTypeCheck: args.includes('--skip-typecheck'),
  skipTests: args.includes('--skip-tests'),
  reportFormat: args.includes('--json') ? 'json' : 'text',
  outputFile: getArgValue(args, '--output') || getArgValue(args, '-o'),
  targetDir: getArgValue(args, '--dir') || SRC_DIR
};

/**
 * 인수 값 가져오기
 */
function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return null;
}

/**
 * 메인 함수
 */
async function main() {
  console.log(`${colors.bright}Loop 모듈 종속성 분석 도구${colors.reset}`);
  console.log(`분석 대상 디렉토리: ${options.targetDir}\n`);
  
  try {
    // 보고서 디렉토리 생성
    ensureDirExists(REPORT_DIR);
    
    // 종속성 그래프 생성
    if (options.verbose) {
      console.log(`${colors.blue}■ 종속성 그래프 생성 중...${colors.reset}`);
    }
    const graph = generateDependencyGraph(options.targetDir);
    
    // 순환 참조 확인
    if (options.verbose) {
      console.log(`${colors.blue}■ 순환 참조 검사 중...${colors.reset}`);
    }
    const circularDeps = checkCircularDependencies(options.targetDir);
    
    // 타입 체크 실행
    if (!options.skipTypeCheck) {
      if (options.verbose) {
        console.log(`${colors.blue}■ 타입 검사 실행 중...${colors.reset}`);
      }
      const typeCheckResult = runTypeCheck();
      if (!typeCheckResult.success) {
        console.log(`${colors.red}✗ 타입 검사 실패: ${typeCheckResult.errors.length}개의 오류 발견${colors.reset}`);
      } else {
        console.log(`${colors.green}✓ 타입 검사 성공${colors.reset}`);
      }
    }
    
    // 불필요한 종속성 검사
    if (options.verbose) {
      console.log(`${colors.blue}■ 불필요한 종속성 검사 중...${colors.reset}`);
    }
    const unusedDeps = checkUnnecessaryDependencies(options.targetDir);
    
    // 테스트 실행
    let testResults = { success: true, failed: 0, passed: 0 };
    if (!options.skipTests) {
      if (options.verbose) {
        console.log(`${colors.blue}■ 테스트 실행 중...${colors.reset}`);
      }
      testResults = runTests();
    }
    
    // 모듈 중심성 분석
    if (options.verbose) {
      console.log(`${colors.blue}■ 모듈 중심성 분석 중...${colors.reset}`);
    }
    const centralityAnalysis = analyzeModuleCentrality(graph);
    
    // 분석 결과 생성
    const analysisResults = {
      timestamp: new Date().toISOString(),
      circularDependencies: circularDeps,
      unusedDependencies: unusedDeps,
      testResults: testResults,
      moduleCentrality: centralityAnalysis.slice(0, 10), // 상위 10개 중심 모듈
      dependencyGraph: options.generateGraph ? graph : null
    };
    
    // 결과 저장
    saveResults(analysisResults);
    
    // 결과 출력
    printSummary(analysisResults);
    
  } catch (error) {
    console.error(`${colors.red}오류 발생: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * 디렉토리 존재 확인 및 생성
 */
function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 종속성 그래프 생성
 */
function generateDependencyGraph(targetDir) {
  try {
    const madgeResult = execSync(`npx madge --json --exclude "node_modules" "${targetDir}"`, {
      encoding: 'utf8'
    });
    
    return JSON.parse(madgeResult);
  } catch (error) {
    console.error(`${colors.red}종속성 그래프 생성 오류: ${error.message}${colors.reset}`);
    return {};
  }
}

/**
 * 순환 참조 검사
 */
function checkCircularDependencies(targetDir) {
  try {
    const circularResult = execSync(`npx madge --circular --json --exclude "node_modules" "${targetDir}"`, {
      encoding: 'utf8'
    });
    
    const circularDeps = JSON.parse(circularResult);
    
    if (circularDeps.length > 0) {
      console.log(`${colors.yellow}⚠ ${circularDeps.length}개의 순환 참조 발견${colors.reset}`);
      
      if (options.verbose) {
        circularDeps.forEach((cycle, index) => {
          console.log(`  ${colors.yellow}순환 참조 #${index + 1}: ${cycle.join(' -> ')}${colors.reset}`);
        });
      }
    } else {
      console.log(`${colors.green}✓ 순환 참조 없음${colors.reset}`);
    }
    
    return circularDeps;
  } catch (error) {
    console.error(`${colors.red}순환 참조 검사 오류: ${error.message}${colors.reset}`);
    return [];
  }
}

/**
 * 타입 체크 실행
 */
function runTypeCheck() {
  try {
    execSync('npx tsc --noEmit', { stdio: options.verbose ? 'inherit' : 'pipe' });
    return { success: true, errors: [] };
  } catch (error) {
    // TypeScript 오류 파싱
    const errorOutput = error.stdout ? error.stdout.toString() : '';
    const errorLines = errorOutput.split('\n').filter(line => line.includes('error TS'));
    
    return {
      success: false,
      errors: errorLines.map(line => {
        const match = line.match(/(.+)\((\d+),(\d+)\): error (TS\d+): (.+)/);
        if (match) {
          return {
            file: match[1],
            line: parseInt(match[2]),
            column: parseInt(match[3]),
            code: match[4],
            message: match[5]
          };
        }
        return { raw: line };
      })
    };
  }
}

/**
 * 불필요한 종속성 검사
 */
function checkUnnecessaryDependencies(targetDir) {
  try {
    const cruiserResult = execSync(
      `npx dependency-cruiser --output-type json --do-not-follow "node_modules" "${targetDir}"`,
      { encoding: 'utf8' }
    );
    
    const cruiserData = JSON.parse(cruiserResult);
    const unusedDeps = [];
    
    if (cruiserData.summary && cruiserData.summary.violations) {
      // 사용되지 않는 종속성 필터링
      cruiserData.summary.violations
        .filter(v => v.rule.severity === 'warn' && v.rule.name === 'no-unused-dependency')
        .forEach(violation => {
          unusedDeps.push({
            from: violation.from,
            to: violation.to,
            rule: violation.rule.name,
            message: violation.message
          });
        });
    }
    
    if (unusedDeps.length > 0) {
      console.log(`${colors.yellow}⚠ ${unusedDeps.length}개의 불필요한 종속성 발견${colors.reset}`);
      
      if (options.verbose) {
        unusedDeps.forEach((dep, index) => {
          console.log(`  ${colors.yellow}불필요한 종속성 #${index + 1}: ${dep.from} -> ${dep.to}${colors.reset}`);
        });
      }
    } else {
      console.log(`${colors.green}✓ 불필요한 종속성 없음${colors.reset}`);
    }
    
    return unusedDeps;
  } catch (error) {
    console.error(`${colors.red}불필요한 종속성 검사 오류: ${error.message}${colors.reset}`);
    return [];
  }
}

/**
 * 테스트 실행
 */
function runTests() {
  try {
    const testOutput = execSync('npm test -- --json', {
      encoding: 'utf8',
      stdio: options.verbose ? 'inherit' : 'pipe'
    });
    
    try {
      const testResults = JSON.parse(testOutput);
      const success = testResults.success;
      const numFailedTests = testResults.numFailedTests || 0;
      const numPassedTests = testResults.numPassedTests || 0;
      
      if (success) {
        console.log(`${colors.green}✓ 모든 테스트 통과 (${numPassedTests}개)${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ 테스트 실패: ${numFailedTests}개 실패, ${numPassedTests}개 통과${colors.reset}`);
      }
      
      return {
        success,
        failed: numFailedTests,
        passed: numPassedTests,
        results: testResults
      };
    } catch (parseError) {
      console.error(`${colors.yellow}⚠ 테스트 결과 파싱 오류: ${parseError.message}${colors.reset}`);
      return { success: false, failed: 0, passed: 0 };
    }
  } catch (error) {
    console.error(`${colors.red}테스트 실행 오류: ${error.message}${colors.reset}`);
    return { success: false, failed: 0, passed: 0 };
  }
}

/**
 * 모듈 중심성 분석
 * 가장 많은 모듈에 의해 의존되는 모듈을 식별합니다.
 */
function analyzeModuleCentrality(graph) {
  const inDegree = {};
  
  // 각 모듈의 진입 차수 계산
  Object.entries(graph).forEach(([module, dependencies]) => {
    dependencies.forEach(dep => {
      if (!inDegree[dep]) {
        inDegree[dep] = 0;
      }
      inDegree[dep]++;
    });
  });
  
  // 높은 순서로 정렬
  return Object.entries(inDegree)
    .map(([module, count]) => ({ module, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 결과 저장
 */
function saveResults(results) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = options.outputFile ||
                   path.join(REPORT_DIR, `dependency-analysis-${timestamp}.${options.reportFormat}`);
  
  if (options.reportFormat === 'json') {
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
  } else {
    // 텍스트 형식으로 저장
    const content = [
      '# Loop 모듈 종속성 분석 보고서',
      `생성 시간: ${results.timestamp}`,
      '',
      '## 순환 참조',
      results.circularDependencies.length === 0 
        ? '순환 참조 없음' 
        : results.circularDependencies.map((cycle, i) => `${i + 1}. ${cycle.join(' -> ')}`).join('\n'),
      '',
      '## 불필요한 종속성',
      results.unusedDependencies.length === 0
        ? '불필요한 종속성 없음'
        : results.unusedDependencies.map((dep, i) => 
            `${i + 1}. ${dep.from} -> ${dep.to} (${dep.message})`
          ).join('\n'),
      '',
      '## 중심 모듈 (상위 10개)',
      results.moduleCentrality.map((mod, i) => 
        `${i + 1}. ${mod.module} (${mod.count}개 모듈에서 사용)`
      ).join('\n'),
      '',
      '## 테스트 결과',
      `통과: ${results.testResults.passed}`,
      `실패: ${results.testResults.failed}`,
      `상태: ${results.testResults.success ? '성공' : '실패'}`,
      ''
    ].join('\n');
    
    fs.writeFileSync(filename, content);
  }
  
  console.log(`${colors.green}✓ 분석 결과가 저장되었습니다: ${filename}${colors.reset}`);
}

/**
 * 결과 요약 출력
 */
function printSummary(results) {
  console.log('\n' + '='.repeat(50));
  console.log(`${colors.bright}분석 요약${colors.reset}`);
  console.log('='.repeat(50));
  
  console.log(`${colors.cyan}● 순환 참조:${colors.reset} ${results.circularDependencies.length}개`);
  console.log(`${colors.cyan}● 불필요한 종속성:${colors.reset} ${results.unusedDependencies.length}개`);
  
  if (!options.skipTests) {
    console.log(`${colors.cyan}● 테스트:${colors.reset} ${results.testResults.passed}개 통과, ${results.testResults.failed}개 실패`);
  }
  
  if (results.moduleCentrality.length > 0) {
    console.log(`\n${colors.cyan}● 가장 많이 사용되는 모듈 (상위 3개):${colors.reset}`);
    results.moduleCentrality.slice(0, 3).forEach((mod, i) => {
      console.log(`  ${i + 1}. ${mod.module} (${mod.count}개 모듈에서 사용)`);
    });
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`${colors.bright}다음 단계${colors.reset}`);
  
  if (results.circularDependencies.length > 0) {
    console.log(`${colors.yellow}⚠ 순환 참조를 해결하세요.${colors.reset}`);
  }
  
  if (results.unusedDependencies.length > 0) {
    console.log(`${colors.yellow}⚠ 불필요한 종속성을 제거하세요.${colors.reset}`);
  }
  
  if (!options.skipTests && results.testResults.failed > 0) {
    console.log(`${colors.yellow}⚠ 실패한 테스트를 수정하세요.${colors.reset}`);
  }
  
  console.log('='.repeat(50) + '\n');
}

// 스크립트 실행
main().catch(error => {
  console.error(`${colors.red}치명적 오류: ${error.message}${colors.reset}`);
  process.exit(1);
}); 