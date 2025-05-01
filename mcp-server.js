const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// 서버 설정
const app = express();
const PORT = process.env.PORT || 3030;

// 미들웨어 설정
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
console.log('미들웨어 설정 완료');

// 루트 경로
app.get('/', (req, res) => {
  res.send('Loop MCP 서버가 실행 중입니다');
});

// VS Code API 엔드포인트
app.post('/v1/chat/completions', (req, res) => {
  console.log('VS Code 요청 수신:', req.originalUrl);
  
  const response = {
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'Loop MCP 서버에서의 응답입니다. VS Code와 연동된 AI 어시스턴트입니다.'
        },
        finish_reason: 'stop'
      }
    ],
    model: 'loop-mcp-model',
    object: 'chat.completion'
  };
  
  res.json(response);
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Loop MCP 서버가 포트 ${PORT}에서 시작되었습니다`);
});