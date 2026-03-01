import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import LiquidCursor from "@/components/cursor/LiquidCursor";
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
  title: "Personal Archive",
  description: "개인 자료를 보관하고, 감상하고, 전시하기 위한 공간",
  openGraph: {
    title: "Personal Archive",
    description: "개인 자료를 보관하고, 감상하고, 전시하기 위한 공간",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Personal Archive",
    description: "개인 자료를 보관하고, 감상하고, 전시하기 위한 공간",
  },
};

export default function RootLayout({
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
          <LiquidCursor />
          {children}
        </Providers>
      </body>
    </html>
  );
}
