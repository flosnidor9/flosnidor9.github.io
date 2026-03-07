'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { label: 'Home', href: '/filmHome' },
  { label: 'Gallery', href: '/filmHome/gallery' },
  { label: 'Archive', href: '/filmHome/archive' },
  { label: 'About', href: '/filmHome/about' },
];

export default function FilmGNB() {
  const pathname = usePathname();
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  return (
    <nav className="film-gnb fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-[3.5rem] px-[2rem]">
      {/* 필름 스트립 상단 테두리 */}
      <div className="absolute top-0 left-0 right-0 h-[0.25rem] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <ul className="flex items-center gap-[2.5rem]">
        {NAV_ITEMS.map(({ label, href }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

          return (
            <li key={href} className="relative">
              <Link
                href={href}
                className="relative inline-block py-[0.5rem] font-serif text-[0.95rem] font-light tracking-[0.08em] transition-colors duration-300"
                style={{
                  color: isActive
                    ? 'rgba(255,255,255,0.95)'
                    : 'rgba(255,255,255,0.55)',
                }}
                onMouseEnter={() => setHoveredHref(href)}
                onMouseLeave={() => setHoveredHref(null)}
              >
                {label}

                {/* Active 밑줄 */}
                {isActive && (
                  <motion.span
                    layoutId="film-nav-active"
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: 'rgba(255,255,255,0.6)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Hover 밑줄 (active 아닐 때만) */}
                {!isActive && hoveredHref === href && (
                  <motion.span
                    layoutId="film-nav-hover"
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{ background: 'rgba(255,255,255,0.25)' }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
