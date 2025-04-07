/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
  generateRobotsTxt: true, // (optional)
  exclude: ['/api/*', '/server-sitemap.xml'], // Exclude API routes
  robotsTxtOptions: {
    additionalSitemaps: [
      // If you have additional sitemaps
      // 'https://example.com/server-sitemap.xml',
    ],
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/*']
      }
    ]
  },
  // 수정: Next.js 15.x 이상 버전에 맞게 경로 설정
  outDir: '.next', // 항상 .next 디렉토리 사용
  // Next.js 15+ 사용 시 필요한 추가 설정
  // https://github.com/iamvishnusankar/next-sitemap/issues/61
  transform: async (config, path) => {
    // 제외할 경로 확인
    if (path.startsWith('/api/') || path === '/404' || path === '/500') {
      return null;
    }
    // 기본 변환 반환
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
      alternateRefs: config.alternateRefs ?? [],
    };
  }
};
