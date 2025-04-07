const { debugLog } = require('../utils');

/**
 * 워커 풀 정리
 * @param {Array} workerPool - 워커 풀 배열
 */
function cleanupWorkerPool(workerPool) {
  if (!Array.isArray(workerPool) || workerPool.length === 0) {
    debugLog('정리할 워커가 없음');
    return Promise.resolve();
  }

  debugLog(`${workerPool.length}개의 워커 정리 시작`);

  const terminationPromises = workerPool.map((worker) => {
    return new Promise((resolve) => {
      if (!worker || worker.terminated) {
        resolve();
        return;
      }

      // 워커에게 종료 메시지 전송
      try {
        worker.postMessage({ type: 'shutdown' });
      } catch (error) {
        debugLog(`워커에 종료 메시지 전송 실패: ${error.message}`);
      }

      // 워커 종료 또는 내부 에러 이벤트 처리
      const cleanup = () => {
        try {
          if (!worker.terminated) {
            worker.terminate();
          }
        } catch (error) {
          debugLog(`워커 종료 중 오류: ${error.message}`);
        } finally {
          resolve();
        }
      };

      // 1초 내에 워커가 스스로 종료하지 않으면 강제 종료
      const timeoutId = setTimeout(() => {
        debugLog('워커가 응답하지 않아 강제 종료');
        cleanup();
      }, 1000);

      // 워커가 스스로 종료한 경우
      worker.once('exit', () => {
        clearTimeout(timeoutId);
        resolve();
      });

      worker.once('error', (error) => {
        debugLog(`워커 오류 발생: ${error.message}`);
        clearTimeout(timeoutId);
        cleanup();
      });
    });
  });

  return Promise.all(terminationPromises)
    .then(() => {
      debugLog('모든 워커 정리 완료');
    })
    .catch((error) => {
      debugLog(`워커 풀 정리 중 오류: ${error.message}`);
    });
}

module.exports = { cleanupWorkerPool };
