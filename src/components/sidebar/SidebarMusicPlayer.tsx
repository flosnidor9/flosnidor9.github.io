'use client';

import { motion, useTransform, useMotionTemplate, type MotionValue } from 'framer-motion';
import RotatingCD from '../music-player/RotatingCD';
import { getYouTubeThumbnail } from '@/lib/data/music';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';

type Props = {
  normX: MotionValue<number>;
  normY: MotionValue<number>;
  variant?: 'sidebar' | 'bar'; // sidebar: 세로 레이아웃 (데스크톱), bar: 가로 레이아웃 (모바일 portrait)
};

/**
 * 사이드바용 컴팩트 음악 플레이어
 * - 전역 MusicPlayerContext 사용 (YouTube Player는 GlobalMusicPlayer에서 관리)
 */
export default function SidebarMusicPlayer({ normX, normY, variant = 'sidebar' }: Props) {
  const {
    isPlaying,
    isMuted,
    volume,
    currentTrack,
    togglePlay,
    toggleMute,
    handleVolumeChange,
    showVolumeSlider,
    setShowVolumeSlider,
  } = useMusicPlayer();

  if (!currentTrack) return null;

  // 반사 하이라이트
  const reflectX = useTransform(normX, [-0.5, 0.5], [72, 28]);
  const reflectY = useTransform(normY, [-0.5, 0.5], [28, 72]);
  const reflectGradient = useMotionTemplate`radial-gradient(ellipse at ${reflectX}% ${reflectY}%, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.03) 35%, transparent 62%)`;

  const albumArt = getYouTubeThumbnail(currentTrack.id);
  const isBar = variant === 'bar';

  return (
    <motion.div
      className="glass-player-panel relative w-full rounded-[1rem] overflow-hidden"
      initial={{ opacity: 0, x: isBar ? 0 : -30, y: isBar ? 20 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
    >
      {/* 블러 오버레이 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      />

      {/* 메인 콘텐츠 */}
      <div className={`relative z-10 flex ${isBar ? 'flex-row items-center gap-[0.75rem] p-[0.75rem]' : 'flex-col items-center gap-[1rem] p-[1.25rem]'}`}>
        {/* CD 아트 */}
        <button
          onClick={togglePlay}
          className={`cursor-pointer focus:outline-none ${isBar ? 'flex-shrink-0' : ''}`}
          aria-label={isPlaying ? '일시정지' : '재생'}
        >
          <RotatingCD
            albumArt={albumArt}
            isPlaying={isPlaying}
            normX={normX}
            normY={normY}
            size={isBar ? 'tiny' : 'small'}
          />
        </button>

        {/* 트랙 정보 + 컨트롤 */}
        <div className={`flex ${isBar ? 'flex-row items-center gap-[0.75rem] flex-1 min-w-0' : 'flex-col items-center gap-[1rem] w-full'}`}>
          {/* 트랙 정보 */}
          <div className={`flex flex-col ${isBar ? 'items-start flex-1 min-w-0' : 'items-center w-full'} gap-[0.25rem] ${isBar ? 'text-left' : 'text-center'}`}>
            <h4 className={`font-serif ${isBar ? 'text-[0.85rem]' : 'text-[1rem]'} text-white/90 truncate w-full`}>{currentTrack.title}</h4>
            {currentTrack.artist && (
              <p className={`font-sans ${isBar ? 'text-[0.65rem]' : 'text-[0.75rem]'} text-white/50 truncate w-full`}>{currentTrack.artist}</p>
            )}
          </div>

          {/* 컨트롤 */}
          <div className={`flex items-center gap-[0.75rem] ${isBar ? 'flex-shrink-0' : 'w-full'}`}>
          {/* 재생 상태 - bar 모드에서는 숨김 */}
          {!isBar && (
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
          )}

          <div className="flex items-center gap-[0.5rem]">
            {/* 음소거 버튼 */}
            <button
              onClick={toggleMute}
              className={`flex items-center justify-center ${isBar ? 'w-[1.75rem] h-[1.75rem]' : 'w-[1.5rem] h-[1.5rem]'} rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer`}
              aria-label={isMuted ? '음소거 해제' : '음소거'}
            >
              {isMuted ? (
                <svg width={isBar ? "14" : "12"} height={isBar ? "14" : "12"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg width={isBar ? "14" : "12"} height={isBar ? "14" : "12"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/70">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            {/* 음량 조절 버튼 */}
            <button
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className={`flex items-center justify-center ${isBar ? 'w-[1.75rem] h-[1.75rem]' : 'w-[1.5rem] h-[1.5rem]'} rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer`}
              aria-label="음량 조절"
            >
              <svg width={isBar ? "14" : "12"} height={isBar ? "14" : "12"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/70">
                <path d="M12 2v20M17 7v10M7 10v4" />
              </svg>
            </button>
          </div>
          </div>
        </div>

        {/* 음량 슬라이더 */}
        {showVolumeSlider && (
          <motion.div
            className={`${isBar ? 'absolute bottom-full left-0 right-0 mb-[0.5rem]' : ''} w-full flex items-center gap-[0.5rem] ${isBar ? 'p-[0.5rem] glass-player-panel rounded-[0.5rem]' : ''}`}
            initial={{ opacity: 0, height: isBar ? 'auto' : 0, y: isBar ? 10 : 0 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: isBar ? 'auto' : 0, y: isBar ? 10 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-[0.7rem] text-white/50 min-w-[2rem]">{volume}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              className="flex-1 h-[0.3rem] rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.5) ${volume}%, rgba(255,255,255,0.1) ${volume}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
          </motion.div>
        )}
      </div>

      {/* 반사 하이라이트 */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-[inherit]"
        style={{ background: reflectGradient, zIndex: 20 }}
      />
    </motion.div>
  );
}
