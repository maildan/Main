/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // esmExternals 옵션 제거: 경고 메시지로 인해 제거함
  experimental: {
    // Next.js 15.2+ 권장 설정에 맞게 조정
  },
}

module.exports = nextConfig