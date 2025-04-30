#!/usr/bin/env node

/**
 * 중복 코드 탐지 및 수정 스크립트
 * 
 * 프로젝트 내에서 중복 정의된 함수나 유형을 찾아 리팩토링을 돕습니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC_DIR = path.join(__dirname, '..', 'src');
const ignoreDirs = ['node_modules', '.next', 'dist', '.git', 'coverage'];
const targetExtensions = ['.ts', '.tsx', '.js', '.jsx'];

// 함수 정의를 찾기 위한 정규식
const functionDefRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g;
// 인터페이스/타입 정의를 찾기 위한 정규식
const typeDefRegex = /(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_]+)(?:\s*<[^>]*>)?\s*(?:{|=)/g;

/**
 * 파일에서 함수와 타입 정의를 추출합니다.
 */
function extractDefinitions(filePath, content) {
  const definitions = {
    functions: [],
    types: []
  };
  
  // 함수 정의 추출
  let match;
  while ((match = functionDefRegex.exec(content)) !== null) {
    definitions.functions.push({
      name: match[1],
      file: filePath,
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  // 타입 정의 추출
  while ((match = typeDefRegex.exec(content)) !== null) {
    definitions.types.push({
      name: match[1],
      file: filePath,
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return definitions;
}

/**
 * 프로젝트의 모든 파일을 재귀적으로 스캔합니다.
 */
function scanDirectory(dir, fileCallback) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    
    if (file.isDirectory()) {
      if (!ignoreDirs.includes(file.name)) {
        scanDirectory(fullPath, fileCallback);
      }
      continue;
    }
    
    const ext = path.extname(file.name);
    if (targetExtensions.includes(ext)) {
      fileCallback(fullPath);
    }
  }
}

/**
 * 중복 정의를 찾습니다.
 */
function findDuplicateDefinitions() {
  const allDefinitions = {
    functions: {},
    types: {}
  };
  
  // 모든 파일 스캔
  scanDirectory(SRC_DIR, (filePath) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const defs = extractDefinitions(filePath, content);
      
      // 함수 정의 수집
      defs.functions.forEach(func => {
        if (!allDefinitions.functions[func.name]) {
          allDefinitions.functions[func.name] = [];
        }
        allDefinitions.functions[func.name].push({
          file: filePath,
          line: func.line
        });
      });
      
      // 타입 정의 수집
      defs.types.forEach(type => {
        if (!allDefinitions.types[type.name]) {
          allDefinitions.types[type.name] = [];
        }
        allDefinitions.types[type.name].push({
          file: filePath,
          line: type.line
        });
      });
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error);
    }
  });
  
  // 중복 정의 찾기
  const duplicates = {
    functions: [],
    types: []
  };
  
  // 중복 함수
  Object.entries(allDefinitions.functions).forEach(([name, locations]) => {
    if (locations.length > 1) {
      duplicates.functions.push({
        name,
        locations
      });
    }
  });
  
  // 중복 타입
  Object.entries(allDefinitions.types).forEach(([name, locations]) => {
    if (locations.length > 1) {
      duplicates.types.push({
        name,
        locations
      });
    }
  });
  
  return duplicates;
}

/**
 * 결과를 표시하고 권장사항을 출력합니다.
 */
function displayResults(duplicates) {
  console.log('\n===== 중복 함수 정의 =====');
  if (duplicates.functions.length > 0) {
    duplicates.functions.forEach(dup => {
      console.log(`\n함수 '${dup.name}'이(가) ${dup.locations.length}개의 파일에서 발견되었습니다:`);
      dup.locations.forEach(loc => {
        console.log(`  - ${loc.file}:${loc.line}`);
      });
      console.log('\n권장사항: 이 함수를 공통 유틸리티로 이동하고 중복을 제거하세요.');
    });
  } else {
    console.log('중복된 함수 정의가 없습니다.');
  }
  
  console.log('\n===== 중복 타입 정의 =====');
  if (duplicates.types.length > 0) {
    duplicates.types.forEach(dup => {
      console.log(`\n타입 '${dup.name}'이(가) ${dup.locations.length}개의 파일에서 발견되었습니다:`);
      dup.locations.forEach(loc => {
        console.log(`  - ${loc.file}:${loc.line}`);
      });
      console.log('\n권장사항: 이 타입을 중앙 타입 파일로 이동하고 중복을 제거하세요.');
    });
  } else {
    console.log('중복된 타입 정의가 없습니다.');
  }
  
  console.log('\n===== 요약 =====');
  console.log(`중복된 함수: ${duplicates.functions.length}`);
  console.log(`중복된 타입: ${duplicates.types.length}`);
}

/**
 * 메인 실행 함수
 */
function main() {
  console.log('중복 코드 검색 중...');
  const duplicates = findDuplicateDefinitions();
  displayResults(duplicates);
  
  // 자동 수정 제안
  if (duplicates.functions.length > 0 || duplicates.types.length > 0) {
    console.log('\n중복 코드를 자동으로 수정하려면:');
    console.log('1. 공통 유틸리티 파일을 만들고 (예: src/utils/common-utils.ts)');
    console.log('2. 중복된 함수/타입을 이 파일로 이동하세요.');
    console.log('3. 원래 위치에서는 해당 파일을 임포트하여 사용하세요.\n');
  }
}

// 스크립트 실행
main();
