'use client';

import { createContext, useContext, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { type YouTubeEmbedRef } from '@/components/music-player/YouTubeEmbed';
import { musicTracks } from '@/lib/data/music';

const VOLUME_STORAGE_KEY = 'music-player-volume';

type MusicPlayerContextType = {
  // Player 상태
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTrack: typeof musicTracks[0] | null;

  // Player 제어
  playerRef: React.RefObject<YouTubeEmbedRef>;
  setIsPlaying: (playing: boolean) => void;
  setIsMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;

  // UI 제어
  showVolumeSlider: boolean;
  setShowVolumeSlider: (show: boolean) => void;

  // 메서드
  togglePlay: () => void;
  toggleMute: () => void;
  handleVolumeChange: (volume: number) => void;
};

const MusicPlayerContext = createContext<MusicPlayerContextType | null>(null);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(20);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isVolumeReady, setIsVolumeReady] = useState(false);
  const playerRef = useRef<YouTubeEmbedRef>(null);

  const currentTrack = musicTracks[0] || null;

  // localStorage에서 볼륨 로드
  useEffect(() => {
    const savedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (savedVolume) {
      const volumeValue = parseInt(savedVolume, 10);
      if (!isNaN(volumeValue) && volumeValue >= 0 && volumeValue <= 100) {
        setVolume(volumeValue);
      }
    }
    setIsVolumeReady(true);
  }, []);

  // 볼륨 변경 시 localStorage 저장
  useEffect(() => {
    if (isVolumeReady) {
      localStorage.setItem(VOLUME_STORAGE_KEY, volume.toString());
    }
  }, [volume, isVolumeReady]);

  const togglePlay = useCallback(() => {
    playerRef.current?.toggle();
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = playerRef.current?.toggleMute();
    if (newMuted !== undefined) {
      setIsMuted(newMuted);

      // 음소거 해제 시 자동으로 재생 시작
      if (!newMuted && !isPlaying) {
        playerRef.current?.toggle();
      }
    }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    playerRef.current?.setVolume(newVolume);

    // 볼륨 변경 시 자동 unmute
    if (isMuted && newVolume > 0) {
      const newMuted = playerRef.current?.toggleMute();
      if (newMuted !== undefined) {
        setIsMuted(newMuted);

        // 음소거 해제 시 자동으로 재생 시작
        if (!newMuted && !isPlaying) {
          playerRef.current?.toggle();
        }
      }
    }
  }, [isMuted, isPlaying]);

  const value: MusicPlayerContextType = {
    isPlaying,
    isMuted,
    volume,
    currentTrack,
    playerRef,
    setIsPlaying,
    setIsMuted,
    setVolume,
    showVolumeSlider,
    setShowVolumeSlider,
    togglePlay,
    toggleMute,
    handleVolumeChange,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  }
  return context;
}
