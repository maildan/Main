import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata = {
  title: 'Loop',
  description: '모든 채팅을 한곳에.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 개발 환경에서는 CSP 메타 태그를 제거
  const isDev = process.env.NODE_ENV === 'development';
  
  return (
    <html lang="ko">
      <head>
        {/* 개발 환경에서는 CSP 메타 태그를 제거하고 Electron이 설정한 CSP를 사용 */}
        {!isDev && (
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http: https: ws://localhost:* wss://localhost:*; font-src 'self';" />
        )}
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}