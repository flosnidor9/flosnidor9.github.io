'use client';

import { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <MusicPlayerProvider>{children}</MusicPlayerProvider>
    </AuthProvider>
  );
}
