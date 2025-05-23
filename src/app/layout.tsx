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
  return (
    <html lang="ko">
      <head>
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http: https: ws://localhost:* wss://localhost:*; font-src 'self';" />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}