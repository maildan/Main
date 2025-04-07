import dynamic from 'next/dynamic';

// default export로 가져오도록 수정
import MemoryUsageMonitor from './MemoryUsageMonitor';

// 클라이언트 측에서만 렌더링되는 메모리 사용량 모니터 컴포넌트
export const DynamicMemoryUsageMonitor = dynamic(
  () => Promise.resolve(MemoryUsageMonitor),
  { ssr: false }
);

// 클라이언트 측에서만 렌더링되는 다른 컴포넌트들도 필요에 따라 추가
export const DynamicNativeModuleStatus = dynamic(
  () => import('./NativeModuleStatus').then(mod => mod.default),
  { ssr: false }
);

// 기타 브라우저 API에 의존하는 컴포넌트들...
