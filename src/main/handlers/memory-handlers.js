/**
 * 메모리 관리 관련 IPC 핸들러
 * 
 * 메모리 사용량 모니터링, 가비지 컬렉션, 최적화 등 메모리 관리 기능을 처리합니다.
 */
const { ipcMain } = require('electron');
const { appState, HIGH_MEMORY_THRESHOLD } = require('../constants');
const { debugLog } = require('../utils');
const { 
  forceMemoryOptimization, 
  performGarbageCollection, 
  getCurrentMemoryUsage, 
  getMemoryManagerStats,
  getMemoryInfo,
  freeUpMemoryResources
} = require('../memory-manager');

/**
 * 메모리 관리 관련 IPC 핸들러 등록
 */
function register() {
  debugLog('메모리 관리 관련 IPC 핸들러 등록 중...');

  // 메모리 사용량 정보 요청 처리
  ipcMain.handle('get-memory-usage', () => {
    try {
      const memoryInfo = getMemoryInfo();
      debugLog('메모리 사용량 정보 요청됨:', memoryInfo.heapUsedMB + 'MB');
      return memoryInfo;
    } catch (error) {
      console.error('메모리 정보 요청 처리 중 오류:', error);
      return {
        timestamp: Date.now(),
        heapUsed: 0,
        heapTotal: 0,
        rss: 0,
        external: 0,
        heapUsedMB: 0,
        rssMB: 0,
        percentUsed: 0,
        error: String(error)
      };
    }
  });
  
  // 수동 가비지 컬렉션 요청 처리
  ipcMain.on('request-gc', (event) => {
    debugLog('수동 가비지 컬렉션 요청 받음');
    
    try {
      // 네이티브 모듈 사용 시도
      const nativeModule = require('../../native-modules');
      if (nativeModule && typeof nativeModule.force_garbage_collection === 'function') {
        // Rust 네이티브 GC 호출
        const resultJson = nativeModule.force_garbage_collection();
        
        try {
          const result = JSON.parse(resultJson);
          event.reply('gc-completed', {
            success: true,
            timestamp: result.timestamp,
            freedMemory: result.freed_memory || 0,
            freedMB: result.freed_mb || 0
          });
          return;
        } catch (parseError) {
          debugLog('네이티브 GC 결과 파싱 오류:', parseError);
        }
      }
      
      // 네이티브 모듈 사용 불가능한 경우 기본 구현으로 폴백
      const { performGC } = require('../memory-manager');
      const result = performGC();
      
      // 결과 전송
      event.reply('gc-completed', {
        success: true,
        timestamp: Date.now(),
        memoryBefore: result?.before
      });
    } catch (error) {
      console.error('가비지 컬렉션 요청 처리 중 오류:', error);
      event.reply('gc-completed', {
        success: false,
        error: String(error)
      });
    }
  });
  
  // 메모리 최적화 요청 처리
  ipcMain.on('optimize-memory', (event) => {
    debugLog('메모리 최적화 요청 받음');
    
    try {
      // 네이티브 모듈 사용 시도
      const nativeModule = require('../../native-modules');
      if (nativeModule && typeof nativeModule.optimize_memory === 'function') {
        // 최적화 레벨 결정
        const isEmergency = appState.memoryUsage.heapUsed > HIGH_MEMORY_THRESHOLD;
        const level = isEmergency ? 4 : 2;
        
        // Rust 네이티브 메모리 최적화 호출
        const resultJson = nativeModule.optimize_memory(level, isEmergency);
        
        try {
          const result = JSON.parse(resultJson);
          const memoryInfo = require('../memory-manager').getMemoryInfo();
          
          event.reply('memory-optimized', {
            success: true,
            result,
            memoryInfo
          });
          return;
        } catch (parseError) {
          debugLog('네이티브 최적화 결과 파싱 오류:', parseError);
        }
      }
      
      // 네이티브 모듈 사용 불가능한 경우 기본 구현으로 폴백
      const { freeUpMemoryResources } = require('../memory-manager');
      const isEmergency = appState.memoryUsage.heapUsed > HIGH_MEMORY_THRESHOLD;
      
      freeUpMemoryResources(isEmergency);
      
      // GC 요청
      if (global.gc) {
        setTimeout(() => {
          global.gc();
          
          // 최적화 후 메모리 정보 반환
          const { getMemoryInfo } = require('../memory-manager');
          const memoryInfo = getMemoryInfo();
          
          event.reply('memory-optimized', {
            success: true,
            memoryInfo
          });
        }, 200);
      } else {
        event.reply('memory-optimized', {
          success: false,
          error: 'GC를 사용할 수 없음 (--expose-gc 플래그 필요)'
        });
      }
    } catch (error) {
      console.error('메모리 최적화 중 오류:', error);
      event.reply('memory-optimized', {
        success: false,
        error: String(error)
      });
    }
  });

  // 렌더러 프로세스에 GC 요청 수신
  ipcMain.on('renderer-gc-completed', (_, data) => {
    debugLog('렌더러 GC 완료:', data);
    // 필요한 경우 여기서 추가 작업 수행
  });

  // 메모리 상태 모니터링 요청
  ipcMain.handle('check-memory', async () => {
    try {
      const { checkMemoryUsage } = require('../memory-manager');
      const memoryInfo = checkMemoryUsage();
      return { success: true, memoryInfo };
    } catch (error) {
      console.error('메모리 상태 확인 중 오류:', error);
      return { 
        success: false, 
        error: String(error) 
      };
    }
  });

  // Promise 기반 메모리 관리 핸들러 등록
  ipcMain.handle('optimize-memory-async', async (event, level = 2, emergency = false) => {
    try {
      const result = await forceMemoryOptimization(level, emergency);
      return { success: true, result };
    } catch (error) {
      console.error('메모리 최적화 IPC 핸들러 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 가비지 컬렉션 요청 처리 (Promise 기반)
  ipcMain.handle('request-gc-async', async (event, emergency = false) => {
    try {
      const result = await performGarbageCollection(emergency);
      return { success: true, result };
    } catch (error) {
      console.error('GC 요청 IPC 핸들러 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 메모리 사용량 요청 처리 (Promise 기반)
  ipcMain.handle('get-memory-usage-async', async () => {
    try {
      const memoryInfo = await getCurrentMemoryUsage();
      return { success: true, memoryInfo };
    } catch (error) {
      console.error('메모리 사용량 IPC 핸들러 오류:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 메모리 관리자 상태 요청 처리
  ipcMain.handle('get-memory-manager-stats', () => {
    try {
      const stats = getMemoryManagerStats();
      return { success: true, stats };
    } catch (error) {
      console.error('메모리 관리자 상태 IPC 핸들러 오류:', error);
      return { success: false, error: error.message };
    }
  });

  debugLog('메모리 관리 관련 IPC 핸들러 등록 완료');
}

// 모듈 내보내기
module.exports = {
  register
}; 