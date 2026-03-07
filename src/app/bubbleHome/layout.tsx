'use client';

import { ReactNode } from 'react';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';
import GlobalMusicPlayer from '@/components/music-player/GlobalMusicPlayer';

export default function BubbleHomeLayout({ children }: { children: ReactNode }) {
  return (
    <MusicPlayerProvider>
      <GlobalMusicPlayer />
      {children}
    </MusicPlayerProvider>
  );
}
