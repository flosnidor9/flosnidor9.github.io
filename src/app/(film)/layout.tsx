import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "../globals.css";
import Providers from "@/components/providers/Providers";
import FilmFrameCursor from "@/components/cursor/FilmFrameCursor";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Film Home | Personal Archive",
  description: "영화처럼 흘러가는 순간들",
  openGraph: {
    title: "Film Home | Personal Archive",
    description: "영화처럼 흘러가는 순간들",
    type: "website",
  },
};

export default function FilmLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${playfair.variable} ${inter.variable} antialiased bg-black`}>
        <Providers>
          <FilmFrameCursor />
          {children}
        </Providers>
      </body>
    </html>
  );
}
