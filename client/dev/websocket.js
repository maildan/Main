
// HMR 웹소켓 연결 문제 해결을 위한 스크립트
// Next.js의 webpack HMR 웹소켓 연결이 실패하는 문제를 해결합니다.
(function() {
  console.log('[Loop] HMR 웹소켓 연결 설정 중...');
  
  // 현재 스크립트가 브라우저 환경에서 실행되는지 확인
  if (typeof window === 'undefined') return;
  
  // 이미 WebSocket이 패치되어 있다면 중복 실행 방지
  if (window.__LOOP_PATCHED_WEBSOCKET__) return;
  window.__LOOP_PATCHED_WEBSOCKET__ = true;
  
  // 원본 WebSocket 저장
  const OriginalWebSocket = window.WebSocket;
  
  // 재시도 가능한 WebSocket 구현
  class RetryWebSocket extends OriginalWebSocket {
    constructor(url, protocols) {
      super(url, protocols);
      
      this.url = url;
      this.protocols = protocols;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectInterval = 1000;
      
      this.setupListeners();
    }
    
    setupListeners() {
      // 에러 처리
      this.addEventListener('error', (event) => {
        console.warn('[Loop] WebSocket 연결 오류:', event);
        this.tryReconnect();
      });
      
      // 연결 종료 처리
      this.addEventListener('close', (event) => {
        if (event.code !== 1000) { // 정상 종료가 아닌 경우에만 재연결
          console.warn('[Loop] WebSocket 연결이 닫힘. 코드:', event.code);
          this.tryReconnect();
        }
      });
      
      // 연결 성공 처리
      this.addEventListener('open', () => {
        console.log('[Loop] WebSocket 연결 성공:', this.url);
        this.reconnectAttempts = 0;
      });
    }
    
    tryReconnect() {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        
        console.log(
          `[Loop] WebSocket 재연결 시도 ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`
        );
        
        setTimeout(() => {
          try {
            // 다시 연결 시도
            super.close();
            Object.setPrototypeOf(this, OriginalWebSocket.prototype);
            OriginalWebSocket.call(this, this.url, this.protocols);
            this.setupListeners();
          } catch (err) {
            console.error('[Loop] WebSocket 재연결 실패:', err);
          }
        }, this.reconnectInterval * this.reconnectAttempts);
      } else {
        console.warn('[Loop] 최대 재연결 시도 횟수 초과, 웹소켓 연결 중단');
      }
    }
  }
  
  // 특정 URL만 패치된 WebSocket 사용 (webpack-hmr 관련 URL만)
  window.WebSocket = function(url, protocols) {
    if (url.includes('webpack-hmr')) {
      console.log('[Loop] 패치된 WebSocket 사용:', url);
      return new RetryWebSocket(url, protocols);
    } else {
      return new OriginalWebSocket(url, protocols);
    }
  };
  
  // 원본 웹소켓 속성 복사
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
})();
  