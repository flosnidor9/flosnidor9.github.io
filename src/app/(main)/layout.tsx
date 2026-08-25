import type { Metadata } from "next";
import "../globals.css";
import PersistentHeroBackground from "@/components/hero/PersistentHeroBackground";
import { getMainHomeImagePaths } from "@/lib/data/images";
import Providers from "@/components/providers/Providers";

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

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const imagePaths = getMainHomeImagePaths();

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
          {children}
        </Providers>
      </body>
    </html>
  );
}
