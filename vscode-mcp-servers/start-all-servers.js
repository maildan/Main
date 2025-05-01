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
  
  const childProcess = spawn('npm', ['run', server.script], {
    stdio: 'pipe',
    env: { ...process.env, PORT: server.port },
    shell: true
  });
  
  childProcess.stdout.on('data', (data) => {
    console.log(`[${server.name}] ${data.toString().trim()}`);
  });
  
  childProcess.stderr.on('data', (data) => {
    console.error(`[${server.name} ERROR] ${data.toString().trim()}`);
  });
  
  childProcess.on('close', (code) => {
    console.log(`${server.name} process exited with code ${code}`);
  });
});

console.log('🌐 MCP 서버 관리자 접속: http://localhost:3333');
