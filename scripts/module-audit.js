#!/usr/bin/env node

/**
 * Loop 프로젝트 모듈 감사 스크립트
 * 이 스크립트는 다음을 수행합니다:
 * 1. 프로젝트 내 모든 모듈 분석
 * 2. 사용되지 않는 모듈 식별
 * 3. 종속성 트리 깊이 분석
 * 4. 모듈 크기 및 메모리 영향 측정
 * 5. 감사 보고서 생성
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const madge = require('madge');
const { EOL } = require('os');
const colors = require('colors/safe');
const figures = require('figures');

// CLI 옵션 파싱
const argv = yargs(hideBin(process.argv))
  .option('dir', {
    alias: 'd',
    description: '감사할 디렉터리',
    type: 'string',
    default: 'src'
  })
  .option('output', {
    alias: 'o',
    description: '출력 파일 경로',
    type: 'string',
    default: 'module-audit-report.json'
  })
  .option('threshold', {
    alias: 't',
    description: '경고 임계값(KB)',
    type: 'number',
    default: 500
  })
  .option('verbose', {
    alias: 'v',
    description: '상세 로그 출력',
    type: 'boolean',
    default: false
  })
  .option('fix', {
    alias: 'f',
    description: '자동 수정 적용 시도',
    type: 'boolean',
    default: false
  })
  .help()
  .alias('help', 'h')
  .argv;

// 로그 유틸리티
const log = {
  info: (msg) => console.log(chalk.blue('ℹ️ ') + msg),
  success: (msg) => console.log(chalk.green('✅ ') + msg),
  warning: (msg) => console.log(chalk.yellow('⚠️ ') + msg),
  error: (msg) => console.log(chalk.red('❌ ') + msg),
  verbose: (msg) => argv.verbose && console.log(chalk.gray('🔍 ') + msg)
};

// 감사 결과 저장 객체
const auditResults = {
  timestamp: new Date().toISOString(),
  summary: {
    totalModules: 0,
    unusedModules: 0,
    largeModules: 0,
    deepDependencies: 0,
    fixableIssues: 0,
    circularDependencies: 0
  },
  unusedModules: [],
  largeModules: [],
  deepDependencyChains: [],
  fixableIssues: [],
  circularDependencies: []
};

// 제외할 디렉토리 목록
const excludedDirs = ['node_modules', '.next', 'dist'];
// 포함할 파일 확장자 목록
const includedExtensions = ['.js', '.jsx', '.ts', '.tsx'];

/**
 * 지정된 디렉토리에서 모든 모듈 파일을 재귀적으로 찾습니다.
 * 제외할 디렉토리와 포함할 파일 확장자를 기준으로 필터링합니다.
 * @param {string} dir 검색을 시작할 디렉토리 경로
 * @param {Array<string>} [fileList=[]] 파일 목록 (재귀 호출 시 사용)
 * @returns {Array<string>} 찾은 모듈 파일 경로 목록
 */
function findModuleFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !excludedDirs.includes(file)) {
      findModuleFilesRecursively(filePath, fileList);
    } else if (stat.isFile() && includedExtensions.includes(path.extname(file))) {
      // 경로 구분자를 OS에 맞게 정규화
      fileList.push(filePath.replace(/\\/g, '/'));
    }
  });

  return fileList;
}

/**
 * 프로젝트의 모든 JS/TS 파일 찾기 (Node.js fs 모듈 사용)
 */
function findAllModules(dir) {
  const spinner = ora('모듈 파일 검색 중...').start();
  try {
    const result = findModuleFilesRecursively(dir);
    
    auditResults.summary.totalModules = result.length;
    spinner.succeed(`${result.length}개의 모듈 파일을 발견했습니다.`);
    return result;
  } catch (error) {
    spinner.fail('모듈 검색 중 오류 발생');
    log.error(error.message);
    log.verbose(error.stack); // 상세 에러 로그 추가
    return [];
  }
}

/**
 * 사용되지 않는 모듈 식별
 */
