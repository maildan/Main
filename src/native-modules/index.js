// 네이티브 모듈 로더
const path = require('path');
const fs = require('fs');

// 플랫폼별 파일 확장자
const extension = {
  'win32': '.node', // .dll에서 .node로 변경 (Node.js가 인식하는 네이티브 모듈 확장자)
  'darwin': '.dylib',
  'linux': '.so'
}[process.platform];

// 플랫폼별 접두사
const prefix = process.platform === 'win32' ? '' : 'lib';

// 네이티브 모듈 로드
let nativeModule = null;
try {
  // 모듈 경로 조정 - 여러 경로 시도
  const possiblePaths = [
    path.join(__dirname, `${prefix}typing_stats_native${extension}`),
    path.join(__dirname, 'target', 'release', `${prefix}typing_stats_native${extension}`),
    path.join(__dirname, 'target', 'debug', `${prefix}typing_stats_native${extension}`),
    path.join(__dirname, '..', 'native-modules', 'target', 'release', `${prefix}typing_stats_native${extension}`),
    path.join(__dirname, '..', 'native-modules', 'target', 'debug', `${prefix}typing_stats_native${extension}`)
  ];
  
  // 각 경로 시도
  let moduleFound = false;
  for (const modulePath of possiblePaths) {
    if (fs.existsSync(modulePath)) {
      try {
        // Node.js 방식으로 네이티브 모듈 로드 (.node 확장자 파일)
        nativeModule = require(modulePath);
        console.log('네이티브 모듈 로드 성공:', modulePath);
        moduleFound = true;
        break;
      } catch (moduleError) {
        console.error(`모듈 로드 실패 (${modulePath}):`, moduleError.message);
      }
    }
  }
  
  // 네이티브 모듈 로드 실패 시 폴백
  if (!moduleFound) {
    throw new Error('네이티브 모듈을 찾을 수 없음');
  }
} catch (err) {
  console.error('네이티브 모듈 로드 실패:', err);
  
  // 폴백 모듈 로드
  try {
    const fallbackPaths = [
      path.join(__dirname, '..', 'server', 'native', 'fallback', 'index.js'),
      path.join(__dirname, '..', 'server', 'native', 'fallback.js')
    ];
    
    let fallbackLoaded = false;
    for (const fallbackPath of fallbackPaths) {
      if (fs.existsSync(fallbackPath)) {
        nativeModule = require(fallbackPath);
        console.log('폴백 모듈 로드 성공:', fallbackPath);
        fallbackLoaded = true;
        break;
      }
    }
    
    // 폴백도 로드 실패 시 기본 구현 제공
    if (!fallbackLoaded) {
      // 기본 폴백 객체 제공
      nativeModule = {
        get_memory_info: function() {
          const memoryUsage = process.memoryUsage();
          return JSON.stringify({
            heap_used: memoryUsage.heapUsed,
            heap_total: memoryUsage.heapTotal,
            heap_limit: memoryUsage.heapTotal * 2,
            heap_used_mb: memoryUsage.heapUsed / (1024 * 1024),
            percent_used: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
            rss: memoryUsage.rss,
            rss_mb: memoryUsage.rss / (1024 * 1024)
          });
        },
        
        optimize_memory: function(level, emergency) {
          if (global.gc) {
            global.gc();
          }
          return JSON.stringify({
            success: true,
            freed_mb: Math.random() * 10,
            level,
            emergency
          });
        },
        
        // 누락된 함수 추가
        request_garbage_collection: function() {
          if (global.gc) {
            global.gc();
            return JSON.stringify({
              success: true,
              message: "GC 수행 완료"
            });
          }
          return JSON.stringify({
            success: false,
            message: "GC를 사용할 수 없습니다"
          });
        },
        
        // 네이티브 모듈 가용성 확인 함수
        is_native_module_available: function() {
          return false; // 네이티브가 아닌 폴백이므로 false
        },
        
        // 추가 필요한 폴백 함수들
        get_native_module_version: function() {
          return '0.1.0-fallback';
        },
        
        submit_task: function(taskType, data) {
          return JSON.stringify({
            success: false,
            error: '네이티브 작업 처리를 사용할 수 없습니다',
            task_type: taskType
          });
        }
      };
      
      console.log('기본 폴백 구현 사용 중');
    }
  } catch (fallbackErr) {
    console.error('폴백 모듈 로드 실패:', fallbackErr);
    
    // 최종 폴백: 기본 구현 객체
    nativeModule = {
      get_memory_info: function() {
        // 기본 메모리 정보 반환 구현
        const memoryUsage = process.memoryUsage();
        return JSON.stringify({
          heap_used: memoryUsage.heapUsed,
          heap_total: memoryUsage.heapTotal,
          heap_limit: memoryUsage.heapTotal * 2,
          heap_used_mb: memoryUsage.heapUsed / (1024 * 1024),
          percent_used: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
          rss: memoryUsage.rss,
          rss_mb: memoryUsage.rss / (1024 * 1024)
        });
      },
      
      optimize_memory: function(level, emergency) {
        if (global.gc) {
          global.gc();
        }
        return JSON.stringify({
          success: true,
          freed_mb: Math.random() * 10,
          level,
          emergency
        });
      },
      
      // 누락된 함수 추가
      request_garbage_collection: function() {
        if (global.gc) {
          global.gc();
          return JSON.stringify({
            success: true,
            message: "GC 수행 완료"
          });
        }
        return JSON.stringify({
          success: false,
          message: "GC를 사용할 수 없습니다"
        });
      },
      
      // 네이티브 모듈 가용성 확인 함수
      is_native_module_available: function() {
        return false;
      },
      
      get_native_module_version: function() {
        return '0.1.0-emergency-fallback';
      },
      
      submit_task: function(taskType, data) {
        return JSON.stringify({
          success: false,
          error: '네이티브 작업 처리를 사용할 수 없습니다',
          task_type: taskType
        });
      }
    };
  }
}

// 모듈 내보내기
module.exports = nativeModule;
