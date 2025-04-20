import './globals.css';
import ClientLayout from './ClientLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Loop',
  description: '모든 채팅을 한곳에.',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }): React.ReactNode => {
  // 서버 측 렌더링에서는 클래스를 적용하지 않습니다.
  // 클라이언트 측 하이드레이션 불일치를 방지하기 위함입니다.
  return (
    <html lang="ko">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
};

export default RootLayout;