#!/bin/bash

# 필요한 MCP 서버들을 VS Code용으로 설치하는 스크립트
echo "🚀 VS Code용 MCP 서버 설치 시작"

# 현재 디렉토리 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
cd "$SCRIPT_DIR"

# MCP 서버 디렉토리 생성
MCP_DIR="$SCRIPT_DIR/vscode-mcp-servers"
mkdir -p "$MCP_DIR"
cd "$MCP_DIR"

echo "📁 MCP 서버 디렉토리 생성됨: $MCP_DIR"

# 기존 프로세스 정리
echo "🧹 실행 중인 MCP 서버 프로세스 정리 중..."
pkill -f "mcp-server.js" || true
pkill -f "browser-tools-server" || true
pkill -f "browsermcp" || true
pkill -f "server-filesystem" || true
pkill -f "server-sequential-thinking" || true
pkill -f "figma-mcp" || true
pkill -f "desktop-commander" || true
pkill -f "smithery-toolbox" || true

# package.json 파일 생성
echo "📝 package.json 파일 생성 중..."
cat > package.json << 'EOF'
{
  "name": "vscode-mcp-servers",
  "version": "1.0.0",
  "description": "VS Code MCP 서버 모음",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "start:fs": "npx @mcp/server-filesystem",
    "start:seq": "npx @mcp/server-sequential-thinking",
    "start:browser": "npx @browsermcp/mcp@latest",
    "start:tools": "npx @agentdeskai/browser-tools-server",
    "start:figma": "npx @figmamcp/mcp",
    "start:desktop": "npx @mcp/desktop-commander",
    "start:smithery": "npx @smithery/toolbox",
    "start:all": "node start-all-servers.js"
  },
  "dependencies": {
    "@agentdeskai/browser-tools-server": "latest",
    "@browsermcp/mcp": "latest",
    "@mcp/server-filesystem": "latest",
    "@mcp/server-sequential-thinking": "latest", 
    "@figmamcp/mcp": "latest",
    "@mcp/desktop-commander": "latest",
    "@smithery/toolbox": "latest",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2"
  }
}
EOF

# index.js 생성 - 메인 서버 파일
echo "📝 index.js 파일 생성 중..."
cat > index.js << 'EOF'
// MCP 서버 관리자
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');
const { join } = require('path');

// 서버 설정
const app = express();
const PORT = process.env.PORT || 3333;
const servers = [];

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// MCP 서버 구성
const MCP_SERVERS = [
  {
    id: 'fs-server',
    name: 'Filesystem Server',
    command: 'npm',
    args: ['run', 'start:fs'],
    port: 8001,
    url: 'http://localhost:8001/mcp',
    readyMessage: 'Server is running',
    running: false,
    process: null
  },
  {
    id: 'seq-server',
    name: 'Sequential Thinking Server',
    command: 'npm',
    args: ['run', 'start:seq'],
    port: 8002,
    url: 'http://localhost:8002/mcp',
    readyMessage: 'Server is running',
    running: false,
    process: null
  },
  {
    id: 'browser-server',
    name: 'Browser MCP Server',
    command: 'npm',
    args: ['run', 'start:browser'],
    port: 8003,
    url: 'http://localhost:8003/mcp',
    readyMessage: 'Server is running',
    running: false,
    process: null
  },
  {
    id: 'browser-tools-server',
    name: 'Browser Tools Server',
    command: 'npm',
    args: ['run', 'start:tools'],
    port: 8004,
    url: 'http://localhost:8004',
    readyMessage: 'Server is running',
    running: false,
    process: null
  },
  {
    id: 'figma-server',
    name: 'Figma MCP Server',
    command: 'npm',
    args: ['run', 'start:figma'],
    port: 8005,
    url: 'http://localhost:8005/mcp',
    readyMessage: 'Server is running',
    running: false,
    process: null
  },
  {
    id: 'desktop-server',
    name: 'Desktop Commander Server',
    command: 'npm',
    args: ['run', 'start:desktop'],
    port: 8006,
    url: 'http://localhost:8006/mcp',
    readyMessage: 'Server is running',
    running: false,
    process: null
  },
  {
    id: 'smithery-server',
    name: 'Smithery Toolbox Server',
    command: 'npm',
    args: ['run', 'start:smithery'],
    port: 8007,
    url: 'http://localhost:8007/mcp',
    readyMessage: 'Server is running',
    running: false,
    process: null
  }
];

