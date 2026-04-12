'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import LiquidCursor from './LiquidCursor';
import ClassicCursor from './ClassicCursor';
import FilmFrameCursor from './FilmFrameCursor';

export default function CursorManager() {
  const pathname = usePathname();
  const useClassicCursor = pathname === '/' || pathname.startsWith('/afterTheRoll');

  useEffect(() => {
    document.documentElement.classList.add('custom-cursor-active');
    document.body.classList.add('custom-cursor-active');

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      document.body.classList.remove('custom-cursor-active');
    };
  }, []);

  if (useClassicCursor) {
    return <ClassicCursor />;
  }

  if (pathname.startsWith('/filmHome')) {
    return <FilmFrameCursor />;
  }

  return <LiquidCursor />;
}
