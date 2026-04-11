'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { label: 'Home', href: '/afterTheRoll' },
];

export default function LedgerGNB() {
  const pathname = usePathname();
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);

  return (
    <nav className="film-gnb fixed top-0 left-0 right-0 z-50 flex items-center justify-center h-[3.5rem] px-[2rem]">
      <div className="absolute top-0 left-0 right-0 h-[0.25rem] bg-gradient-to-r from-transparent via-amber-200/20 to-transparent" />

      <ul className="flex items-center gap-[2.5rem]">
        {NAV_ITEMS.map(({ label, href }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="relative">
              <Link
                href={href}
                className="relative inline-block py-[0.5rem] font-serif text-[0.95rem] font-light tracking-[0.08em] transition-colors duration-300"
                style={{
                  color: isActive ? 'rgba(255,244,228,0.94)' : 'rgba(255,232,205,0.55)',
                }}
                onMouseEnter={() => setHoveredHref(href)}
                onMouseLeave={() => setHoveredHref(null)}
              >
                {label}

                {isActive ? (
                  <motion.span
                    layoutId="ledger-nav-active"
                    className="absolute bottom-0 left-0 right-0 h-px bg-amber-100/60"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                ) : null}

                {!isActive && hoveredHref === href ? (
                  <motion.span
                    layoutId="ledger-nav-hover"
                    className="absolute bottom-0 left-0 right-0 h-px bg-amber-100/30"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
