#!/bin/bash

# VS Code MCP 서버 설치 스크립트
echo "🚀 VS Code MCP 서버 설치 시작"

# 현재 디렉토리 확인
cd "$(dirname "$0")"

# 필요한 패키지 설치
echo "📦 필요한 패키지 설치 중..."
npm install

# MCP 서버 설치 확인
echo "✅ MCP 서버 설치 완료"
echo ""
echo "다음 명령어로 서버 관리자를 실행할 수 있습니다:"
echo "node index.js"
echo ""
echo "또는 모든 서버를 한 번에 시작하려면:"
echo "node start-all-servers.js"
