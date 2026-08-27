'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useMemo } from 'react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { label: '성향표', href: '/afterTheRoll', exact: true, icon: 'folder' },
  { label: '캘린더', href: '/afterTheRoll/calendar', exact: false, icon: 'table' },
  { label: '플레이 목록', href: '/afterTheRoll/plays', exact: false, icon: 'table' },
  { label: '도토리 목록', href: '/afterTheRoll/acorns', exact: false, icon: 'table' },
  { label: '공수표 목록', href: '/afterTheRoll/promises', exact: false, icon: 'folder' },
  { label: '로그', href: '/afterTheRoll/logs', exact: false, icon: 'folder' },
  { label: '방명록', href: '/afterTheRoll/guestbook', exact: false, icon: 'folder' },
] as const;

function normalizePath(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function getActiveItem(pathname: string) {
  const path = normalizePath(pathname);
  return (
    NAV_ITEMS.find((item) => {
      if (item.exact) return path === item.href;
      if (item.href === '/afterTheRoll/logs') {
        return path === item.href || path.startsWith('/afterTheRoll/archive');
      }
      return path === item.href || path.startsWith(`${item.href}/`);
    }) ?? NAV_ITEMS[0]
  );
}

function getBreadcrumbs(pathname: string, activeLabel: string) {
  const path = normalizePath(pathname);
  if (path.startsWith('/afterTheRoll/archive/read')) return ['AfterTheRoll', '로그', '본문'];
  return ['AfterTheRoll', activeLabel];
}

export default function AfterTheRollShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeItem = useMemo(() => getActiveItem(pathname), [pathname]);
  const breadcrumbs = useMemo(
    () => getBreadcrumbs(pathname, activeItem.label),
    [activeItem.label, pathname],
  );

  return (
    <div className="atr-file-shell">
      <aside className="atr-file-sidebar" aria-label="AfterTheRoll navigation">
        <Link href="/afterTheRoll" className="atr-file-brand">
          <span className="atr-folder-icon" aria-hidden="true" />
          <span>AfterTheRoll</span>
        </Link>

        <nav className="atr-file-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === activeItem.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  isActive ? 'atr-file-nav-item atr-file-nav-active' : 'atr-file-nav-item'
                }
              >
                <span
                  className={item.icon === 'table' ? 'atr-table-icon' : 'atr-folder-icon'}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
                {isActive ? (
                  <motion.span layoutId="atr-file-active" className="atr-file-active-mark" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="atr-sidebar-section">
          <p>아카이브</p>
          <span>세션 기록 보관함</span>
        </div>
      </aside>

      <section className="atr-file-window">
        <header className="atr-file-titlebar">
          <div className="atr-window-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="atr-pathbar" aria-label="현재 경로">
            {breadcrumbs.map((crumb, index) => (
              <span key={`${crumb}-${index}`}>
                {index > 0 ? <b>/</b> : null}
                {crumb}
              </span>
            ))}
          </div>
        </header>

        <main className="atr-file-content">{children}</main>

        <footer className="atr-file-statusbar">
          <span>{activeItem.label}</span>
          <span>폴더 아카이브</span>
        </footer>
      </section>
    </div>
  );
}
