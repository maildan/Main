const fs = require('fs');
const path = require('path');

// 처리할 디렉토리 경로
const mainDir = path.resolve(__dirname, '..', 'src', 'main');

function fixImportsInFile(filePath) {
  console.log(`파일 처리 중: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // require 경로 수정하여 .cjs 확장자 추가
  const updatedContent = content.replace(
    /require\(['"](\.{1,2}\/[^'"]+)['"]?\)/g,
    (match, requirePath) => {
      // 이미 .cjs 확장자가 있거나 외부 패키지인 경우 수정하지 않음
      if (requirePath.endsWith('.cjs') || !requirePath.startsWith('.')) {
        return match;
      }
      return `require('${requirePath}.cjs')`;
    }
  );
  
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent);
    console.log(`  - 수정됨: ${filePath}`);
    return true;
  }
  return false;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.cjs')) {
      fixImportsInFile(filePath);
    }
  }
}

processDirectory(mainDir);
console.log('모든 CJS 파일의 import 경로가 수정되었습니다.');
