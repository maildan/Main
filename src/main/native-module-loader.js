/**
 * 네이티브 모듈 로드 핸들러
 * 
 * 네이티브 모듈 로드 실패 시 폴백 모듈을 자동으로 로드합니다.
 */
const path = require('path');
const fs = require('fs');
const { debugLog } = require('./utils');

// 네이티브 모듈 및 폴백 경로
const NATIVE_MODULE_PATH = path.resolve(__dirname, '../native-modules');
const FALLBACK_MODULE_PATH = path.resolve(__dirname, '../server/native/fallback/index.js');

/**
 * 안전한 네이티브 모듈 로드 함수
 * @returns {Object} 네이티브 모듈 또는 폴백 모듈
 */
function loadNativeModule() {
  let nativeModule = null;
  let usingFallback = false;
  
  try {
    // 네이티브 모듈이 존재하는지 확인
    const dllPath = path.join(NATIVE_MODULE_PATH, 'typing_stats_native.dll');
    
    if (fs.existsSync(dllPath)) {
      try {
        // 네이티브 모듈은 Node 애드온을 통해서만 로드 가능
        // 직접 DLL 파일을 JS로 로드할 수 없음
        // 대신 공식 네이티브 모듈 경로에서 로드 시도
        nativeModule = require('../native-modules');
        debugLog('네이티브 모듈 로드 성공');
      } catch (err) {
        debugLog(`네이티브 모듈 로드 실패(애드온 방식): ${err.message}`);
        usingFallback = true;
      }
    } else {
      debugLog('네이티브 모듈 파일이 존재하지 않음');
      usingFallback = true;
    }
    
    // 폴백 모듈 로드
    if (usingFallback) {
      if (fs.existsSync(FALLBACK_MODULE_PATH)) {
        nativeModule = require(FALLBACK_MODULE_PATH);
        debugLog('폴백 모듈 로드 성공');
      } else {
        throw new Error('폴백 모듈도 찾을 수 없음');
      }
    }
  } catch (error) {
    debugLog(`모듈 로드 오류: ${error.message}`);
    
    // 기본 폴백 구현
    nativeModule = {
      get_memory_info: () => ({
        heap_used: process.memoryUsage().heapUsed,
        heap_total: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss,
        heap_used_mb: process.memoryUsage().heapUsed / (1024 * 1024),
        rss_mb: process.memoryUsage().rss / (1024 * 1024),
        percent_used: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100,
        timestamp: Date.now()
      }),
      optimize_memory: () => ({ success: true, freed_memory: 0 }),
      force_gc: () => ({ success: true, freed_mb: 0 }),
      // 기본 메서드 추가
      is_gpu_acceleration_available: () => false,
      determine_optimization_level: () => 0
    };
    debugLog('기본 폴백 구현 사용');
  }
  
  return nativeModule;
}

module.exports = {
  loadNativeModule
};
