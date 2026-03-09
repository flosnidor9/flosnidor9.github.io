import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "../globals.css";
import CursorManager from "@/components/cursor/CursorManager";
import GNB from "@/components/layout/GNB";
import PersistentHeroBackground from "@/components/hero/PersistentHeroBackground";
import { getFavoriteImagePaths } from "@/lib/data/images";
import Providers from "@/components/providers/Providers";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

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
      <body className={`${cormorant.variable} ${inter.variable} antialiased`}>
        <Providers>
          <PersistentHeroBackground imagePaths={imagePaths} />
          <GNB />
          <CursorManager />
          {children}
        </Providers>
      </body>
    </html>
  );
}