// 서버 시작 함수
function startServer(server) {
  if (server.running) return;
  
  console.log(`Starting ${server.name}...`);
  
  server.process = spawn(server.command, server.args, {
    cwd: process.cwd(),
    env: { ...process.env, PORT: server.port },
    shell: true
  });
  
  // 출력 로깅
  server.process.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[${server.name}] ${output}`);
    
    // 서버가 준비되었는지 확인
    if (output.includes(server.readyMessage)) {
      server.running = true;
      console.log(`✅ ${server.name} is now running on port ${server.port}`);
    }
  });
  
  server.process.stderr.on('data', (data) => {
    console.error(`[${server.name} ERROR] ${data.toString()}`);
  });
  
  server.process.on('close', (code) => {
    console.log(`${server.name} process exited with code ${code}`);
    server.running = false;
    server.process = null;
  });
  
  servers.push(server);
}

// API 라우트 설정
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>MCP 서버 관리자</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .server-list { margin-top: 20px; }
          .server-item { padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; }
          .running { background-color: #e6f7e6; }
          .not-running { background-color: #f7e6e6; }
        </style>
      </head>
      <body>
        <h1>MCP 서버 관리자</h1>
        <div class="server-list">
          ${MCP_SERVERS.map(server => `
            <div class="server-item ${server.running ? 'running' : 'not-running'}">
              <h3>${server.name}</h3>
              <p>상태: ${server.running ? '실행 중' : '중지됨'}</p>
              <p>URL: ${server.url}</p>
              <p>
                <a href="/start/${server.id}">시작</a> | 
                <a href="/stop/${server.id}">중지</a>
              </p>
            </div>
          `).join('')}
        </div>
        <div>
          <p><a href="/start-all">모든 서버 시작</a> | <a href="/stop-all">모든 서버 중지</a></p>
        </div>
      </body>
    </html>
  `);
});

// 개별 서버 시작
app.get('/start/:id', (req, res) => {
  const server = MCP_SERVERS.find(s => s.id === req.params.id);
  if (server) {
    startServer(server);
    res.redirect('/');
  } else {
    res.status(404).send('서버를 찾을 수 없습니다.');
  }
});

// 개별 서버 중지
app.get('/stop/:id', (req, res) => {
  const server = MCP_SERVERS.find(s => s.id === req.params.id);
  if (server && server.process) {
    server.process.kill();
    server.running = false;
    server.process = null;
    res.redirect('/');
  } else {
    res.status(404).send('실행 중인 서버를 찾을 수 없습니다.');
  }
});

// 모든 서버 시작
app.get('/start-all', (req, res) => {
  MCP_SERVERS.forEach(server => startServer(server));
  res.redirect('/');
});

// 모든 서버 중지
app.get('/stop-all', (req, res) => {
  servers.forEach(server => {
    if (server.process) {
      server.process.kill();
      server.running = false;
      server.process = null;
    }
  });
  
  res.redirect('/');
});

