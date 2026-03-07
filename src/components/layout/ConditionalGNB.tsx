'use client';

import { usePathname } from 'next/navigation';
import GNB from './GNB';

/**
 * 경로에 따라 GNB를 조건부로 렌더링
 * bubbleHome 하위 페이지에서만 표시
 */
export default function ConditionalGNB() {
  const pathname = usePathname();

  // bubbleHome 하위 페이지에서만 GNB 표시
  const shouldShowGNB = pathname.startsWith('/bubbleHome');

  if (!shouldShowGNB) {
    return null;
  }

  return <GNB />;
}
