/**
 * 메모리 관리 모듈 - Rust 네이티브 모듈 활용
 */
const { getMemoryInfo } = require('./utils');

// 재사용 가능한 객체 풀 - 메모리 할당 최소화
const reusableBuffers = {
  keyIntervals: [],
  frequencyMap: {},
  results: {},
  matrixCache: {}
};

/**
 * 메모리 사용량 확인 - 네이티브 모듈 통합
 * @param {number} memoryLimit - 메모리 사용량 임계치
 * @param {Function} warningCallback - 경고 콜백
 * @param {Function} normalCallback - 정상 콜백
 * @returns {Object} 메모리 사용량 정보
 */
function checkMemoryUsage(memoryLimit, warningCallback, normalCallback) {
  // 네이티브 모듈 사용 시도
  try {
    const nativeModule = require('../../../native-modules');
    
    if (nativeModule && typeof nativeModule.determine_optimization_level === 'function') {
      // 네이티브 모듈에서 최적화 레벨 확인
      const optLevel = nativeModule.determine_optimization_level();
      // 레벨 2 이상이면 경고 (메모리 상태 심각)
      if (optLevel >= 2 && typeof warningCallback === 'function') {
        const memoryInfo = getMemoryInfo();
        warningCallback(memoryInfo);
        return memoryInfo;
      } else if (optLevel <= 0 && typeof normalCallback === 'function') {
        const memoryInfo = getMemoryInfo();
        normalCallback(memoryInfo);
        return memoryInfo;
      }
    }
  } catch (nativeError) {
    // 네이티브 모듈 로드 실패 시 기본 구현으로 폴백
    console.debug('네이티브 최적화 레벨 확인 실패, JS 구현으로 폴백:', nativeError);
  }
  
  // 기본 JS 구현 (네이티브 모듈 사용 불가능한 경우)
  const memoryInfo = getMemoryInfo();
  
  // 메모리 임계치 초과 시 최적화 모드 전환
  if (memoryInfo.heapUsed > memoryLimit) {
    if (typeof warningCallback === 'function') {
      warningCallback(memoryInfo);
    }
  } else if (memoryInfo.heapUsed < memoryLimit * 0.7) {
    // 메모리가 충분히 확보되면 최적화 모드 비활성화
    if (typeof normalCallback === 'function') {
      normalCallback(memoryInfo);
    }
  }
  
  return memoryInfo;
}

/**
 * 수동 가비지 컬렉션 수행 - 네이티브 모듈 통합
 * --expose-gc 없이도 메모리 확보 시도
 */
function manualGarbageCollect() {
  // 네이티브 모듈 사용 시도
  try {
    const nativeModule = require('../../../native-modules');
    
    if (nativeModule && typeof nativeModule.force_garbage_collection === 'function') {
      // Rust 네이티브 GC 호출 
      const result = nativeModule.force_garbage_collection();
      if (result) {
        console.debug('네이티브 GC 수행 완료');
        return;
      }
    }
  } catch (nativeError) {
    console.debug('네이티브 GC 수행 실패, JS 구현으로 폴백:', nativeError);
  }
  
  // 기본 JS 구현 (네이티브 모듈 사용 불가능한 경우)
  // 배열과 객체 참조 재설정
  for (const key in reusableBuffers) {
    if (Array.isArray(reusableBuffers[key])) {
      reusableBuffers[key].length = 0;
    } else if (typeof reusableBuffers[key] === 'object' && reusableBuffers[key] !== null) {
      Object.keys(reusableBuffers[key]).forEach(k => {
        // Float32Array와 같은 TypedArray는 보존
        if (!(reusableBuffers[key][k] instanceof Float32Array)) {
          delete reusableBuffers[key][k];
        }
      });
    }
  }
  
  // 대용량 객체 참조 해제
  const largeObjectKeys = Object.keys(global).filter(key => {
    const obj = global[key];
    return obj && typeof obj === 'object' && key.startsWith('__temp_');
  });
  
  largeObjectKeys.forEach(key => {
    delete global[key];
  });
  
  // 메모리 압력 생성하여 GC 유도
  try {
    const pressure = [];
    for (let i = 0; i < 5; i++) {
      pressure.push(new ArrayBuffer(1024 * 1024)); // 1MB
    }
    pressure.length = 0;
  } catch (e) {
    // 메모리 할당 실패 무시
  }
}

/**
 * 메모리 최적화 실행 - 네이티브 모듈 통합
 * @param {boolean} emergency - 긴급 최적화 모드 여부
 * @param {Function} callback - 결과 콜백
 */
function optimizeMemory(emergency = false, callback) {
  try {
    // 현재 메모리 상태 확인
    const memoryBefore = getMemoryInfo();
    
    // 네이티브 모듈 사용 시도
    try {
      const nativeModule = require('../../../native-modules');
      
      if (nativeModule && typeof nativeModule.optimize_memory === 'function') {
        // 최적화 레벨 결정 (emergency일 경우 4, 아니면 2)
        const level = emergency ? 4 : 2;
        
        // Rust 네이티브 메모리 최적화 호출
        const resultJson = nativeModule.optimize_memory(level, emergency);
        if (resultJson) {
          const result = JSON.parse(resultJson);
          
          // 메모리 최적화 완료 후 결과 전송
          if (typeof callback === 'function') {
            callback({
              before: memoryBefore,
              after: getMemoryInfo(), // 최신 메모리 정보 가져오기
              reduction: result.freed_memory || 0,
              emergency
            });
          }
          
          return {
            success: true,
            before: memoryBefore,
            after: getMemoryInfo(),
            reduction: result.freed_memory || 0
          };
        }
      }
    } catch (nativeError) {
      console.debug('네이티브 메모리 최적화 실패, JS 구현으로 폴백:', nativeError);
    }
    
    // 기본 JS 구현 (네이티브 모듈 사용 불가능한 경우)
    
    // 캐시 및 임시 데이터 정리
    for (const key in reusableBuffers) {
      const buffer = reusableBuffers[key];
      
      // 배열 초기화
      if (Array.isArray(buffer)) {
        buffer.length = 0;
      }
      // 객체 초기화
      else if (typeof buffer === 'object' && buffer !== null) {
        // TypedArray가 아닌 경우만 처리
        if (!(buffer instanceof Float32Array || 
              buffer instanceof Uint8Array || 
              buffer instanceof Uint16Array || 
              buffer instanceof Uint32Array)) {
          Object.keys(buffer).forEach(k => {
            delete buffer[k];
          });
        }
      }
    }
    
    // 강제 메모리 정리
    manualGarbageCollect();
    
    // 결과 전송
    const afterMemoryInfo = getMemoryInfo();
    
    if (typeof callback === 'function') {
      callback({
        before: memoryBefore,
        after: afterMemoryInfo,
        reduction: memoryBefore.heapUsed - afterMemoryInfo.heapUsed,
        emergency
      });
    }
    
    return {
      success: true,
      before: memoryBefore,
      after: afterMemoryInfo,
      reduction: memoryBefore.heapUsed - afterMemoryInfo.heapUsed
    };
  } catch (error) {
    if (typeof callback === 'function') {
      callback({
        error: `메모리 최적화 중 오류: ${error.message}`,
        stack: error.stack
      });
    }
    return { 
      success: false,
      error: error.message 
    };
  }
}

module.exports = {
  checkMemoryUsage,
  manualGarbageCollect,
  optimizeMemory,
  reusableBuffers
};
