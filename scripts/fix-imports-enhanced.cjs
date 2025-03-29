const fs = require('fs');
const path = require('path');

// 처리할 디렉토리 경로
const mainDir = path.resolve(__dirname, '..', 'src', 'main');

function fixImportsInFile(filePath) {
  console.log(`파일 처리 중: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 다양한 형태의 require 패턴 처리
  let updatedContent = content.replace(
    /require\(['"]([^'"]*\/[^'"./]*)['"]?\)/g,
    (match, requirePath) => {
      // 외부 패키지인 경우 또는 이미 확장자가 있는 경우
      if (!requirePath.startsWith('.') || /\.(js|cjs|mjs|json)$/.test(requirePath)) {
        return match;
      }
      return `require('${requirePath}.cjs')`;
    }
  );
  
  // './module' 형식의 상대 경로 처리
  updatedContent = updatedContent.replace(
    /require\(['"](\.\/[^'"./]*)(\/[^'"]*)?['"]?\)/g,
    (match, base, rest) => {
      // 이미 확장자가 있는 경우
      if (rest && /\.(js|cjs|mjs|json)$/.test(rest)) {
        return match;
      }
      return `require('${base}${rest || ''}.cjs')`;
    }
  );
  
  // '../module' 형식의 상대 경로 처리
  updatedContent = updatedContent.replace(
    /require\(['"](\.\.\/[^'"]*?)['"]?\)/g,
    (match, requirePath) => {
      // 이미 확장자가 있는 경우
      if (/\.(js|cjs|mjs|json)$/.test(requirePath)) {
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

console.log('개선된 CJS import 수정 스크립트 실행 중...');
processDirectory(mainDir);
console.log('모든 CJS 파일의 import 경로가 수정되었습니다.');