function identifyUnusedModules(files) {
  const spinner = ora('사용되지 않는 모듈 식별 중...').start();
  try {
    // eslint나 다른 도구를 사용하여 사용되지 않는 모듈 찾기
    const unusedModules = [];
    const allFileContent = files.map(file => ({
      path: file,
      content: fs.readFileSync(file, 'utf8')
    }));
    
    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      // 모듈이 export하지만 다른 파일에서 import하지 않는지 확인
      // 간단한 예시: export default 또는 export const/function/class 가 있는지 확인
      const hasExports = /export\s+(default|const|function|class|interface|type)/.test(content);
      
      // 실제로는 전체 프로젝트에서 import 문을 검색해야 함
      // 이 예시에서는 단순화를 위해 특정 조건의 파일만 검사
      if (hasExports && path.basename(file).includes('utility') && !file.includes('index')) {
        // 이 모듈이 다른 파일에서 참조되는지 확인하는 로직 필요
        const moduleName = path.basename(file, path.extname(file));
        // 정규 표현식으로 import 구문 검색
        const importRegex = new RegExp(`import.*from\s+['"].*${moduleName}['"]`);
        let isImported = false;

        for (const otherFile of allFileContent) {
          // 자기 자신 파일은 제외
          if (otherFile.path === file) continue;

          if (importRegex.test(otherFile.content)) {
            isImported = true;
            break;
          }
        }
        
        if (!isImported) {
          const stats = fs.statSync(file);
          unusedModules.push({
            file,
            lastModified: stats.mtime,
            size: stats.size
          });
        }
      }
    });
    
    auditResults.unusedModules = unusedModules;
    auditResults.summary.unusedModules = unusedModules.length;
    spinner.succeed(`${unusedModules.length}개의 사용되지 않는 모듈 후보를 발견했습니다.`);
    
    return unusedModules;
  } catch (error) {
    spinner.fail('사용되지 않는 모듈 식별 중 오류 발생');
    log.error(error.message);
    log.verbose(error.stack); // 상세 에러 로그 추가
    return [];
  }
}

/**
 * 모듈 크기 분석 및 큰 모듈 식별
 */
function analyzeLargeModules(files, thresholdKB = 500) {
  const spinner = ora('모듈 크기 분석 중...').start();
  try {
    const largeModules = files.map(file => {
      const stats = fs.statSync(file);
      return {
        file,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024),
        lastModified: stats.mtime
      };
    })
    .filter(module => module.sizeKB > thresholdKB)
    .sort((a, b) => b.size - a.size);
    
    auditResults.largeModules = largeModules;
    auditResults.summary.largeModules = largeModules.length;
    spinner.succeed(`${largeModules.length}개의 큰 모듈을 발견했습니다 (>${thresholdKB}KB).`);
    
    return largeModules;
  } catch (error) {
    spinner.fail('모듈 크기 분석 중 오류 발생');
    log.error(error.message);
    return [];
  }
}

/**
 * 깊은 의존성 체인을 분석하고 위험한 체인을 식별합니다.
 * @param {Array<string>} modulePaths 분석할 모듈 경로 배열
 * @returns {Promise<Array<Array<string>>>} 발견된 의존성 체인 배열
 */
