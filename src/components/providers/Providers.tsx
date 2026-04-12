'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import CursorManager from '@/components/cursor/CursorManager';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CursorManager />
      {children}
    </AuthProvider>
  );
}
