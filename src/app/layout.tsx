import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import ClientLayout from './ClientLayout';
import { ThemeProvider } from './components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

// viewport 설정
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' }
  ]
};

// 메타데이터 선언
export const metadata: Metadata = {
  title: 'Loop - 생산성 추적',
  description: '타이핑 습관과 앱 사용 패턴을 추적하는 데스크톱 생산성 도구',
  applicationName: 'Loop',
  generator: 'Next.js',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' }
    ],
    apple: {
      url: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png'
    }
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}