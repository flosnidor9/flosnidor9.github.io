'use client';

import type { ReactNode } from 'react';
import AfterTheRollShell from '@/components/afterroll/AfterTheRollShell';

export default function AfterTheRollLayout({ children }: { children: ReactNode }) {
  return <AfterTheRollShell>{children}</AfterTheRollShell>;
}
