'use client';

import { useEffect, useState } from 'react';
import YouTubeEmbed from './YouTubeEmbed';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

/**
 * 전역 음악 플레이어
 * - Layout 레벨에서 한 번만 렌더링
 * - 페이지 전환이나 화면 회전에도 음악이 끊기지 않음
 * - 화면에 보이지 않음 (display: none)
 */
export default function GlobalMusicPlayer() {
  const { currentTrack, playerRef, setIsPlaying, volume } = useMusicPlayer();
  const [isVolumeReady, setIsVolumeReady] = useState(false);

  useEffect(() => {
    // volume이 Context에서 로드되면 준비 완료
    setIsVolumeReady(true);
  }, []);

  if (!currentTrack || !isVolumeReady) return null;

  return (
    <div style={{ display: 'none' }}>
      <YouTubeEmbed
        ref={playerRef}
        videoId={currentTrack.id}
        initialVolume={volume}
        onStateChange={setIsPlaying}
      />
    </div>
  );
}
