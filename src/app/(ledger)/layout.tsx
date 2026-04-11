import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import '../globals.css';
import Providers from '@/components/providers/Providers';

const playfair = Playfair_Display({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500'],
});

export const metadata: Metadata = {
  title: 'After the Roll | Personal Archive',
  description: 'TRPG 플레이 기록을 차분하게 보관하는 보관소',
  openGraph: {
    title: 'After the Roll | Personal Archive',
    description: 'TRPG 플레이 기록을 차분하게 보관하는 보관소',
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
      <body className={`${playfair.variable} ${inter.variable} antialiased bg-[var(--film-bg)]`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
