'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useTransform,
  useScroll,
} from 'framer-motion';
import GrainBlurOverlay from './hero/GrainBlurOverlay';
import GyroPermissionPrompt from './hero/GyroPermissionPrompt';
import FeaturedCard from './carousel/FeaturedCard';
import MusicPlayerSection from './music-player/MusicPlayerSection';
import { useGyroscope } from '@/hooks/useGyroscope';
import type { FolderData } from '@/lib/data/folders';

const TRANSLATE_RANGE = 40;
const TILT_RANGE = 3;
const IMG_SCALE = 1.08;

type Props = {
  imagePaths: string[];
  folders: FolderData[];
};

export default function HomeScene({ imagePaths, folders }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!imagePaths.length) return;
    setImageSrc(imagePaths[Math.floor(Math.random() * imagePaths.length)]);
  }, [imagePaths]);

  // ── 네비게이션 ────────────────────────────────────────────
  const next = useCallback(() => {
    if (!folders.length) return;
    setDirection(1);
    setIndex((i) => (i + 1) % folders.length);
  }, [folders.length]);

  const prev = useCallback(() => {
    if (!folders.length) return;
    setDirection(-1);
    setIndex((i) => (i - 1 + folders.length) % folders.length);
  }, [folders.length]);

  // 키보드 네비게이션
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  // ── 스크롤 트랜지션 ───────────────────────────────────────
  const { scrollY } = useScroll();
  const imgScale      = useTransform(scrollY, [0, 400],  [IMG_SCALE, IMG_SCALE * 1.12]);
  const imgOpacity    = useTransform(scrollY, [0, 300],  [1, 0]);
  // 리퀴드 bg는 반투명(0.65)으로만 올라와서 배경 이미지가 비침
  const bgOpacity     = useTransform(scrollY, [50, 350], [0, 0.72]);
  const overlayOpacity = useTransform(scrollY, [0, 280], [1, 0]);
  // 히어로 영역이 보일 때만 포인터 이벤트 활성화 (커서 숨김용)
  const heroPointerEvents = useTransform(scrollY, (v) => v < 250 ? 'auto' : 'none');
  // 카드는 뮤직 플레이어가 왼쪽으로 이동한 후 등장 (600~800px)
  const cardOpacity   = useTransform(scrollY, [600, 800], [0, 1]);
  const cardY         = useTransform(scrollY, [600, 800], [50, 0]);
  // 카드가 보이지 않을 때는 포인터 이벤트 비활성화
  const cardPointerEvents = useTransform(scrollY, (v) => v > 550 ? 'auto' : 'none');

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
  const rotateY    = useTransform(parallaxX, [-0.5, 0.5], [-TILT_RANGE, TILT_RANGE]);
  const rotateX    = useTransform(parallaxY, [-0.5, 0.5], [TILT_RANGE, -TILT_RANGE]);

  // ── 배경 유리 반사 하이라이트 (대각선 밴드) ─────────────
  // parallaxX/Y (-0.5~0.5)를 135° 축에 투영 → 시선 각도에 따라 이동하는 반사광
  const glassHDiag = useTransform(
    [parallaxX, parallaxY],
    ([x, y]: number[]) => (x + y) * 50 + 50,
  );
  const glassHighlight = useMotionTemplate`linear-gradient(135deg,
    transparent                  0%,
    transparent                  calc(${glassHDiag}% - 16%),
    rgba(255,255,255,0.06)       calc(${glassHDiag}% - 10%),
    rgba(255,255,255,0.30)       calc(${glassHDiag}% -  2%),
    rgba(255,255,255,0.30)       calc(${glassHDiag}% +  2%),
    rgba(255,255,255,0.06)       calc(${glassHDiag}% + 10%),
    transparent                  calc(${glassHDiag}% + 16%),
    transparent                  100%
  )`;

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

  // 자이로 미활성 시에만 터치 이동으로 패럴랙스/이레이저 구동
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

  const currentFolder = folders[index] ?? null;

  return (
    <section ref={sectionRef} style={{ height: '400vh' }}>
      <motion.div
        className="sticky top-0 h-screen w-full overflow-hidden cursor-none"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ perspective: '800px' }}
      >
        {/* 고정 배경 이미지 — 항상 표시, 살짝 블러로 카드와 분리감 */}
        {imageSrc && (
          <div
            className="absolute inset-0"
            style={{ filter: 'blur(6px)', transform: 'scale(1.04)', pointerEvents: 'none' }}
          >
            <Image src={imageSrc} alt="" fill className="object-cover" />
          </div>
        )}

        {/* 배경 유리 반사 — 마우스/자이로 시선 각도에 따라 이동하는 스페큘러 하이라이트 */}
        <motion.div
          className="absolute inset-0 pointer-events-none gpu"
          style={{ background: glassHighlight, zIndex: 1 }}
        />

        {/* 리퀴드 그라데이션 오버레이 (반투명 — 배경 이미지가 비침) */}
        <motion.div
          className="absolute inset-0 liquid-bg grain-texture pointer-events-none"
          style={{ opacity: bgOpacity }}
        />

        {/* 히어로 이미지 - 커서 숨김 영역 */}
        <motion.div
          className="absolute inset-0 gpu"
          style={{ scale: imgScale, opacity: imgOpacity, translateX, translateY, rotateX, rotateY, pointerEvents: heroPointerEvents }}
          data-hide-cursor
        >
          {imageSrc ? (
            <Image src={imageSrc} alt="" fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 bg-[var(--color-surface)]" />
          )}
        </motion.div>

        {/* 블러+그레인 이레이저 오버레이 - 히어로 영역에서 커서 숨김 */}
        <motion.div
          className="absolute inset-0"
          style={{ opacity: overlayOpacity, pointerEvents: heroPointerEvents }}
          data-hide-cursor
        >
          <GrainBlurOverlay normX={parallaxX} normY={parallaxY} />
        </motion.div>

        {/* 그레인 (항상 유지) */}
        <div className="absolute inset-0 grain-texture pointer-events-none" />

        {/* 자이로 권한 요청 프롬프트 (iOS 모바일 전용) */}
        <AnimatePresence>
          {gyro.permissionState === 'unknown' && (
            <GyroPermissionPrompt onRequest={gyro.requestPermission} />
          )}
        </AnimatePresence>

        {/* ── 뮤직 플레이어 (fixed 포지션) ─────────────────── */}
        <MusicPlayerSection
          scrollY={scrollY}
          normX={parallaxX}
          normY={parallaxY}
        />

        {/* ── 카드 영역 ────────────────────────────────────── */}
        {currentFolder && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center gap-[2rem]"
            style={{ opacity: cardOpacity, y: cardY, zIndex: 10, pointerEvents: cardPointerEvents }}
          >
            {/* 카드 + 사이드 네비게이션 */}
            <div className="relative flex items-center gap-[2rem] w-full justify-center">

              {/* 이전 버튼 */}
              {folders.length > 1 && (
                <button
                  onClick={prev}
                  className="glass-nav-btn w-[3rem] h-[3rem] flex items-center justify-center text-white/70 hover:text-white flex-shrink-0 cursor-pointer"
                  aria-label="이전"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}

              {/* FeaturedCard */}
              <AnimatePresence mode="wait" custom={direction}>
                <FeaturedCard
                  key={currentFolder.slug}
                  folder={currentFolder}
                  direction={direction}
                  onDragLeft={next}
                  onDragRight={prev}
                  externalNormX={gyro.permissionState !== 'unavailable' ? gyro.normX : undefined}
                  externalNormY={gyro.permissionState !== 'unavailable' ? gyro.normY : undefined}
                />
              </AnimatePresence>

              {/* 다음 버튼 */}
              {folders.length > 1 && (
                <button
                  onClick={next}
                  className="glass-nav-btn w-[3rem] h-[3rem] flex items-center justify-center text-white/70 hover:text-white flex-shrink-0 cursor-pointer"
                  aria-label="다음"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M7 4L12 9L7 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
            </div>

            {/* 인덱스 표시 */}
            {folders.length > 1 && (
              <div className="flex items-center gap-[0.8rem]">
                {folders.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                    className="cursor-pointer transition-all duration-300"
                    style={{
                      width: i === index ? '1.5rem' : '0.4rem',
                      height: '0.4rem',
                      borderRadius: '9999px',
                      background: i === index ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)',
                    }}
                    aria-label={`${i + 1}번째 폴더`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* 폴더 없을 때 안내 */}
        {folders.length === 0 && (
          <motion.p
            className="absolute bottom-[3rem] left-0 right-0 text-center font-sans text-[0.8rem] text-white/30 tracking-widest uppercase"
            style={{ opacity: cardOpacity }}
          >
            public/images/ 에 폴더를 추가하면 여기에 표시됩니다
          </motion.p>
        )}
      </motion.div>
    </section>
  );
}