// 서버 상태 확인 API
app.get('/api/status', (req, res) => {
  res.json({
    servers: MCP_SERVERS.map(server => ({
      id: server.id,
      name: server.name,
      running: server.running,
      url: server.url
    }))
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`MCP 서버 관리자가 시작되었습니다: http://localhost:${PORT}`);
  console.log(`===================================================`);
});

// 종료 시 모든 서버 프로세스 정리
process.on('SIGINT', () => {
  console.log('서버 종료 중...');
  servers.forEach(server => {
    if (server.process) {
      server.process.kill();
    }
  });
  process.exit();
});
EOF

# start-all-servers.js 파일 생성
echo "📝 start-all-servers.js 파일 생성 중..."
cat > start-all-servers.js << 'EOF'
// 모든 MCP 서버를 동시에 시작하는 스크립트
const { spawn } = require('child_process');
const path = require('path');

const servers = [
  { name: 'Filesystem Server', script: 'start:fs', port: 8001 },
  { name: 'Sequential Thinking Server', script: 'start:seq', port: 8002 },
  { name: 'Browser MCP Server', script: 'start:browser', port: 8003 },
  { name: 'Browser Tools Server', script: 'start:tools', port: 8004 },
  { name: 'Figma MCP Server', script: 'start:figma', port: 8005 },
  { name: 'Desktop Commander Server', script: 'start:desktop', port: 8006 },
  { name: 'Smithery Toolbox Server', script: 'start:smithery', port: 8007 }
];

console.log('🚀 모든 MCP 서버 시작하기');

servers.forEach(server => {
  console.log(`Starting ${server.name} on port ${server.port}...`);
  
  const process = spawn('npm', ['run', server.script], {
    stdio: 'pipe',
    env: { ...process.env, PORT: server.port },
    shell: true
  });
  
  process.stdout.on('data', (data) => {
    console.log(`[${server.name}] ${data.toString().trim()}`);
  });
  
  process.stderr.on('data', (data) => {
    console.error(`[${server.name} ERROR] ${data.toString().trim()}`);
  });
  
  process.on('close', (code) => {
    console.log(`${server.name} process exited with code ${code}`);
  });
});

console.log('🌐 MCP 서버 관리자 접속: http://localhost:3333');
EOF

# mcp.json 파일 생성
echo "📝 mcp.json 파일 생성 중..."
cat > ../mcp.json << 'EOF'
{
  "name": "VS Code MCP Servers Collection",
  "version": "1.0.0",
  "description": "VS Code용 MCP 서버 모음",
  "servers": [
    {
      "id": "fs-server",
      "name": "Filesystem Server",
      "description": "파일 시스템 접근 (파일 읽기, 쓰기, 삭제, 이동 등)",
      "transport": {
        "type": "http",
        "url": "http://localhost:8001/mcp"
      },
      "capabilities": {
        "resources": true,
        "tools": true,
        "prompts": true
      }
    },
    {
      "id": "seq-server",
      "name": "Sequential Thinking Server",
      "description": "복잡한 문제를 단계별로 분석하는 구조적 사고 서버",
      "transport": {
        "type": "http",
        "url": "http://localhost:8002/mcp"
      },
      "capabilities": {
        "resources": true,
        "tools": true,
        "prompts": true
      }
    },
    {
      "id": "browser-server",
      "name": "Browser MCP Server",
      "description": "웹 브라우저 기능 연동 서버",
      "transport": {
        "type": "http",
        "url": "http://localhost:8003/mcp"
      },
      "capabilities": {
        "resources": true,
        "tools": true,
        "prompts": true
      }
    },
    {
      "id": "browser-tools-server",
      "name": "Browser Tools Server",
      "description": "웹 브라우저와 상호작용 (콘솔 로그, 네트워크 요청, 스크린샷 등)",
      "transport": {
        "type": "http",
        "url": "http://localhost:8004"
      },
      "capabilities": {
        "resources": true,
        "tools": true,
        "prompts": true
      }
    },
    {
      "id": "figma-server",
      "name": "Figma Server",
      "description": "Figma 디자인 파일 접근 및 상호작용",
      "transport": {
        "type": "http",
        "url": "http://localhost:8005/mcp"
      },
      "capabilities": {
        "resources": true,
        "tools": true,
        "prompts": true
      }
    },
    {
      "id": "desktop-server",
      "name": "Desktop Commander",
      "description": "터미널 명령 실행 및 파일 편집을 위한 서버",
      "transport": {
        "type": "http", 
        "url": "http://localhost:8006/mcp"
      },
      "capabilities": {
        "resources": true,
        "tools": true,
        "prompts": true
      }
    },
    {
      "id": "smithery-server",
      "name": "Smithery Toolbox",
      "description": "다양한 MCP 도구들을 동적으로 연결해주는 메타 서버",
      "transport": {
        "type": "http",
        "url": "http://localhost:8007/mcp"
      },
      "capabilities": {
        "resources": true,
        "tools": true,
        "prompts": true
      }
    }
  ],
  "autoStartServers": true,
  "default": "fs-server"
}
EOF

# 스크립트 파일 생성
echo "📝 install-mcp-servers.sh 파일 생성 중..."
cat > install-mcp-servers.sh << 'EOF'
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
EOF

# 스크립트에 실행 권한 추가
chmod +x install-mcp-servers.sh

echo "✅ MCP 서버 설치 스크립트 생성 완료"
echo ""
echo "사용 방법:"
echo "1. cd $MCP_DIR"
echo "2. ./install-mcp-servers.sh 실행 (필요한 패키지 설치)"
echo "3. node index.js 실행 (MCP 서버 관리자 시작)"
echo ""
echo "생성된 mcp.json 파일은 다음 위치에 있습니다:"
echo "$SCRIPT_DIR/mcp.json"
echo ""
echo "VS Code 설정을 업데이트하세요:"
echo "settings.json에 다음을 추가:"
echo "\"vscode.mcp.enabled\": true,"
echo "\"vscode.mcp.path\": \"$SCRIPT_DIR/mcp.json\""