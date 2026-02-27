'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import MacGlassWindow from './hero/MacGlassWindow';
import Clock from './hero/Clock';
import GyroPermissionPrompt from './hero/GyroPermissionPrompt';
import SidebarMusicPlayer from './sidebar/SidebarMusicPlayer';
import { useGyroscope } from '@/hooks/useGyroscope';
import { musicTracks } from '@/lib/data/music';
import { pickHeroImage } from '@/lib/heroImage';

const TRANSLATE_RANGE = 30;
const TILT_RANGE = 2;

type Props = {
  imagePaths: string[];
};

export default function HomeScene({ imagePaths }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageAspect, setImageAspect] = useState(16 / 10);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const src = pickHeroImage(imagePaths);
    if (!src) return;

    setImageSrc(src);

    const img = new window.Image();
    img.onload = () => {
      setImageAspect(img.naturalWidth / img.naturalHeight);
    };
    img.src = src;
  }, [imagePaths]);

  // ── 자이로센서 훅 ─────────────────────────────────────────
  const gyro = useGyroscope();
  const isGyroActive = gyro.permissionState === 'granted';

  // ── 패럴랙스 스프링 ───────────────────────────────────────
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);
  const parallaxX = useSpring(normX, { stiffness: 60, damping: 20 });
  const parallaxY = useSpring(normY, { stiffness: 60, damping: 20 });
  const translateX = useTransform(parallaxX, [-0.5, 0.5], [-TRANSLATE_RANGE, TRANSLATE_RANGE]);
  const translateY = useTransform(parallaxY, [-0.5, 0.5], [-TRANSLATE_RANGE, TRANSLATE_RANGE]);
  const rotateY = useTransform(parallaxX, [-0.5, 0.5], [-TILT_RANGE, TILT_RANGE]);
  const rotateX = useTransform(parallaxY, [-0.5, 0.5], [TILT_RANGE, -TILT_RANGE]);

  // 자이로 활성화 시 → normX/normY를 자이로 값으로 구동
  useEffect(() => {
    if (!isGyroActive) return;
    const u1 = gyro.normX.on('change', (v) => normX.set(v));
    const u2 = gyro.normY.on('change', (v) => normY.set(v));
    return () => { u1(); u2(); };
  }, [isGyroActive, gyro.normX, gyro.normY, normX, normY]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    normX.set((e.clientX - rect.left) / rect.width - 0.5);
    normY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [normX, normY]);

  const onMouseLeave = useCallback(() => {
    normX.set(0);
    normY.set(0);
  }, [normX, normY]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (isGyroActive) return;
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const t = e.touches[0];
    normX.set((t.clientX - rect.left) / rect.width - 0.5);
    normY.set((t.clientY - rect.top) / rect.height - 0.5);
  }, [isGyroActive, normX, normY]);

  const onTouchEnd = useCallback(() => {
    if (isGyroActive) return;
    normX.set(0);
    normY.set(0);
  }, [isGyroActive, normX, normY]);

  const track = musicTracks[0];

  return (
    <section
      ref={sectionRef}
      className="h-screen w-full overflow-hidden cursor-none"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <motion.div
        className="relative h-full w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ perspective: '1000px' }}
      >
        {/* ═══ 레이어 1: 블러된 배경 (패럴랙스) ═══ */}
        {imageSrc && (
          <motion.div
            className="absolute inset-0"
            style={{
              translateX,
              translateY,
              rotateX,
              rotateY,
            }}
          >
            <div className="absolute inset-0 hero-blur-bg">
              <Image src={imageSrc} alt="" fill className="object-cover" priority />
            </div>
          </motion.div>
        )}

        {/* ═══ 레이어 2: 그레인 텍스처 ═══ */}
        <div className="absolute inset-0 grain-texture pointer-events-none" />

        {/* ═══ 메인 레이아웃: 음악 플레이어 + 중앙 윈도우 ═══ */}
        <div className="relative h-full w-full flex items-center justify-center px-[2rem] md:px-[3rem] lg:px-[4rem]">
          {/* 좌측 사이드바: 음악 플레이어 */}
          <div className="hidden md:flex flex-col gap-[1rem] w-[12rem] lg:w-[14rem] flex-shrink-0 z-20">
            {track && (
              <SidebarMusicPlayer
                track={track}
                normX={parallaxX}
                normY={parallaxY}
              />
            )}
          </div>

          {/* 중앙: MacGlassWindow */}
          <div className="flex-1 flex items-center justify-center z-10 px-[1rem] md:px-[2rem]">
            <MacGlassWindow
              normX={parallaxX}
              normY={parallaxY}
              aspectRatio={imageAspect}
              imageSrc={imageSrc}
            />
          </div>

          {/* 우측 공간 (좌우 대칭 유지용) */}
          <div className="hidden md:block w-[12rem] lg:w-[14rem] flex-shrink-0" />
        </div>

        {/* ═══ 시계 (우측 하단) ═══ */}
        <Clock />

        {/* ═══ 모바일: 하단 음악 플레이어 ═══ */}
        <div className="md:hidden absolute bottom-[1.5rem] left-0 right-0 px-[1rem] z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            {track && (
              <SidebarMusicPlayer
                track={track}
                normX={parallaxX}
                normY={parallaxY}
              />
            )}
          </motion.div>
        </div>

        {/* ═══ 그레인 (최상위) ═══ */}
        <div className="absolute inset-0 grain-texture pointer-events-none" style={{ zIndex: 30 }} />

        {/* ═══ 자이로 권한 요청 프롬프트 (iOS 모바일 전용) ═══ */}
        <AnimatePresence>
          {gyro.permissionState === 'unknown' && (
            <GyroPermissionPrompt onRequest={gyro.requestPermission} />
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
