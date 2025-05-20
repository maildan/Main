/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://example.com',
  generateRobotsTxt: true,
  exclude: ['/api/*', '/dashboard', '/mini-view', '/gpu-test', '/restart'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api', '/dashboard', '/mini-view', '/gpu-test', '/restart']
      }
    ]
  }
}; 