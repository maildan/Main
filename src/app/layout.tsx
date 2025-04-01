import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata = {
  title: '키보드 타이핑 통계 분석기',
  description: '키보드 입력 패턴 분석 및 통계 앱',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}