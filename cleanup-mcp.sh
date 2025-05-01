#!/bin/bash

# MCP 서버 정리 스크립트
echo "🧹 기존 MCP 서버 프로세스 정리 중..."

# 모든 관련 프로세스 종료
pkill -f "node mcp-server.js" || true
pkill -f "browser-tools-server" || true
pkill -f "browsermcp" || true
pkill -f "server-filesystem" || true
pkill -f "server-sequential-thinking" || true
pkill -f "figma-mcp" || true
pkill -f "desktop-commander" || true

echo "✅ MCP 서버 프로세스 정리 완료"