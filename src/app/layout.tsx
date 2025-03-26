import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from './components/ThemeProvider';
import MainLayout from './components/MainLayout';

const inter = Inter({ subsets: ['latin'] });

// page.tsx에서 가져온 metadata를 layout.tsx로 이동
export const metadata: Metadata = {
  title: 'Typing Statistics',
  description: 'Track and analyze your keyboard usage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}