'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import FilmGNB from '@/components/layout/FilmGNB';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { musicTracks } from '@/lib/data/music';

interface FilmHomeClientProps {
  imagePaths: string[];
}

export default function FilmHomeClient({ imagePaths }: FilmHomeClientProps) {
  const [mounted, setMounted] = useState(false);
  const [randomImage, setRandomImage] = useState<string | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [time, setTime] = useState<string>('');

  const {
    isPlaying,
    isMuted,
    volume,
    currentTrack,
    togglePlay,
    toggleMute,
    handleVolumeChange,
  } = useMusicPlayer();

  // 재생 버튼 클릭 시 뮤트도 해제
  const handlePlayClick = () => {
    if (!isPlaying && isMuted) {
      toggleMute();
    }
    togglePlay();
  };

  useEffect(() => {
    setMounted(true);

    // 랜덤 이미지 선택
    if (imagePaths.length > 0) {
      const randomIndex = Math.floor(Math.random() * imagePaths.length);
      setRandomImage(imagePaths[randomIndex]);
    }

    // 시계 업데이트
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      setTime(`${displayHours}:${minutes} ${period}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [imagePaths]);

  if (!mounted) return null;

  const track = currentTrack || musicTracks[0];

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

      {/* 데스크톱: 왼쪽 고정 뮤직 플레이어 - 세로 티켓 */}
      <motion.div
        className="hidden md:block fixed left-[4rem] top-1/2 -translate-y-1/2 z-40"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative">
          {/* 왼쪽 톱니 테두리 */}
          <div className="absolute left-0 top-0 bottom-0 w-[0.5rem] flex flex-col justify-between -translate-x-1/2 z-10">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={`left-${i}`}
                className="w-[0.5rem] h-[0.5rem] rounded-full"
                style={{ background: 'black' }}
              />
            ))}
          </div>
          {/* 오른쪽 톱니 테두리 */}
          <div className="absolute right-0 top-0 bottom-0 w-[0.5rem] flex flex-col justify-between translate-x-1/2 z-10">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={`right-${i}`}
                className="w-[0.5rem] h-[0.5rem] rounded-full"
                style={{ background: 'black' }}
              />
            ))}
          </div>

          <div
            className="relative flex flex-col w-[14rem] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1f1d1a 0%, #141210 100%)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            {/* 빈티지 그런지 오버레이 */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-50" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, mixBlendMode: 'overlay' }} />
            {/* 회색 얼룩 효과 */}
            <div className="absolute inset-0 pointer-events-none z-10" style={{ background: `radial-gradient(ellipse at 20% 15%, rgba(255,255,255,0.08) 0%, transparent 40%), radial-gradient(ellipse at 75% 25%, rgba(0,0,0,0.15) 0%, transparent 35%), radial-gradient(ellipse at 85% 75%, rgba(255,255,255,0.06) 0%, transparent 30%), radial-gradient(ellipse at 15% 85%, rgba(0,0,0,0.12) 0%, transparent 45%)` }} />
            {/* 가장자리 어두운 번 효과 */}
            <div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5), inset 0 0 60px rgba(0,0,0,0.25)' }} />
            {/* 먼지/점 효과 */}
            <div className="absolute inset-0 pointer-events-none z-10" style={{ backgroundImage: `radial-gradient(circle at 10% 20%, rgba(255,255,255,0.25) 0px, transparent 1px), radial-gradient(circle at 30% 65%, rgba(255,255,255,0.2) 0px, transparent 1.5px), radial-gradient(circle at 55% 10%, rgba(255,255,255,0.3) 0px, transparent 1px), radial-gradient(circle at 70% 45%, rgba(255,255,255,0.15) 0px, transparent 2px)` }} />

            {/* 상단 - 영화관 정보 */}
            <div className="px-[1.25rem] pt-[1.25rem] pb-[0.75rem]">
              <p className="text-[0.6rem] tracking-[0.2em] text-neutral-500 uppercase">Now Playing</p>
              <h3 className="font-serif text-[1.1rem] text-white/90 mt-[0.25rem] truncate">{track?.title}</h3>
              {track?.artist && <p className="text-[0.75rem] text-neutral-400 mt-[0.15rem] truncate">{track.artist}</p>}
            </div>

            {/* 점선 구분 */}
            <div className="relative px-[0.75rem]">
              <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1rem] h-[1rem] rounded-full z-20" style={{ background: 'black' }} />
              <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-[1rem] h-[1rem] rounded-full z-20" style={{ background: 'black' }} />
              <div className="w-full h-0" style={{ borderTop: '2px dashed rgba(255,255,255,0.15)' }} />
            </div>

            {/* 하단 - 컨트롤 */}
            <div className="px-[1.25rem] py-[1rem]">
              <div className="flex items-center justify-between mb-[0.75rem]">
                <button onClick={handlePlayClick} className="flex items-center gap-[0.5rem] cursor-pointer group" aria-label={isPlaying ? '일시정지' : '재생'}>
                  <div className="w-[2.5rem] h-[2.5rem] rounded-full flex items-center justify-center transition-all group-hover:scale-105" style={{ background: isPlaying ? 'rgba(255,255,255,0.1)' : '#7B0D14' }}>
                    {isPlaying ? (
                      <div className="flex gap-[0.15rem]">
                        <div className="w-[0.2rem] h-[0.7rem] bg-white/80 rounded-sm" />
                        <div className="w-[0.2rem] h-[0.7rem] bg-white/80 rounded-sm" />
                      </div>
                    ) : (
                      <div className="w-0 h-0 ml-[0.1rem]" style={{ borderTop: '0.4rem solid transparent', borderBottom: '0.4rem solid transparent', borderLeft: '0.6rem solid white' }} />
                    )}
                  </div>
                  <span className="text-[0.7rem] text-neutral-400 uppercase tracking-wider">{isPlaying ? 'Playing' : 'Paused'}</span>
                </button>
                <div className="text-right">
                  <p className="text-[0.5rem] text-neutral-500 uppercase">Seat</p>
                  <p className="font-mono text-[0.9rem] text-white/70">A-12</p>
                </div>
              </div>
              <div className="flex items-center gap-[0.5rem]">
                <button onClick={toggleMute} className="w-[1.75rem] h-[1.75rem] rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-white/10" aria-label={isMuted ? '음소거 해제' : '음소거'}>
                  {isMuted ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/70"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                  )}
                </button>
                <div className="flex-1 relative">
                  <div className="w-full h-[0.25rem] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <motion.div className="h-full rounded-full" style={{ width: `${volume}%`, background: 'rgba(255,255,255,0.6)' }} layout />
                  </div>
                  <input type="range" min="0" max="100" value={volume} onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))} className="absolute inset-0 w-full opacity-0 cursor-pointer" aria-label="볼륨 조절" />
                </div>
                <span className="text-[0.65rem] text-neutral-500 min-w-[2rem] text-right font-mono">{volume}</span>
              </div>
            </div>

            {/* 바코드 장식 */}
            <div className="px-[1.25rem] pb-[1rem]">
              <div className="flex items-end justify-center gap-[0.1rem] h-[1.5rem]">
                {[0.6, 1, 0.4, 0.8, 0.5, 1, 0.7, 0.3, 0.9, 0.5, 0.8, 0.4, 1, 0.6, 0.9, 0.3, 0.7, 1, 0.5, 0.8, 0.4, 0.6, 1, 0.7].map((h, i) => (
                  <div key={i} className="w-[0.15rem] rounded-sm" style={{ height: `${h * 100}%`, background: 'rgba(255,255,255,0.3)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 모바일: 하단 고정 뮤직 플레이어 - 가로 티켓 */}
      <motion.div
        className="md:hidden fixed bottom-[1rem] left-[3rem] right-[3rem] z-40"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="relative">
          {/* 상단 톱니 테두리 */}
          <div className="absolute top-0 left-0 right-0 h-[0.4rem] flex flex-row justify-between -translate-y-1/2 z-10 px-[0.5rem]">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={`top-${i}`} className="w-[0.4rem] h-[0.4rem] rounded-full" style={{ background: 'black' }} />
            ))}
          </div>
          {/* 하단 톱니 테두리 */}
          <div className="absolute bottom-0 left-0 right-0 h-[0.4rem] flex flex-row justify-between translate-y-1/2 z-10 px-[0.5rem]">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={`bottom-${i}`} className="w-[0.4rem] h-[0.4rem] rounded-full" style={{ background: 'black' }} />
            ))}
          </div>

          <div
            className="relative flex flex-row items-center overflow-hidden px-[1rem] py-[0.75rem] gap-[0.75rem]"
            style={{
              background: 'linear-gradient(90deg, #1f1d1a 0%, #141210 100%)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            {/* 빈티지 효과들 */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-50" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, mixBlendMode: 'overlay' }} />
            <div className="absolute inset-0 pointer-events-none z-10" style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }} />

            {/* 재생 버튼 */}
            <button onClick={handlePlayClick} className="flex-shrink-0 cursor-pointer" aria-label={isPlaying ? '일시정지' : '재생'}>
              <div className="w-[2.5rem] h-[2.5rem] rounded-full flex items-center justify-center" style={{ background: isPlaying ? 'rgba(255,255,255,0.1)' : '#7B0D14' }}>
                {isPlaying ? (
                  <div className="flex gap-[0.15rem]">
                    <div className="w-[0.2rem] h-[0.7rem] bg-white/80 rounded-sm" />
                    <div className="w-[0.2rem] h-[0.7rem] bg-white/80 rounded-sm" />
                  </div>
                ) : (
                  <div className="w-0 h-0 ml-[0.1rem]" style={{ borderTop: '0.4rem solid transparent', borderBottom: '0.4rem solid transparent', borderLeft: '0.6rem solid white' }} />
                )}
              </div>
            </button>

            {/* 점선 구분 (세로) */}
            <div className="relative h-[2.5rem] flex items-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[0.6rem] h-[0.6rem] rounded-full z-20" style={{ background: 'black' }} />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-[0.6rem] h-[0.6rem] rounded-full z-20" style={{ background: 'black' }} />
              <div className="h-full w-0" style={{ borderLeft: '2px dashed rgba(255,255,255,0.15)' }} />
            </div>

            {/* 트랙 정보 */}
            <div className="flex-1 min-w-0 z-20">
              <p className="text-[0.5rem] tracking-[0.15em] text-neutral-500 uppercase">Now Playing</p>
              <h3 className="font-serif text-[0.9rem] text-white/90 truncate">{track?.title}</h3>
              {track?.artist && <p className="text-[0.65rem] text-neutral-400 truncate">{track.artist}</p>}
            </div>

            {/* 볼륨 */}
            <div className="flex items-center gap-[0.5rem] flex-shrink-0 z-20">
              <button onClick={toggleMute} className="w-[1.5rem] h-[1.5rem] rounded-full flex items-center justify-center cursor-pointer" aria-label={isMuted ? '음소거 해제' : '음소거'}>
                {isMuted ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-neutral-500"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/70"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 메인 컨텐츠 영역 */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-[2rem] md:ml-[20rem]">
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

      {/* 시계 - 오른쪽 하단, 모바일에서는 뮤직플레이어 위로 */}
      <motion.div
        className="fixed right-[2rem] z-20 bottom-[6rem] md:bottom-[2rem]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="clock-text text-white/80 text-[1.25rem] md:text-[1.75rem]">
          {time}
        </span>
      </motion.div>
    </main>
  );
}
