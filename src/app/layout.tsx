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
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}