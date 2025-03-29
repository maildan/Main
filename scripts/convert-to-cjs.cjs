/**
 * CommonJS 파일들의 확장자를 .cjs로 변환하는 스크립트
 */
const fs = require('fs');
const path = require('path');

// 처리할 디렉토리 경로
const mainDir = path.resolve(__dirname, '..', 'src', 'main');
const preloadDir = path.resolve(__dirname, '..', 'src', 'preload');

// 파일 확장자 변경 함수
function renameJsToCjs(dirPath) {
  console.log(`디렉토리 처리 중: ${dirPath}`);
  
  // 디렉토리의 모든 파일 읽기
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // 재귀적으로 하위 디렉토리 처리
      renameJsToCjs(filePath);
    } else if (file.endsWith('.js')) {
      // .js 파일을 .cjs로 변경
      const newFilePath = filePath.replace(/\.js$/, '.cjs');
      console.log(`파일 변환: ${filePath} -> ${newFilePath}`);
      
      // 파일 내용 읽기
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 파일 콘텐츠에서 import 구문 확인
      const hasImport = content.includes('import ') && (
        content.includes(' from ') ||
        content.match(/import\s*{[^}]*}\s*from/)
      );
      
      if (hasImport) {
        console.log(`  ⚠️ 경고: ${file}에 import 구문이 있습니다. 수동 변환이 필요할 수 있습니다.`);
      }
      
      // 파일 이름 변경
      fs.renameSync(filePath, newFilePath);
      
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
  }
}

// 메인 함수
function main() {
  console.log('CommonJS 파일 확장자 변환 시작...');
  
  // main 디렉토리 처리
  if (fs.existsSync(mainDir)) {
    renameJsToCjs(mainDir);
  } else {
    console.log(`⚠️ 경로를 찾을 수 없음: ${mainDir}`);
  }
  
  // preload 디렉토리 처리
  if (fs.existsSync(preloadDir)) {
    renameJsToCjs(preloadDir);
  } else {
    console.log(`⚠️ 경로를 찾을 수 없음: ${preloadDir}`);
  }
  
  console.log('변환 완료!');
  console.log('⚠️ 주의: package.json의 scripts에서 참조하는 경로가 있다면 수동으로 업데이트해야 합니다.');
}

// 스크립트 실행
main();
