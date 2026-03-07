'use client';

import { usePathname } from 'next/navigation';
import LiquidCursor from './LiquidCursor';
import ClassicCursor from './ClassicCursor';

/**
 * 경로에 따라 적절한 커서를 렌더링하는 매니저
 */
export default function CursorManager() {
  const pathname = usePathname();

  // 메인 페이지(/)에서는 고전 커서 사용
  if (pathname === '/') {
    return <ClassicCursor />;
  }

  // 그 외 페이지에서는 리퀴드 커서 사용
  return <LiquidCursor />;
}
