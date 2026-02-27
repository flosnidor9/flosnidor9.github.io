'use client';

import { useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { FolderData } from '@/lib/data/folders';

type Props = {
  folder: FolderData;
  onHoverChange?: (hovered: boolean) => void;
};

export default function GlassCard({ folder, onHoverChange }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  // 카드 내부 마우스 기반 미세 틸트
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);
  const rotateY = useSpring(useTransform(normX, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 25 });
  const rotateX = useSpring(useTransform(normY, [-0.5, 0.5], [6, -6]), { stiffness: 200, damping: 25 });

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = cardRef.current?.getBoundingClientRect();
      if (!rect) return;
      normX.set((e.clientX - rect.left) / rect.width - 0.5);
      normY.set((e.clientY - rect.top) / rect.height - 0.5);
    },
    [normX, normY]
  );

  const onMouseLeave = useCallback(() => {
    normX.set(0);
    normY.set(0);
    onHoverChange?.(false);
  }, [normX, normY, onHoverChange]);

  return (
    // perspective 래퍼 — 자식의 3D 변환이 보이려면 부모에 있어야 함
    <div style={{ perspective: '700px' }}>
      <motion.div
        ref={cardRef}
        className="glass-card relative w-[28rem] h-[20rem] flex-shrink-0 overflow-hidden rounded-[1.25rem] cursor-pointer"
        style={{ rotateX, rotateY }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onMouseEnter={() => onHoverChange?.(true)}
        whileHover={{ scale: 1.04 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      >
        {/* 썸네일 */}
        {folder.thumbnail ? (
          <Image
            src={folder.thumbnail}
            alt={folder.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-[var(--color-surface)]" />
        )}

        {/* 글래스 오버레이 — 하단 그라데이션으로 텍스트 가독성 확보 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* 물방울 하이라이트 */}
        <div className="card-droplet" />

        {/* 텍스트 영역 */}
        <div className="absolute bottom-0 left-0 right-0 p-[1.5rem]">
          <h3 className="font-serif text-[1.5rem] leading-tight text-white mb-[0.6rem]">
            {folder.title}
          </h3>
          <div className="flex gap-[0.4rem] flex-wrap">
            {folder.tags.map((tag) => (
              <span key={tag} className="glass-tag">
                {tag}
              </span>
            ))}
            <span className="glass-tag opacity-50">{folder.count} items</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
