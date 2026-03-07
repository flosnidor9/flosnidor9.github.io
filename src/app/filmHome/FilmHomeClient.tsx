'use client';

import { useState, useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import Image from 'next/image';
import FilmGNB from '@/components/layout/FilmGNB';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { musicTracks } from '@/lib/data/music';
import RotatingCD from '@/components/music-player/RotatingCD';
import { getYouTubeThumbnail } from '@/lib/data/music';

interface FilmHomeClientProps {
  imagePaths: string[];
}

export default function FilmHomeClient({ imagePaths }: FilmHomeClientProps) {
  const [mounted, setMounted] = useState(false);
  const [randomImage, setRandomImage] = useState<string | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const {
    isPlaying,
    isMuted,
    volume,
    currentTrack,
    togglePlay,
    toggleMute,
    handleVolumeChange,
  } = useMusicPlayer();

  // 마우스 위치 추적 (CD 반사 효과용) - MotionValue 사용
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);

  useEffect(() => {
    setMounted(true);

    // 랜덤 이미지 선택
    if (imagePaths.length > 0) {
      const randomIndex = Math.floor(Math.random() * imagePaths.length);
      setRandomImage(imagePaths[randomIndex]);
    }

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      normX.set(x);
      normY.set(y);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [imagePaths, normX, normY]);

  if (!mounted) return null;

  const track = currentTrack || musicTracks[0];
  const albumArt = track ? getYouTubeThumbnail(track.id) : '';

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* 배경 이미지 */}
      {randomImage && (
        <div className="absolute inset-0">
          <Image
            src={randomImage}
            alt="Film Background"
            fill
            className="object-cover"
            style={{ filter: 'sepia(0.3) brightness(0.7)' }}
            priority
          />
        </div>
      )}

      {/* 비네팅 효과 (가장자리 어둡게) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* 필름 그레인 텍스처 */}
      <div className="absolute inset-0 grain-texture pointer-events-none opacity-60" />

      {/* 필름 스트립 효과 - 좌우 */}
      <div className="absolute top-0 bottom-0 left-0 w-[2.5rem] flex flex-col justify-evenly bg-black/40 backdrop-blur-sm pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`left-${i}`}
            className="w-full h-[1rem] bg-gradient-to-r from-white/10 to-white/5 border-t border-b border-white/5"
          />
        ))}
      </div>
      <div className="absolute top-0 bottom-0 right-0 w-[2.5rem] flex flex-col justify-evenly bg-black/40 backdrop-blur-sm pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`right-${i}`}
            className="w-full h-[1rem] bg-gradient-to-l from-white/10 to-white/5 border-t border-b border-white/5"
          />
        ))}
      </div>

      {/* GNB */}
      <FilmGNB />

      {/* 왼쪽 고정 뮤직 플레이어 */}
      <motion.div
        className="fixed left-[4rem] top-1/2 -translate-y-1/2 z-40"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex flex-col items-center gap-[1.5rem] p-[2rem] rounded-[1.5rem] bg-black/30 backdrop-blur-md border border-white/10">
          {/* CD 앨범 아트 (클릭하여 재생/일시정지) */}
          <button
            onClick={togglePlay}
            className="cursor-pointer focus:outline-none"
            aria-label={isPlaying ? '일시정지' : '재생'}
          >
            <div className="w-[12rem] h-[12rem]">
              <RotatingCD
                albumArt={albumArt}
                isPlaying={isPlaying}
                normX={normX}
                normY={normY}
              />
            </div>
          </button>

          {/* 트랙 정보 */}
          <div className="flex flex-col items-center gap-[0.5rem] w-full max-w-[12rem]">
            <h3 className="font-serif text-[1rem] text-white/90 text-center truncate w-full">
              {track?.title}
            </h3>
            {track?.artist && (
              <p className="font-sans text-[0.75rem] text-white/60 text-center truncate w-full">
                {track.artist}
              </p>
            )}

            {/* 재생 상태 */}
            <div className="flex items-center gap-[0.5rem] mt-[0.5rem]">
              <span
                className="w-[0.5rem] h-[0.5rem] rounded-full"
                style={{
                  background: isPlaying ? '#4ade80' : 'rgba(255,255,255,0.3)',
                  boxShadow: isPlaying ? '0 0 8px #4ade80' : 'none',
                }}
              />
              <span className="text-[0.7rem] text-white/50">
                {isPlaying ? 'Playing' : 'Paused'}
              </span>
            </div>

            {/* 볼륨 컨트롤 */}
            <div className="flex items-center gap-[0.5rem] relative mt-[0.75rem] w-full justify-center">
              {/* 음소거 토글 버튼 */}
              <button
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="flex items-center justify-center w-[2rem] h-[2rem] rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                aria-label={isMuted ? '음소거 해제' : '음소거'}
              >
                {isMuted ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80">
                    <path d="M11 5L6 9H2v6h4l5 4V5z" />
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </button>

              {/* 볼륨 슬라이더 */}
              {showVolumeSlider && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0 }}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                  className="absolute left-1/2 bottom-[2.5rem] -translate-x-1/2 flex flex-col items-center gap-[0.5rem] bg-black/60 backdrop-blur-md rounded-full p-[0.75rem] border border-white/10"
                >
                  <span className="text-[0.7rem] text-white/50 min-h-[1rem]">{volume}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                    className="h-[6rem] w-[0.25rem] bg-white/20 rounded-full appearance-none cursor-pointer [writing-mode:vertical-lr] [direction:rtl] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[0.75rem] [&::-webkit-slider-thumb]:h-[0.75rem] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-[0.75rem] [&::-moz-range-thumb]:h-[0.75rem] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white/80 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                    aria-label="볼륨 조절"
                  />
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 메인 컨텐츠 영역 */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-[2rem] ml-[20rem]">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="font-serif text-[4rem] md:text-[5rem] font-light text-white/90 mb-[1rem]">
            Film Archive
          </h1>
          <p className="font-sans text-[1.1rem] md:text-[1.25rem] font-light text-white/60">
            영화와 필름의 순간들을 기록하다
          </p>
        </motion.div>
      </div>
    </main>
  );
}
