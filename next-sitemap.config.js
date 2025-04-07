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
  // Change to false for production
  outDir: process.env.NODE_ENV === 'development' ? '.next' : 'out',
};
