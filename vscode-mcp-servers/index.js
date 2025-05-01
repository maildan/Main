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
