/** @type {import('next').NextConfig} */
const nextConfig = {
  // 정적 내보내기 설정 제거하고 개발 환경에서는 서버 모드 사용
  // output: 'export',
  images: {
    unoptimized: true // Electron 환경에서 이미지 최적화 비활성화
  },
  // 개발 환경에서는 distDir 설정 비활성화
  distDir: process.env.NODE_ENV === 'development' ? '.next' : 'dist'
};

export default nextConfig;