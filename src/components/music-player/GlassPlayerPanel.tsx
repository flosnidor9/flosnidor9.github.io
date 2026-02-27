'use client';

import { useState, useRef } from 'react';
import { motion, useTransform, useMotionTemplate, type MotionValue } from 'framer-motion';
import RotatingCD from './RotatingCD';
import YouTubeEmbed, { type YouTubeEmbedRef } from './YouTubeEmbed';
import { getYouTubeThumbnail, type MusicTrack } from '@/lib/data/music';

type Props = {
  track: MusicTrack;
  normX: MotionValue<number>;
  normY: MotionValue<number>;
};

/**
 * 유리 패널 플레이어 UI
 * - YouTube 배경 (블러 처리)
 * - 앨범 아트 + 회전 CD (클릭하여 재생/일시정지)
 * - 반사 하이라이트
 */
export default function GlassPlayerPanel({ track, normX, normY }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // 자동재생은 음소거로 시작
  const playerRef = useRef<YouTubeEmbedRef>(null);

  // 반사 하이라이트 (FeaturedCard 패턴 재사용)
  const reflectX = useTransform(normX, [-0.5, 0.5], [72, 28]);
  const reflectY = useTransform(normY, [-0.5, 0.5], [28, 72]);
  const reflectGradient = useMotionTemplate`radial-gradient(ellipse at ${reflectX}% ${reflectY}%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 35%, transparent 62%)`;

  const albumArt = getYouTubeThumbnail(track.id);

  const handleToggle = () => {
    playerRef.current?.toggle();
  };

  const handleMuteToggle = () => {
    const newMuted = playerRef.current?.toggleMute();
    if (newMuted !== undefined) {
      setIsMuted(newMuted);
    }
  };

  return (
    <motion.div className="glass-player-panel relative w-full h-full rounded-[1.5rem] overflow-hidden">
      {/* YouTube 배경 (블러 + 저투명도) */}
      <div className="absolute inset-0 opacity-30 scale-110 pointer-events-none">
        <YouTubeEmbed ref={playerRef} videoId={track.id} onStateChange={setIsPlaying} />
      </div>

      {/* 블러 오버레이 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      />

      {/* 메인 콘텐츠 - 반응형 레이아웃 */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-[2rem] h-full p-[2rem]">
        {/* 앨범 아트 + CD (클릭하여 토글) */}
        <button
          onClick={handleToggle}
          className="cursor-pointer focus:outline-none"
          aria-label={isPlaying ? '일시정지' : '재생'}
        >
          <RotatingCD
            albumArt={albumArt}
            isPlaying={isPlaying}
            normX={normX}
            normY={normY}
          />
        </button>

        {/* 트랙 정보 */}
        <div className="flex flex-col items-center md:items-start gap-[0.5rem]">
          <h3 className="font-serif text-[1.5rem] text-white/90">{track.title}</h3>
          {track.artist && (
            <p className="font-sans text-[0.9rem] text-white/60">{track.artist}</p>
          )}
          <div className="flex items-center gap-[0.75rem] mt-[0.5rem]">
            {/* 재생 상태 */}
            <div className="flex items-center gap-[0.5rem]">
              <span
                className="w-[0.5rem] h-[0.5rem] rounded-full"
                style={{
                  background: isPlaying ? '#4ade80' : 'rgba(255,255,255,0.3)',
                  boxShadow: isPlaying ? '0 0 8px #4ade80' : 'none',
                }}
              />
              <span className="text-[0.75rem] text-white/50">
                {isPlaying ? 'Now Playing' : 'Paused'}
              </span>
            </div>

            {/* 음소거 토글 버튼 */}
            <button
              onClick={handleMuteToggle}
              className="flex items-center justify-center w-[1.75rem] h-[1.75rem] rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              aria-label={isMuted ? '음소거 해제' : '음소거'}
            >
              {isMuted ? (
                // 음소거 아이콘
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                // 볼륨 아이콘
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 유리 반사 하이라이트 */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{
          background: reflectGradient,
          zIndex: 20,
        }}
      />

      {/* 그레인 텍스처 */}
      <div className="absolute inset-0 grain-texture pointer-events-none" />
    </motion.div>
  );
}
