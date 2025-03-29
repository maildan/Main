/**
 * 네이티브 모듈 폴백 구현
 * 
 * 네이티브 모듈을 로드할 수 없을 때 사용되는 순수 자바스크립트 구현입니다.
 */

/**
 * 메모리 정보 가져오기
 */
exports.getMemoryInfo = async () => {
  const memInfo = process.memoryUsage();
  const heapUsedMB = Math.round(memInfo.heapUsed / 1024 / 1024 * 100) / 100;
  const heapTotalMB = Math.round(memInfo.heapTotal / 1024 / 1024 * 100) / 100;
  const rssMB = Math.round(memInfo.rss / 1024 / 1024 * 100) / 100;
  
  return {
    success: true,
    memoryInfo: {
      heap_used: memInfo.heapUsed,
      heap_total: memInfo.heapTotal,
      heap_used_mb: heapUsedMB,
      heap_total_mb: heapTotalMB,
      rss: memInfo.rss,
      rss_mb: rssMB,
      percent_used: Math.round(memInfo.heapUsed / memInfo.heapTotal * 100),
      external: memInfo.external || 0,
      timestamp: Date.now()
    },
    fallback: true
  };
};

/**
 * 메모리 최적화 수행
 */
exports.optimizeMemory = async (level = 2, emergency = false) => {
  const memBefore = process.memoryUsage();
  
  // GC 강제 실행
  if (global.gc) {
    global.gc();
  }
  
  // 인위적인 지연 추가
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const memAfter = process.memoryUsage();
  const freedMemory = memBefore.heapUsed - memAfter.heapUsed;
  
  return {
    success: true,
    result: {
      success: true,
      optimization_level: level,
      memory_before: {
        heap_used: memBefore.heapUsed,
        heap_total: memBefore.heapTotal,
        rss: memBefore.rss,
        heap_used_mb: memBefore.heapUsed / (1024 * 1024),
        rss_mb: memBefore.rss / (1024 * 1024),
        percent_used: (memBefore.heapUsed / memBefore.heapTotal) * 100,
        timestamp: Date.now()
      },
      memory_after: {
        heap_used: memAfter.heapUsed,
        heap_total: memAfter.heapTotal,
        rss: memAfter.rss,
        heap_used_mb: memAfter.heapUsed / (1024 * 1024),
        rss_mb: memAfter.rss / (1024 * 1024),
        percent_used: (memAfter.heapUsed / (1024 * 1024)) * 100,
        timestamp: Date.now()
      },
      freed_memory: Math.max(0, freedMemory),
      freed_mb: Math.max(0, freedMemory) / (1024 * 1024),
      duration: 100,
      timestamp: Date.now(),
      error: null
    },
    fallback: true
  };
};

/**
 * 가비지 컬렉션 강제 실행
 */
exports.forceGarbageCollection = () => {
  const memBefore = process.memoryUsage();
  
  if (global.gc) {
    global.gc();
    return { success: true, fallback: true };
  }
  
  return { 
    success: false, 
    error: 'Global GC is not available',
    fallback: true 
  };
};

/**
 * 모듈 상태 확인
 */
exports.getStatus = () => {
  return {
    available: false,
    usingFallback: true,
    functions: ['getMemoryInfo', 'optimizeMemory', 'forceGarbageCollection']
  };
};
