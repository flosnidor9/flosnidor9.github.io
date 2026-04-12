import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Noto_Sans_KR } from 'next/font/google';
import '../globals.css';
import Providers from '@/components/providers/Providers';

const ongleipKonkon = localFont({
  variable: '--font-hand',
  src: '../fonts/ongleip-konkon.ttf',
  display: 'swap',
});

const notoSansKr = Noto_Sans_KR({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
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
      <body className={`${ongleipKonkon.variable} ${notoSansKr.variable} after-roll-theme antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
