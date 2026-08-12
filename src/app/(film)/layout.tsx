import type { Metadata } from "next";
import "../globals.css";
import Providers from "@/components/providers/Providers";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="film-fonts antialiased bg-[var(--film-bg)]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
