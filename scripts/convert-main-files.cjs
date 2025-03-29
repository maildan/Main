/**
 * src/main 및 preload 디렉토리의 모든 JS 파일을 CJS로 변환
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 처리할 디렉토리 경로
const mainDir = path.resolve(__dirname, '..', 'src', 'main');
const preloadDir = path.resolve(__dirname, '..', 'src', 'preload');
const serverDir = path.resolve(__dirname, '..', 'src', 'server');

// 파일 확장자 변경 함수
function renameJsToCjs(dirPath) {
  console.log(`🔍 디렉토리 처리 중: ${dirPath}`);
  
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️ 디렉토리가 존재하지 않음: ${dirPath}`);
    return;
  }
  
  // 디렉토리의 모든 파일 읽기
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    
    try {
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // 재귀적으로 하위 디렉토리 처리
        renameJsToCjs(filePath);
      } else if (file.endsWith('.js') && !file.endsWith('.config.js')) {
        // .js 파일을 .cjs로 변경
        const newFilePath = filePath.replace(/\.js$/, '.cjs');
        console.log(`✏️ 파일 변환: ${filePath} -> ${newFilePath}`);
        
        // 파일 내용 읽기
        const content = fs.readFileSync(filePath, 'utf8');
        
        // 파일 콘텐츠에서 import 구문 확인
        const hasImport = content.includes('import ') && (
          content.includes(' from ') ||
          content.match(/import\s*{[^}]*}\s*from/)
        );
        
        if (hasImport) {
          console.log(`  ⚠️ 경고: ${file}에 import 구문이 있습니다. 수동 변환이 필요할 수 있습니다.`);
          continue; // import 구문이 있는 파일은 건너뜁니다
        }
        
        // 파일 이름 변경 및 복사
        fs.copyFileSync(filePath, newFilePath);
        fs.unlinkSync(filePath); // 원본 파일 삭제
        
        // require 경로 업데이트 
        const updatedContent = content.replace(
          /require\(['"](\.{1,2}\/[^'"]+)\.js['"]\)/g, 
          "require('$1.cjs')"
        );
        
        // 내용 저장
        if (content !== updatedContent) {
          fs.writeFileSync(newFilePath, updatedContent);
          console.log(`  ✅ require 경로 수정됨`);
        }
      }
    } catch (error) {
      console.error(`  ❌ 오류 (${filePath}): ${error.message}`);
    }
  }
}

// main.cjs 파일 업데이트
function updateMainFile() {
  const mainFilePath = path.resolve(__dirname, '..', 'main.cjs');
  
  if (!fs.existsSync(mainFilePath)) {
    console.error(`❌ main.cjs 파일을 찾을 수 없습니다: ${mainFilePath}`);
    return;
  }
  
  console.log('🔄 main.cjs 파일 업데이트 중...');
  
  try {
    let content = fs.readFileSync(mainFilePath, 'utf8');
    content = content.replace(
      /require\(['"](\.\/src\/main\/[^'"]+)\.js['"]\)/g,
      "require('$1.cjs')"
    );
    
    fs.writeFileSync(mainFilePath, content);
    console.log('✅ main.cjs 파일 업데이트 완료');
  } catch (error) {
    console.error(`❌ main.cjs 파일 업데이트 오류: ${error.message}`);
  }
}

// 메인 함수
function main() {
  console.log('🚀 CommonJS 파일 확장자 변환 시작...');
  
  // main 디렉토리 처리
  renameJsToCjs(mainDir);
  
  // preload 디렉토리 처리
  renameJsToCjs(preloadDir);
  
  // server 디렉토리 처리
  renameJsToCjs(serverDir);
  
  // main.cjs 파일 업데이트
  updateMainFile();
  
  console.log('✅ 변환 완료!');
  console.log('⚠️ 주의: package.json과 다른 참조 파일에서 경로 업데이트가 필요할 수 있습니다.');
}

// 스크립트 실행
main();
