'use client';

import type { ReactNode } from 'react';
import LedgerGNB from '@/components/layout/LedgerGNB';

export default function AfterTheRollLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <LedgerGNB />
      {children}
    </>
  );
}
