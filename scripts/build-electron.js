/**
 * Electron 애플리케이션 빌드 스크립트
 * 
 * API 라우트를 프론트엔드와 분리하여 
 * 정적 파일(dist)과 서버 코드(server)로 구성합니다.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 빌드 프로세스 시작
console.log('Electron 애플리케이션 빌드 시작...');

try {
    // 기존 빌드 폴더 정리
    console.log('빌드 폴더 정리 중...');
    execSync('npm run clean', { stdio: 'inherit' });

    // Next.js 앱 빌드 (프론트엔드)
    console.log('Next.js 프론트엔드 빌드 중...');
    execSync('next build', { stdio: 'inherit' });

    // 정적 파일 내보내기
    console.log('정적 파일 내보내기 중...');
    execSync('next export -o dist', { stdio: 'inherit' });

    // API 라우트 및 서버 코드 복사
    console.log('서버 코드 준비 중...');

    // server 폴더 생성
    if (!fs.existsSync('./dist/server')) {
        fs.mkdirSync('./dist/server', { recursive: true });
    }

    // 서버 코드 복사 함수
    const copyServerFiles = (src, dest) => {
        if (!fs.existsSync(src)) return;

        const entries = fs.readdirSync(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            if (entry.isDirectory()) {
                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath, { recursive: true });
                }
                copyServerFiles(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    };

    // .next/server/app/api 폴더 복사
    copyServerFiles('./.next/server/app/api', './dist/server/api');

    // src/server 폴더 복사
    copyServerFiles('./src/server', './dist/server');

    console.log('빌드 완료!');
} catch (error) {
    console.error('빌드 중 오류 발생:', error);
    process.exit(1);
}
