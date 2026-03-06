'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, useTransform, useMotionTemplate, type MotionValue } from 'framer-motion';
import RotatingCD from './RotatingCD';
import YouTubeEmbed, { type YouTubeEmbedRef } from './YouTubeEmbed';
import { getYouTubeThumbnail, type MusicTrack } from '@/lib/data/music';

// localStorage 키
const VOLUME_STORAGE_KEY = 'music-player-volume';

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
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [volume, setVolume] = useState(50); // 서버/클라이언트 모두 50으로 시작
  const [isVolumeReady, setIsVolumeReady] = useState(false); // localStorage 로드 완료 여부
  const playerRef = useRef<YouTubeEmbedRef>(null);

  // 클라이언트에서 localStorage 읽기 (hydration 후)
  useEffect(() => {
    const savedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (savedVolume) {
      const parsedVolume = parseInt(savedVolume, 10);
      if (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 100) {
        setVolume(parsedVolume);
      }
    }
    // localStorage 로드 완료 (값이 있든 없든)
    setIsVolumeReady(true);
  }, []);

  // 반사 하이라이트 (FeaturedCard 패턴 재사용)
  const reflectX = useTransform(normX, [-0.5, 0.5], [72, 28]);
  const reflectY = useTransform(normY, [-0.5, 0.5], [28, 72]);
  const reflectGradient = useMotionTemplate`radial-gradient(ellipse at ${reflectX}% ${reflectY}%, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.05) 35%, transparent 62%)`;

  const albumArt = getYouTubeThumbnail(track.id);

  const handleToggle = () => {
    playerRef.current?.toggle();
  };

  // YouTube Player 준비 완료 시
  const handlePlayerReady = () => {
    // Player 준비 완료
  };

  const handleMuteToggle = () => {
    const newMuted = playerRef.current?.toggleMute();
    if (newMuted !== undefined) {
      setIsMuted(newMuted);
      // unmute 시 저장된 볼륨 적용 (onReady에서 이미 설정되어 있지만 재확인)
      if (!newMuted && playerRef.current) {
        setTimeout(() => {
          playerRef.current?.setVolume(volume);
        }, 50);
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    // localStorage에 즉시 저장
    localStorage.setItem(VOLUME_STORAGE_KEY, newVolume.toString());

    // 볼륨을 변경하면 자동으로 unmute
    if (isMuted && newVolume > 0) {
      const newMuted = playerRef.current?.toggleMute();
      if (newMuted !== undefined) {
        setIsMuted(newMuted);
      }
    }

    // volume state 업데이트 (useEffect에서 Player에 자동 반영됨)
    setVolume(newVolume);
  };

  return (
    <motion.div className="glass-player-panel relative w-full h-full rounded-[1.5rem] overflow-hidden">
      {/* YouTube 배경 (블러 + 저투명도) */}
      <div className="absolute inset-0 opacity-30 scale-110 pointer-events-none">
        {/* localStorage 로드 완료 후에만 Player 렌더링 */}
        {isVolumeReady && (
          <YouTubeEmbed
            ref={playerRef}
            videoId={track.id}
            initialVolume={volume}
            onStateChange={setIsPlaying}
            onReady={handlePlayerReady}
          />
        )}
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

            {/* 볼륨 컨트롤 */}
            <div className="flex items-center gap-[0.5rem] relative">
              {/* 음소거 토글 버튼 */}
              <button
                onClick={handleMuteToggle}
                onMouseEnter={() => setShowVolumeSlider(true)}
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

              {/* 볼륨 슬라이더 */}
              {showVolumeSlider && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: '6rem' }}
                  exit={{ opacity: 0, width: 0 }}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                  className="flex items-center gap-[0.5rem] overflow-hidden"
                >
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                    className="w-full h-[0.25rem] bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[0.75rem] [&::-webkit-slider-thumb]:h-[0.75rem] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-[0.75rem] [&::-moz-range-thumb]:h-[0.75rem] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white/80 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    aria-label="볼륨 조절"
                  />
                  <span className="text-[0.7rem] text-white/50 min-w-[2rem]">{volume}</span>
                </motion.div>
              )}
            </div>
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
    </motion.div>
  );
}
