import type { Metadata } from "next";
import "../globals.css";
import GNB from "@/components/layout/GNB";
import PersistentHeroBackground from "@/components/hero/PersistentHeroBackground";
import { getFavoriteImagePaths } from "@/lib/data/images";
import Providers from "@/components/providers/Providers";

export const metadata: Metadata = {
  title: "Bubble Home | Personal Archive",
  description: "물방울처럼 둥둥 떠다니는 추억들",
  openGraph: {
    title: "Bubble Home | Personal Archive",
    description: "물방울처럼 둥둥 떠다니는 추억들",
    type: "website",
  },
};

export default function BubbleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const imagePaths = getFavoriteImagePaths();

  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <Providers>
          <PersistentHeroBackground imagePaths={imagePaths} />
          <GNB />
          {children}
        </Providers>
      </body>
    </html>
  );
}