async function analyzeDeepDependencyChains(modulePaths) {
  log.info('깊은 의존성 체인 분석 시작...');
  
  try {
    const madgeInstance = await madge(modulePaths, madgeOptions);
    const dependencyGraph = madgeInstance.obj();
    
    // 모든 의존성 체인을 저장할 배열
    const allChains = [];
    
    // 방문한 모듈을 추적하기 위한 객체
    const visited = {};
    
    // DFS를 사용하여 모든 의존성 체인 찾기
    function dfs(currentModule, currentChain) {
      // 현재 체인에 현재 모듈 추가
      currentChain.push(currentModule);
      
      // 현재 모듈의 의존성 가져오기
      const dependencies = dependencyGraph[currentModule] || [];
      
      // 의존성 탐색
      for (const dependency of dependencies) {
        if (currentChain.includes(dependency)) {
          // 순환 의존성 발견, 건너뛰기
          continue;
        }
        
        // 새 체인으로 재귀 호출
        dfs(dependency, [...currentChain]);
      }
      
      // 체인에 모듈이 2개 이상이면 저장
      if (currentChain.length >= 2) {
        allChains.push(currentChain);
      }
    }
    
    // 모든 모듈에서 DFS 시작
    Object.keys(dependencyGraph).forEach(module => {
      dfs(module, []);
    });
    
    // 체인 길이로 정렬
    const sortedChains = allChains
      .sort((a, b) => b.length - a.length)
      .filter(chain => chain.length >= 3); // 3개 이상의 모듈을 포함하는 체인만 필터링
    
    // 중복 체인 제거
    const uniqueChains = [];
    const chainSignatures = new Set();
    
    for (const chain of sortedChains) {
      const signature = chain.join('→');
      if (!chainSignatures.has(signature)) {
        chainSignatures.add(signature);
        uniqueChains.push(chain);
      }
    }
    
    log.info(`총 ${uniqueChains.length}개의 고유한 의존성 체인이 발견되었습니다.`);
    
    // 위험한 체인 식별 (길이가 8 이상인 체인)
    const riskyChains = uniqueChains.filter(chain => chain.length >= 8);
    
    if (riskyChains.length > 0) {
      log.warn(`${riskyChains.length}개의 위험한 긴 의존성 체인이 발견되었습니다.`);
      log.warn('가장 긴 체인 10개:');
      
      uniqueChains.slice(0, 10).forEach((chain, index) => {
        log.warn(`${index + 1}. 길이 ${chain.length}: ${chain.join(' → ')}`);
      });
      
      log.info('긴 의존성 체인의 문제점:');
      log.info('1. 코드 이해도 감소');
      log.info('2. 테스트 복잡성 증가');
      log.info('3. 변경 시 사이드 이펙트 위험');
      log.info('4. 빌드 시간 증가');
      
      log.info('개선 방법:');
      log.info('1. 공통 기능을 독립 모듈로 추출');
      log.info('2. 인터페이스 계층 추가');
      log.info('3. 모듈 책임 범위 재설계');
    } else {
      log.info('위험한 의존성 체인이 발견되지 않았습니다. 좋은 모듈 구조입니다!');
    }
    
    auditResults.deepDependencyChains = uniqueChains;
    auditResults.summary.deepDependencies = uniqueChains.length;
    
    return uniqueChains;
  } catch (e) {
    log.error(`깊은 의존성 체인 분석 중 오류 발생: ${e.message}`);
    return [];
  }
}

/**
 * 코드베이스에서 순환 의존성 참조를 감지합니다.
 * @param {Array<string>} modulePaths 분석할 모듈 경로 배열
 * @returns {Promise<Array<Array<string>>>} 발견된 순환 의존성 배열
 */
