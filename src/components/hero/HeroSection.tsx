'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from 'framer-motion';
import { useGyroscope } from '@/hooks/useGyroscope';
import GrainBlurOverlay from './GrainBlurOverlay';
import LiquidBackground from './LiquidBackground';
import GyroPermissionPrompt from './GyroPermissionPrompt';

const TRANSLATE_RANGE = 40;
const TILT_RANGE = 3;
const IMG_SCALE = 1.08;

type Props = {
  imagePaths: string[];
};

export default function HeroSection({ imagePaths }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!imagePaths.length) return;
    setImageSrc(imagePaths[Math.floor(Math.random() * imagePaths.length)]);
  }, [imagePaths]);

  // ── 스크롤 트랜지션 ───────────────────────────────────────
  const { scrollY } = useScroll();
  // 0~400px 스크롤 구간에서 트랜지션 완료
  const imgScale   = useTransform(scrollY, [0, 400], [IMG_SCALE, IMG_SCALE * 1.12]);
  const imgOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const bgOpacity  = useTransform(scrollY, [50, 350], [0, 1]);

  // ── 이레이저용: 빠른 스프링 ──────────────────────────────
  const mouseX = useMotionValue(-9999);
  const mouseY = useMotionValue(-9999);
  const smoothX = useSpring(mouseX, { stiffness: 220, damping: 42 });
  const smoothY = useSpring(mouseY, { stiffness: 220, damping: 42 });

  // ── 패럴랙스용: 느린 스프링 ──────────────────────────────
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);
  const parallaxX = useSpring(normX, { stiffness: 60, damping: 20 });
  const parallaxY = useSpring(normY, { stiffness: 60, damping: 20 });

  const translateX = useTransform(parallaxX, [-0.5, 0.5], [-TRANSLATE_RANGE, TRANSLATE_RANGE]);
  const translateY = useTransform(parallaxY, [-0.5, 0.5], [-TRANSLATE_RANGE, TRANSLATE_RANGE]);
  const rotateY    = useTransform(parallaxX, [-0.5, 0.5], [-TILT_RANGE, TILT_RANGE]);
  const rotateX    = useTransform(parallaxY, [-0.5, 0.5], [TILT_RANGE, -TILT_RANGE]);

  // ── 자이로 ──────────────────────────────────────────
  const {
    normX: gyroNormX,
    normY: gyroNormY,
    isActive: isGyroActive,
    permissionState,
    requestPermission,
  } = useGyroscope();

  // 자이로 데이터로 마우스/패럴랙스 값 업데이트
  useEffect(() => {
    if (!isGyroActive) return;

    const handleGyroChange = () => {
      const gx = gyroNormX.get();
      const gy = gyroNormY.get();
      const { innerWidth: w, innerHeight: h } = window;
      
      // 이레이저 위치 업데이트 (화면 중앙 기준)
      mouseX.set(w / 2 + gx * w);
      mouseY.set(h / 2 + gy * h);
      
      // 패럴랙스 값 업데이트
      normX.set(gx);
      normY.set(gy);
    };

    const unsubscribeX = gyroNormX.on('change', handleGyroChange);
    const unsubscribeY = gyroNormY.on('change', handleGyroChange);

    return () => {
      unsubscribeX();
      unsubscribeY();
    };
  }, [isGyroActive, gyroNormX, gyroNormY, mouseX, mouseY, normX, normY]);


  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isGyroActive) return;
      const rect = sectionRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      normX.set((e.clientX - rect.left) / rect.width - 0.5);
      normY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [isGyroActive, mouseX, mouseY, normX, normY]
  );

  const onMouseLeave = useCallback(() => {
    if (isGyroActive) return;
    mouseX.set(-9999);
    mouseY.set(-9999);
    normX.set(0);
    normY.set(0);
  }, [isGyroActive, mouseX, mouseY, normX, normY]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isGyroActive) return;
      const rect = sectionRef.current?.getBoundingClientRect();
      if (!rect) return;
      const t = e.touches[0];
      mouseX.set(t.clientX);
      mouseY.set(t.clientY);
      normX.set((t.clientX - rect.left) / rect.width - 0.5);
      normY.set((t.clientY - rect.top) / rect.height - 0.5);
    },
    [isGyroActive, mouseX, mouseY, normX, normY]
  );

  const onTouchEnd = useCallback(() => {
    if (isGyroActive) return;
    mouseX.set(-9999);
    mouseY.set(-9999);
    normX.set(0);
    normY.set(0);
  }, [isGyroActive, mouseX, mouseY, normX, normY]);

  return (
    // 섹션 높이를 200vh로 주면 스크롤할 공간이 생김
    // sticky로 고정해서 스크롤 중에도 화면에 붙어있게 함
    <section ref={sectionRef} style={{ height: '200vh' }}>
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
        {/* 리퀴드 그라데이션 배경 (스크롤로 올라옴) */}
        <LiquidBackground opacity={bgOpacity} />

        {/* 패럴랙스 + 틸트 + 스크롤 fade 이미지 레이어 */}
        <motion.div
          className="absolute inset-0 gpu"
          style={{
            scale: imgScale,
            opacity: imgOpacity,
            translateX,
            translateY,
            rotateX,
            rotateY,
          }}
        >
          {imageSrc ? (
            <Image src={imageSrc} alt="" fill className="object-cover" priority />
          ) : (
            <div className="absolute inset-0 bg-[var(--color-surface)]" />
          )}
        </motion.div>

        {/* 블러+그레인 오버레이 */}
        <GrainBlurOverlay smoothX={smoothX} smoothY={smoothY} />
        
        {/* 자이로 권한 요청 프롬프트 (iOS) */}
        {permissionState === 'unknown' && (
          <GyroPermissionPrompt onRequestPermission={requestPermission} />
        )}

        {/* 그레인은 스크롤 후에도 유지 */}
        <div className="absolute inset-0 grain-texture pointer-events-none" />
      </motion.div>
    </section>
  );
}
