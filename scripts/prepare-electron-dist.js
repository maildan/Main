/**
 * prepare-electron-dist.js
 * 
 * Next.js 빌드 결과물을 Electron에서 참조할 수 있는 구조로 준비합니다.
 * 이 스크립트는 다음 작업을 수행합니다:
 * 1. dist 디렉토리가 없으면 생성
 * 2. Next.js 빌드 결과물을 dist에 복사
 * 3. index.html 생성
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const nextDir = path.join(rootDir, '.next');
const distDir = path.join(rootDir, 'dist');
const nextConfigPath = path.join(rootDir, 'next.config.js');

async function prepareElectronDist() {
  console.log('Electron 배포 준비 중...');

  // Next.js 빌드 전 next.config.js 확인 및 수정
  console.log('Next.js 설정 확인 중...');
  let nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
  
  // output: 'export' 설정 확인 (Next.js 14 정적 내보내기에 필요)
  if (!nextConfigContent.includes('output: \'export\'')) {
    console.log('next.config.js에 output: export 설정 추가 중...');
    nextConfigContent = nextConfigContent.replace(
      /const nextConfig = {/,
      'const nextConfig = {\n  output: \'export\','
    );
    
    // experimental.esmExternals 설정 확인 및 추가
    if (!nextConfigContent.includes('esmExternals')) {
      nextConfigContent = nextConfigContent.replace(
        /const nextConfig = {/,
        'const nextConfig = {\n  experimental: {\n    esmExternals: false,\n  },'
      );
    }
    
    fs.writeFileSync(nextConfigPath, nextConfigContent, 'utf8');
    console.log('next.config.js 업데이트 완료');
  }

  try {
    // Next.js 빌드 실행
    console.log('Next.js 앱 빌드 중...');
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    
    // dist 폴더가 존재하는지 확인
    if (!fs.existsSync(distDir)) {
      throw new Error('dist 폴더를 찾을 수 없습니다. 빌드가 실패했을 수 있습니다.');
    }
    
    // 필요한 파일 복사
    console.log('Electron 메인 프로세스 파일 복사 중...');
    fs.copySync(path.join(rootDir, 'src', 'main'), path.join(distDir, 'main'));
    fs.copySync(path.join(rootDir, 'package.json'), path.join(distDir, 'package.json'));
    
    // package.json에서 불필요한 devDependencies 제거
    const packageJson = fs.readJsonSync(path.join(distDir, 'package.json'));
    delete packageJson.devDependencies;
    // 필요한 dependencies만 남기기
    const prodDeps = {
      electron: packageJson.dependencies.electron,
      'electron-serve': packageJson.dependencies['electron-serve']
    };
    packageJson.dependencies = prodDeps;
    fs.writeJsonSync(path.join(distDir, 'package.json'), packageJson, { spaces: 2 });
    
    console.log('Electron 앱 배포 준비 완료!');
  } catch (error) {
    console.error('배포 준비 중 오류 발생:', error);
    process.exit(1);
  }
}

prepareElectronDist().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});

/**
 * 디렉토리를 재귀적으로 복사하는 유틸리티 함수
 */
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  entries.forEach(entry => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

/**
 * Electron 애플리케이션을 위한 index.html 파일 생성
 */
function createIndexHtml() {
  // 필요한 JavaScript 파일 찾기
  let mainJsFile = '';
  let polyfillsFile = '';
  
  if (fs.existsSync(distChunksDir)) {
    const jsFiles = fs.readdirSync(distChunksDir).filter(file => file.endsWith('.js'));
    
    // 특정 파일명 패턴 찾기
    const mainJsPattern = /^(main|app-pages-browser|app-pages-internals|main-app).*\.js$/;
    const polyfillsPattern = /^(polyfills|framework|webpack).*\.js$/;
    
    mainJsFile = jsFiles.find(file => mainJsPattern.test(file)) || '';
    polyfillsFile = jsFiles.find(file => polyfillsPattern.test(file)) || '';
    
    console.log(`메인 JS 파일: ${mainJsFile || '찾지 못함'}`);
    console.log(`폴리필 JS 파일: ${polyfillsFile || '찾지 못함'}`);
  }
  
  // CSS 파일 찾기
  let mainCssFile = '';
  if (fs.existsSync(distCssDir)) {
    const cssFiles = fs.readdirSync(distCssDir).filter(file => file.endsWith('.css'));
    if (cssFiles.length > 0) {
      mainCssFile = cssFiles[0];
      console.log(`CSS 파일: ${mainCssFile || '찾지 못함'}`);
    }
  }
  
  // 만약 메인 JS 파일을 찾지 못했다면 웹팩 파일 직접 찾기
  if (!mainJsFile && fs.existsSync(path.join(nextStaticDir, 'webpack'))) {
    try {
      // 웹팩 디렉토리에서 JS 파일 복사
      const webpackDir = path.join(nextStaticDir, 'webpack');
      const distWebpackDir = path.join(staticDir, 'webpack');
      
      if (!fs.existsSync(distWebpackDir)) {
        fs.mkdirSync(distWebpackDir, { recursive: true });
      }
      
      const webpackFiles = fs.readdirSync(webpackDir).filter(file => file.endsWith('.js'));
      for (const file of webpackFiles) {
        const srcPath = path.join(webpackDir, file);
        const destPath = path.join(distWebpackDir, file);
        fs.copyFileSync(srcPath, destPath);
        console.log(`  - webpack/${file}`);
      }
      
      // 특정 파일 강제 지정
      if (fs.existsSync(path.join(distChunksDir, 'main-app.js'))) {
        mainJsFile = 'main-app.js';
      } else if (fs.existsSync(path.join(distChunksDir, 'webpack.js'))) {
        // webpack.js가 있다면 이를 사용
        mainJsFile = 'webpack.js';
      }
    } catch (err) {
      console.error('웹팩 파일 복사 중 오류:', err);
    }
  }
  
  // Next.js 앱 초기화를 위해 필요한 HTML 생성
  let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
  <title>Loop 3</title>
  ${mainCssFile ? `<link rel="stylesheet" href="static/css/${mainCssFile}">` : ''}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #f5f5f5;
      color: #333;
    }
    #__next {
      height: 100vh;
      width: 100vw;
      display: flex;
      flex-direction: column;
    }
    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      width: 100vw;
      flex-direction: column;
    }
    .loading-text {
      margin-top: 20px;
      font-size: 18px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .spinner {
      border: 5px solid #f3f3f3;
      border-top: 5px solid #3498db;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
    }
  </style>
</head>
<body>
  <div id="__next">
    <div class="loading">
      <div class="spinner"></div>
      <div class="loading-text">앱을 로딩 중입니다...</div>
    </div>
  </div>
  
  <script>
    // Electron 통합 스크립트
    window.electron = window.electron || {};
    
    // 개발 모드 감지
    const isDev = window.location.hostname === 'localhost';
    
    // 오류 처리
    window.addEventListener('error', (event) => {
      console.error('앱 오류:', event.error);
    });
    
    // Next.js 앱 로딩 상태 표시
    window.addEventListener('DOMContentLoaded', () => {
      console.log('DOM이 로드되었습니다.');
    });
  </script>
  
  ${polyfillsFile ? `<script src="static/chunks/${polyfillsFile}"></script>` : ''}
  ${mainJsFile ? `<script src="static/chunks/${mainJsFile}"></script>` : ''}
</body>
</html>`;

  // index.html 파일 쓰기
  fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);
  console.log('📄 index.html 파일이 생성되었습니다.');
} 