async function detectCircularDependencies(modulePaths) {
  const spinner = ora('순환 의존성 분석 중...').start();
  
  try {
    const madgeInstance = await madge(modulePaths, madgeOptions);
    const circularDeps = madgeInstance.circular();
    
    if (circularDeps.length === 0) {
      spinner.succeed('순환 의존성이 발견되지 않았습니다. 좋은 모듈 구조입니다!');
      log.info('✓ 순환 의존성 없음: 모듈 간 의존성이 명확하게 단방향으로 설계되었습니다.');
    } else {
      spinner.warn(`${circularDeps.length}개의 순환 의존성이 발견되었습니다!`);
      
      log.warn('발견된 순환 의존성:');
      circularDeps.forEach((circPath, index) => {
        log.warn(`${index + 1}. ${circPath.join(' → ')} → ${circPath[0]}`);
      });
      
      // 가장 많이 포함된 모듈 분석
      const moduleFrequency = {};
      
      circularDeps.forEach(circPath => {
        circPath.forEach(moduleName => {
          moduleFrequency[moduleName] = (moduleFrequency[moduleName] || 0) + 1;
        });
      });
      
      // 빈도수로 정렬
      const sortedModules = Object.entries(moduleFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      if (sortedModules.length > 0) {
        log.warn('순환 의존성에 가장 많이 포함된 모듈 (상위 5개):');
        sortedModules.forEach(([moduleName, count], index) => {
          log.warn(`${index + 1}. ${moduleName} - ${count}개 순환에 포함됨`);
        });
        
        log.info('순환 의존성 문제점:');
        log.info('1. 코드 이해도 저하: 의존성의 흐름을 이해하기 어려움');
        log.info('2. 테스트 어려움: 모듈을 개별적으로 테스트하기 어려움');
        log.info('3. 빌드 문제: 빌드 시스템이 의존성 해결에 어려움을 겪을 수 있음');
        log.info('4. 메모리 누수 위험: 객체 간 참조가 해제되지 않을 수 있음');
        
        log.info('해결 방법:');
        log.info('1. 의존성 역전 원칙(DIP) 적용: 공통 인터페이스를 통한 의존성 추상화');
        log.info('2. 모듈 분리: 순환 참조를 유발하는 모듈의 책임 분리');
        log.info('3. 이벤트 시스템 활용: 직접 참조 대신 이벤트 기반 통신 사용');
        log.info('4. 단방향 데이터 흐름 적용: React/Redux 패턴과 같은 단방향 설계 채택');
      }
    }
    
    auditResults.circularDependencies = circularDeps;
    auditResults.summary.circularDependencies = circularDeps.length;
    
    return circularDeps;
  } catch (e) {
    spinner.fail('순환 의존성 분석 중 오류 발생');
    log.error(`순환 의존성 분석 중 오류 발생: ${e.message}`);
    return [];
  }
}

/**
 * 자동 수정 가능한 문제 파악
 */
function identifyFixableIssues() {
  const spinner = ora('자동 수정 가능한 문제 식별 중...').start();
  const fixableIssues = [];
  
  // 1. 사용되지 않는 import 문 찾기
  try {
    const result = execSync(
      `npx eslint --fix-dry-run --format json ${argv.dir}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    
    const eslintResults = JSON.parse(result);
    eslintResults.forEach(file => {
      file.messages.forEach(msg => {
        if (msg.ruleId === 'no-unused-vars' || msg.ruleId === '@typescript-eslint/no-unused-vars') {
          fixableIssues.push({
            file: file.filePath,
            type: 'unused-import',
            message: msg.message,
            fixable: true
          });
        }
      });
    });
  } catch (error) {
    log.verbose('ESLint 실행 중 오류가 발생했지만 계속 진행합니다.');
    if (error.stdout) {
      try {
        const eslintResults = JSON.parse(error.stdout);
        eslintResults.forEach(file => {
          file.messages.forEach(msg => {
            if (msg.ruleId === 'no-unused-vars' || msg.ruleId === '@typescript-eslint/no-unused-vars') {
              fixableIssues.push({
                file: file.filePath,
                type: 'unused-import',
                message: msg.message,
                fixable: true
              });
            }
          });
        });
      } catch (e) {
        log.verbose('ESLint 결과 파싱 오류');
      }
    }
  }
  
  // 2. 빈 파일 또는 거의 비어있는 파일 찾기
  auditResults.unusedModules.forEach(module => {
    if (module.size < 100) { // 100바이트 미만의 파일
      fixableIssues.push({
        file: module.file,
        type: 'empty-file',
        message: '거의 비어있는 파일입니다',
        fixable: true
      });
    }
  });
  
  auditResults.fixableIssues = fixableIssues;
  auditResults.summary.fixableIssues = fixableIssues.length;
  spinner.succeed(`${fixableIssues.length}개의 자동 수정 가능한 문제를 발견했습니다.`);
  
  return fixableIssues;
}

/**
 * 자동 수정 적용
 */
function applyFixes(fixableIssues) {
  if (!argv.fix || fixableIssues.length === 0) return;
  
  const spinner = ora('자동 수정 적용 중...').start();
  let fixedCount = 0;
  
  // 수정 가능한 각 문제에 대한 처리
  fixableIssues.forEach(issue => {
    try {
      if (issue.type === 'unused-import') {
        // ESLint를 사용하여 사용되지 않는 import 수정
        execSync(`npx eslint --fix ${issue.file}`, { stdio: 'ignore' });
        fixedCount++;
      } else if (issue.type === 'empty-file') {
        // 빈 파일에 대한 처리 (경고만 표시)
        log.warning(`빈 파일 발견: ${issue.file}`);
      }
    } catch (error) {
      log.verbose(`${issue.file} 수정 중 오류: ${error.message}`);
    }
  });
  
  spinner.succeed(`${fixedCount}개의 문제를 자동으로 수정했습니다.`);
}

/**
 * 보고서 생성 및 저장
 */
function generateReport() {
  const spinner = ora('감사 보고서 생성 중...').start();
  
  // 추가 요약 정보 계산
  auditResults.summary.totalSize = auditResults.largeModules.reduce((sum, module) => sum + module.size, 0);
  auditResults.summary.totalSizeFormatted = `${Math.round(auditResults.summary.totalSize / 1024 / 1024 * 100) / 100} MB`;
  
  // 보고서 저장
  fs.writeFileSync(
    argv.output, 
    JSON.stringify(auditResults, null, 2)
  );
  
  spinner.succeed(`감사 보고서가 ${argv.output}에 저장되었습니다.`);
  
  // 콘솔에 요약 표시
  console.log('\n' + chalk.cyan.bold('📊 모듈 감사 요약 📊'));
  console.log(chalk.gray('─'.repeat(50)));
  console.log(`${chalk.blue('•')} 총 모듈 수: ${chalk.white(auditResults.summary.totalModules)}`);
  console.log(`${chalk.blue('•')} 사용되지 않는 모듈: ${chalk.yellow(auditResults.summary.unusedModules)}`);
  console.log(`${chalk.blue('•')} 큰 모듈 (>${argv.threshold}KB): ${chalk.yellow(auditResults.summary.largeModules)}`);
  console.log(`${chalk.blue('•')} 깊은 종속성 체인: ${chalk.yellow(auditResults.summary.deepDependencies)}`);
  console.log(`${chalk.blue('•')} 자동 수정 가능 문제: ${chalk.green(auditResults.summary.fixableIssues)}`);
  console.log(`${chalk.blue('•')} 큰 모듈 총 크기: ${chalk.magenta(auditResults.summary.totalSizeFormatted)}`);
  console.log(chalk.gray('─'.repeat(50)));
  
  if (auditResults.unusedModules.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️  사용되지 않는 모듈 상위 5개:'));
    auditResults.unusedModules.slice(0, 5).forEach(module => {
      console.log(`  ${chalk.gray('•')} ${module.file} (${Math.round(module.size / 1024)}KB)`);
    });
  }
  
  if (auditResults.largeModules.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️  큰 모듈 상위 5개:'));
    auditResults.largeModules.slice(0, 5).forEach(module => {
      console.log(`  ${chalk.gray('•')} ${module.file} (${module.sizeKB}KB)`);
    });
  }
  
  console.log('\n' + chalk.blue.bold('ℹ️  더 자세한 정보는 보고서 파일을 확인하세요.'));
}

/**
 * 모듈 의존성 통계를 콘솔에 시각화합니다.
 * @param {Object} auditResults 감사 결과 객체
 */
function visualizeAuditResults(auditResults) {
  const { summary } = auditResults;
  
  // 헤더
  console.log('\n');
  log.info('📊 모듈 의존성 감사 결과 요약');
  console.log('═══════════════════════════════════════════════════');
  
  // 전체 모듈 통계
  const totalModules = summary.moduleCount || 0;
  const unusedModules = summary.unusedModules || 0;
  const unusedPercentage = totalModules ? ((unusedModules / totalModules) * 100).toFixed(1) : 0;
  
  console.log(`📦 전체 모듈 수: ${totalModules}`);
  console.log(`🚫 사용되지 않는 모듈: ${unusedModules} (${unusedPercentage}%)`);
  
  // 의존성 통계
  const largeModules = summary.largeModules || 0;
  const deepDeps = summary.deepDependencies || 0;
  const circularDeps = summary.circularDependencies || 0;
  
  console.log('\n🔍 의존성 문제점:');
  console.log(`   - 거대 모듈 (>${argv.threshold || 500} 줄): ${largeModules}`);
  console.log(`   - 깊은 의존성 체인 (≥8 모듈): ${deepDeps}`);
  console.log(`   - 순환 의존성: ${circularDeps}`);
  
  // 막대 그래프 생성 함수
  const createBar = (value, max, width = 40) => {
    const maxBarLength = width;
    const barLength = Math.ceil((value / max) * maxBarLength);
    const bar = '█'.repeat(barLength) + '░'.repeat(maxBarLength - barLength);
    return bar;
  };
  
  // 의존성 문제 시각화
  if (totalModules > 0) {
    const maxIssues = Math.max(largeModules, deepDeps, circularDeps, 1);
    
    console.log('\n📉 문제점 분포:');
    console.log(`거대 모듈    | ${createBar(largeModules, maxIssues)} ${largeModules}`);
    console.log(`깊은 의존성  | ${createBar(deepDeps, maxIssues)} ${deepDeps}`);
    console.log(`순환 의존성  | ${createBar(circularDeps, maxIssues)} ${circularDeps}`);
  }
  
  // 개선 가능한 문제
  const fixableIssuesCount = summary.fixableIssues || 0;
  
  console.log('\n🛠️  개선 가능한 문제:');
  console.log(`   총 ${fixableIssuesCount}개의 자동 수정 가능한 문제가 발견되었습니다.`);
  
  // 전체 건강 점수 계산 (100점 만점)
  let healthScore = 100;
  
  // 사용되지 않는 모듈 (최대 -20점)
  if (totalModules > 0) {
    healthScore -= Math.min(20, (unusedModules / totalModules) * 100);
  }
  
  // 순환 의존성 (각 케이스마다 -5점, 최대 -30점)
  healthScore -= Math.min(30, circularDeps * 5);
  
  // 깊은 의존성 체인 (각 케이스마다 -2점, 최대 -20점)
  healthScore -= Math.min(20, deepDeps * 2);
  
  // 큰 모듈 (각 케이스마다 -2점, 최대 -20점)
  healthScore -= Math.min(20, largeModules * 2);
  
  // 최종 점수는 0 이상이어야 함
  healthScore = Math.max(0, Math.round(healthScore));
  
  // 건강 상태에 따른 등급 부여
  let grade, color;
  if (healthScore >= 90) {
    grade = 'A';
    color = chalk.green;
  } else if (healthScore >= 80) {
    grade = 'B';
    color = chalk.greenBright;
  } else if (healthScore >= 70) {
    grade = 'C';
    color = chalk.yellow;
  } else if (healthScore >= 60) {
    grade = 'D';
    color = chalk.yellowBright;
  } else {
    grade = 'F';
    color = chalk.red;
  }
  
  console.log('\n');
  console.log('═══════════════════════════════════════════════════');
  console.log(`💯 코드베이스 건강 점수: ${color(`${healthScore}/100 (등급: ${grade})`)}`);
  
  // 권장 개선 사항
  console.log('\n📝 권장 개선 사항:');
  
  if (unusedModules > 0) {
    console.log(` - 사용하지 않는 ${unusedModules}개 모듈 제거 검토`);
  }
  
  if (circularDeps > 0) {
    console.log(` - ${circularDeps}개의 순환 의존성 해결`);
  }
  
  if (deepDeps > 0) {
    console.log(` - ${deepDeps}개의 깊은 의존성 체인 단순화`);
  }
  
  if (largeModules > 0) {
    console.log(` - ${largeModules}개의 거대 모듈 리팩토링`);
  }
  
  console.log('\n자세한 문제 목록은 위 로그를 참조하세요.');
  console.log('═══════════════════════════════════════════════════\n');
}

/**
 * 메인 함수
 */
async function main() {
  log.info(`모듈 감사 시작: ${argv.dir}`);
  
  try {
    const allModules = findAllModules(argv.dir);
    
    if (allModules.length === 0) {
      log.error('분석할 모듈을 찾을 수 없습니다.');
      process.exit(1);
    }
    
    await identifyUnusedModules(allModules);
    await analyzeLargeModules(allModules, argv.threshold);
    await analyzeDeepDependencyChains(allModules);
    await detectCircularDependencies(allModules);
    const fixableIssues = await identifyFixableIssues();
    
    if (argv.fix) {
      await applyFixes(fixableIssues);
    }
    
    await generateReport();
    
    // 최종 결과 시각화
    visualizeAuditResults(auditResults);
    
    log.success('모듈 감사가 완료되었습니다!');
    
    // 심각한 문제가 있을 경우 종료 코드 설정
    if (auditResults.summary.unusedModules > 10 || auditResults.summary.largeModules > 5) {
      process.exit(1);
    }
    
  } catch (error) {
    log.error(`모듈 감사 중 오류 발생: ${error.message}`);
    process.exit(1);
  }
}

// 스크립트 실행
main(); 