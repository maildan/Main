#!/bin/bash

# Loop MCP 서버 시작 스크립트
echo "🚀 Loop MCP 서버 시작하기"

# 현재 디렉토리 확인
cd "$(dirname "$0")"

# 필요한 패키지 확인 및 설치
echo "📦 필요한 패키지 확인 중..."
if ! npm list express &> /dev/null || ! npm list cors &> /dev/null || ! npm list body-parser &> /dev/null; then
  echo "필요한 패키지 설치 중..."
  npm install express cors body-parser
fi

# 기존 프로세스 정리
echo "🧹 실행 중인 MCP 서버 정리 중..."
pkill -f "node mcp-server.js" || true

# MCP 서버 시작
echo "🔄 Loop MCP 서버 시작 중..."
nohup node mcp-server.js > mcp-server.log 2>&1 &
SERVER_PID=$!
echo "✅ Loop MCP 서버 시작됨 (PID: $SERVER_PID, 로그: mcp-server.log)"

# MCP 서버 파일 확인
if [ -f mcp.json ]; then
  echo "✅ MCP 설정 파일 확인됨: mcp.json"
else
  echo "❌ MCP 설정 파일을 찾을 수 없습니다."
fi

# 서버가 실행 중인지 확인
sleep 2
if ps -p $SERVER_PID > /dev/null; then
  echo "✅ 서버가 정상적으로 실행 중입니다."
else
  echo "❌ 서버 시작 중 문제가 발생했습니다. 로그 파일을 확인하세요."
  tail -n 20 mcp-server.log
  exit 1
fi

# 브라우저로 서버 테스트
echo ""
echo "🔍 실행 중인 MCP 서버 확인:"
ps aux | grep "node mcp-server.js" | grep -v grep

echo ""
echo "🌐 접속 정보:"
echo "- MCP 서버: http://localhost:3030/"
echo "- VS Code API: http://localhost:3030/v1/chat/completions"
echo ""
echo "VS Code에서 MCP 사용을 위해 .vscode/settings.json 설정을 확인하세요."
echo "설정 경로: vscode.mcp.path = \"/Users/user/loop/loop_3/mcp.json\""