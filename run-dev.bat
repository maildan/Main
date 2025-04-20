@echo off
echo 개발 환경 시작 중...

REM Next.js 서버 시작
start cmd /k "npm run server"

REM 5초 대기
echo Next.js 서버 초기화 중, 5초 대기...
timeout /t 5 /nobreak > nul

REM Electron 앱 시작
start cmd /k "npm run electron"

echo 개발 환경이 시작되었습니다. 두 개의 명령 프롬프트 창에서 로그를 확인하세요. 