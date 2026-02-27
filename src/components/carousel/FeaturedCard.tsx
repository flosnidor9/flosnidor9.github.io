'use client';

import { useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate, type MotionValue } from 'framer-motion';
import type { FolderData } from '@/lib/data/folders';

// materializing 전환 애니메이션
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number];
const easeIn      = [0.4, 0, 1, 1]    as [number, number, number, number];

export const cardVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    scale: 0.90,
    filter: 'blur(22px)',
    x: dir * 30,
  }),
  center: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    x: 0,
    transition: {
      duration: 0.55,
      ease: easeOutExpo,
    },
  },
  exit: (dir: number) => ({
    opacity: 0,
    scale: 1.06,
    filter: 'blur(18px)',
    x: dir * -30,
    transition: {
      duration: 0.38,
      ease: easeIn,
    },
  }),
};

type Props = {
  folder: FolderData;
  direction: number;
  onDragLeft: () => void;
  onDragRight: () => void;
  externalNormX?: MotionValue<number>;
  externalNormY?: MotionValue<number>;
};

export default function FeaturedCard({ folder, direction, onDragLeft, onDragRight, externalNormX, externalNormY }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  // 내부 호버/자이로 공통 normX/normY
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);

  // 외부(자이로) 값이 있으면 구독하여 내부 값에 포워딩
  useEffect(() => {
    if (!externalNormX) return;
    return externalNormX.on('change', (v) => normX.set(v));
  }, [externalNormX, normX]);

  useEffect(() => {
    if (!externalNormY) return;
    return externalNormY.on('change', (v) => normY.set(v));
  }, [externalNormY, normY]);

  // 3D 틸트 (호버 + 자이로 공용)
  const rotateY = useSpring(useTransform(normX, [-0.5, 0.5], [-6, 6]), { stiffness: 180, damping: 28 });
  const rotateX = useSpring(useTransform(normY, [-0.5, 0.5], [5, -5]), { stiffness: 180, damping: 28 });

  // 반사 하이라이트 위치 — 기울기에 따라 이동 (실제 유리 반사 시뮬레이션)
  const reflectX = useTransform(normX, [-0.5, 0.5], [72, 28]);
  const reflectY = useTransform(normY, [-0.5, 0.5], [28, 72]);
  const reflectGradient = useMotionTemplate`radial-gradient(ellipse at ${reflectX}% ${reflectY}%, rgba(255,255,255,0.36) 0%, rgba(255,255,255,0.10) 35%, transparent 62%)`;

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    normX.set((e.clientX - rect.left) / rect.width - 0.5);
    normY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [normX, normY]);

  const onMouseLeave = useCallback(() => {
    // 외부 값이 있으면 리셋하지 않음 (자이로가 계속 구동)
    if (externalNormX || externalNormY) return;
    normX.set(0);
    normY.set(0);
  }, [externalNormX, externalNormY, normX, normY]);

  return (
    // perspective 래퍼
    <div style={{ perspective: '900px' }} className="w-full flex justify-center">
      <motion.div
        ref={cardRef}
        className="featured-card gpu"
        style={{
          width: 'min(68vw, 680px)',
          height: 'min(72vh, 560px)',
          rotateX,
          rotateY,
        }}
        variants={cardVariants}
        custom={direction}
        initial="enter"
        animate="center"
        exit="exit"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        // 드래그로 넘기기
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) onDragLeft();
          else if (info.offset.x > 60) onDragRight();
        }}
      >
        {/* 썸네일 */}
        <div className="absolute inset-0">
          {folder.thumbnail ? (
            <Image
              src={folder.thumbnail}
              alt={folder.title}
              fill
              className="object-cover"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--color-surface)]" />
          )}
        </div>

        {/* 하단 frosted info strip */}
        <div className="card-info-strip absolute bottom-0 left-0 right-0 px-[2rem] pt-[4rem] pb-[1.8rem]">
          <h3 className="font-serif text-[2rem] leading-tight text-white mb-[0.8rem]">
            {folder.title}
          </h3>
          <div className="flex items-center gap-[0.5rem] flex-wrap">
            {folder.tags.map((tag) => (
              <span key={tag} className="glass-tag">{tag}</span>
            ))}
            <span className="glass-tag opacity-50">{folder.count} items</span>
          </div>
        </div>

        {/* 유리 반사 하이라이트 — 기울기에 따라 이동 */}
        <motion.div
          className="absolute inset-0 pointer-events-none rounded-[inherit]"
          style={{
            background: reflectGradient,
            zIndex: 11,
          }}
        />
      </motion.div>
    </div>
  );
}
