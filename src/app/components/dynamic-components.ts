import dynamic from 'next/dynamic';

import MemoryUsageMonitor from './MemoryUsageMonitor';

// 클라이언트 측에서만 렌더링되는 메모리 사용량 모니터 컴포넌트
export const DynamicMemoryUsageMonitor = dynamic(() => Promise.resolve(MemoryUsageMonitor), {
  ssr: false,
});

// 클라이언트 측에서만 렌더링되는 권한 배너 컴포넌트
export const DynamicPermissionBanner = dynamic(
  () => import('./PermissionBanner').then(mod => mod.default),
  { ssr: false }
);

// 클라이언트 측에서만 렌더링되는 네이티브 모듈 상태 컴포넌트
export const DynamicNativeModuleStatus = dynamic(
  () => import('./NativeModuleStatus').then(mod => mod.default),
  { ssr: false }
);

// 기타 브라우저 API에 의존하는 컴포넌트들...
