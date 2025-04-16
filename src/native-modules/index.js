/**
 * 네이티브 모듈 래퍼 - 모듈 로드 실패 시 폴백 구현 제공
 */

const path = require('path');
const fs = require('fs');
const { debugLog } = require('../main/utils');

// 네이티브 모듈 폴백 객체
const fallbackModule = {
  // 메모리 정보 획득
  get_memory_info: () => {
    try {
      const memory = process.memoryUsage();
      return {
        heap_used: memory.heapUsed,
        heap_total: memory.heapTotal,
        rss: memory.rss,
        percent_used: Math.round((memory.heapUsed / memory.heapTotal) * 100),
        heap_limit: null
      };
    } catch (error) {
      console.error('메모리 정보 가져오기 오류:', error);
      return {
        heap_used: 0,
        heap_total: 0,
        rss: 0,
        percent_used: 0,
        heap_limit: null
      };
    }
  },

  // GPU 초기화 (항상 성공 반환)
  initialize_gpu: () => {
    debugLog('폴백: GPU 모듈 초기화');
    return true;
  },

  // GPU 가속 활성화 (항상 성공 반환)
  enable_gpu_acceleration: () => {
    debugLog('폴백: GPU 가속 활성화');
    return true;
  },

  // GPU 가속 비활성화 (항상 성공 반환)
  disable_gpu_acceleration: () => {
    debugLog('폴백: GPU 가속 비활성화');
    return true;
  },

  // GPU 가속 상태 설정 (항상 성공 반환)
  set_gpu_acceleration: (enabled) => {
    debugLog(`폴백: GPU 가속 ${enabled ? '활성화' : '비활성화'}`);
    return true;
  },

  // 타이핑 패턴 분석 (단순 패스스루)
  analyze_typing_pattern: (data) => {
    return {
      accuracy: 95,
      speed: 60,
      rhythm: "normal",
      patterns: []
    };
  },

  // 메모리 최적화
  optimize_memory: (level, emergency) => {
    debugLog(`폴백: 메모리 최적화 (레벨: ${level}, 긴급: ${emergency})`);
    return true;
  },

  // 미사용 리소스 해제
  release_unused_resources: () => {
    debugLog('폴백: 미사용 리소스 해제');
    if (global.gc) {
      global.gc();
    }
    return true;
  }
};

// 네이티브 모듈 로드 시도
let nativeModule = null;

try {
  const possiblePaths = [
    path.join(__dirname, 'typing_stats_native.node'),
    path.join(__dirname, 'target', 'release', 'typing_stats_native.node'),
    path.join(__dirname, 'target', 'debug', 'typing_stats_native.node'),
    path.join(__dirname, '..', '..', 'native-modules', 'typing_stats_native.node'),
    path.join(__dirname, '..', '..', 'native-modules', 'target', 'release', 'typing_stats_native.node'),
    path.join(__dirname, '..', '..', 'native-modules', 'target', 'debug', 'typing_stats_native.node')
  ];

  for (const modulePath of possiblePaths) {
    if (fs.existsSync(modulePath)) {
      try {
        debugLog(`네이티브 모듈 발견: ${modulePath}`);
        nativeModule = require(modulePath);
        debugLog('네이티브 모듈 로드 성공');
        break;
      } catch (error) {
        console.error(`모듈 로드 실패 (${modulePath}):`, error);
      }
    }
  }
} catch (error) {
  console.error('네이티브 모듈 로드 중 오류:', error);
}

// 네이티브 모듈이 로드되지 않았다면 폴백 사용
if (!nativeModule) {
  debugLog('네이티브 모듈 로드 실패: 폴백 사용');
  nativeModule = fallbackModule;
}

module.exports = nativeModule;
