import type { Metadata } from 'next';
import localFont from 'next/font/local';
import '../globals.css';
import Providers from '@/components/providers/Providers';

const ongleipKonkon = localFont({
  variable: '--font-hand',
  src: '../fonts/ongleip-konkon.ttf',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'After the Roll | Personal Archive',
  description: '태그를 고르면 원하는 분류만 남겨서 볼 수 있습니다.',
  openGraph: {
    title: 'After the Roll | Personal Archive',
    description: '태그를 고르면 원하는 분류만 남겨서 볼 수 있습니다.',
    type: 'website',
  },
};

export default function LedgerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${ongleipKonkon.variable} after-roll-theme antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
