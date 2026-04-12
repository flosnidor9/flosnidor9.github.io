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
    <nav className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center px-[1rem] py-[0.9rem] md:px-[2rem]">
      <ul className="flex items-center gap-[2.5rem]">
        {NAV_ITEMS.map(({ label, href }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="relative">
              <Link
                href={href}
                className="ledger-paper-panel ledger-dashed relative inline-block rounded-[0.5rem] px-[1.1rem] py-[0.48rem] text-[1.2rem] leading-none transition-transform duration-200"
                style={{
                  color: isActive ? 'var(--ledger-ink)' : 'var(--ledger-muted)',
                  transform: hoveredHref === href ? 'translateY(-0.04rem) rotate(-1deg)' : 'rotate(0deg)',
                  fontFamily: 'var(--font-hand)',
                }}
                onMouseEnter={() => setHoveredHref(href)}
                onMouseLeave={() => setHoveredHref(null)}
              >
                {label}

                {isActive ? (
                  <motion.span
                    layoutId="ledger-nav-active"
                    className="absolute inset-x-[0.7rem] bottom-[0.28rem] h-[0.12rem] rounded-full bg-[var(--ledger-accent)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                ) : null}

                {!isActive && hoveredHref === href ? (
                  <motion.span
                    layoutId="ledger-nav-hover"
                    className="absolute inset-x-[0.85rem] bottom-[0.32rem] h-[0.08rem] rounded-full bg-[var(--ledger-accent-soft)]"
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
