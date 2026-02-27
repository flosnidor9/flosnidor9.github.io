'use client';

import { useState, useRef } from 'react';
import { motion, useTransform, useMotionTemplate, type MotionValue } from 'framer-motion';
import RotatingCD from '../music-player/RotatingCD';
import YouTubeEmbed, { type YouTubeEmbedRef } from '../music-player/YouTubeEmbed';
import { getYouTubeThumbnail, type MusicTrack } from '@/lib/data/music';

type Props = {
  track: MusicTrack;
  normX: MotionValue<number>;
  normY: MotionValue<number>;
};

/**
 * 사이드바용 컴팩트 음악 플레이어
 */
export default function SidebarMusicPlayer({ track, normX, normY }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const playerRef = useRef<YouTubeEmbedRef>(null);

  // 반사 하이라이트
  const reflectX = useTransform(normX, [-0.5, 0.5], [72, 28]);
  const reflectY = useTransform(normY, [-0.5, 0.5], [28, 72]);
  const reflectGradient = useMotionTemplate`radial-gradient(ellipse at ${reflectX}% ${reflectY}%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.03) 35%, transparent 62%)`;

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
    <motion.div
      className="glass-player-panel relative w-full rounded-[1rem] overflow-hidden"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
    >
      {/* YouTube 배경 (블러 + 저투명도) */}
      <div className="absolute inset-0 opacity-20 scale-125 pointer-events-none">
        <YouTubeEmbed ref={playerRef} videoId={track.id} onStateChange={setIsPlaying} />
      </div>

      {/* 블러 오버레이 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      />

      {/* 메인 콘텐츠 */}
      <div className="relative z-10 flex flex-col items-center gap-[1rem] p-[1.25rem]">
        {/* CD 아트 */}
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
            size="small"
          />
        </button>

        {/* 트랙 정보 */}
        <div className="flex flex-col items-center gap-[0.25rem] text-center w-full">
          <h4 className="font-serif text-[1rem] text-white/90 truncate w-full">{track.title}</h4>
          {track.artist && (
            <p className="font-sans text-[0.75rem] text-white/50 truncate w-full">{track.artist}</p>
          )}
        </div>

        {/* 컨트롤 */}
        <div className="flex items-center gap-[0.75rem]">
          {/* 재생 상태 */}
          <div className="flex items-center gap-[0.4rem]">
            <span
              className="w-[0.4rem] h-[0.4rem] rounded-full"
              style={{
                background: isPlaying ? '#4ade80' : 'rgba(255,255,255,0.3)',
                boxShadow: isPlaying ? '0 0 6px #4ade80' : 'none',
              }}
            />
            <span className="text-[0.65rem] text-white/40">
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>

          {/* 음소거 버튼 */}
          <button
            onClick={handleMuteToggle}
            className="flex items-center justify-center w-[1.5rem] h-[1.5rem] rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            aria-label={isMuted ? '음소거 해제' : '음소거'}
          >
            {isMuted ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/70">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 반사 하이라이트 */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{ background: reflectGradient, zIndex: 20 }}
      />
    </motion.div>
  );
}
