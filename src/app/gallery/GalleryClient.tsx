'use client';

import { useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import type { FolderData } from '@/lib/data/folders';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'commission', label: 'Commission' },
  { key: 'picrew', label: 'Picrew' },
  { key: 'personal', label: 'Personal' },
];

import type { ImageOrientation } from '@/lib/data/folders';

/** 이미지 방향에 따라 그리드 스팬 결정 */
function getSpan(orientation: ImageOrientation): 1 | 2 {
  return orientation === 'landscape' ? 2 : 1;
}

/**
 * 카드 높이 제약
 * aspectRatio CSS로 실제 비율을 반영하되,
 * 너무 크거나 작아지지 않도록 min/max로 클램프
 */
const HEIGHT_CONSTRAINTS: Record<ImageOrientation, { min: string; max: string }> = {
  landscape: { min: '12rem', max: '30rem' },
  portrait:  { min: '18rem', max: '42rem' },
  square:    { min: '14rem', max: '32rem' },
};

const FLOAT_DELAY = [0, 1.1, 0.5, 1.8, 0.3, 1.4];

type Props = { folders: FolderData[] };

export default function GalleryClient({ folders }: Props) {
  const searchParams = useSearchParams();
  const activeCat = searchParams.get('cat') ?? 'all';

  const filtered =
    activeCat === 'all'
      ? folders
      : folders.filter((f) => f.slug.toLowerCase().includes(activeCat.toLowerCase()));

  const cols = filtered.length === 1 ? 1 : 2;

  return (
    <>
      {/* ── Sticky 카테고리 탭 ── */}
      <div
        className="sticky top-[3.5rem] z-40 flex justify-center py-[0.75rem]"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(0,0,0,0.08)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <nav className="flex gap-[0.5rem] flex-wrap justify-center">
          {CATEGORIES.map(({ key, label }) => {
            const isActive = activeCat === key;
            return (
              <Link
                key={key}
                href={key === 'all' ? '/gallery' : `/gallery?cat=${key}`}
                className="px-[1rem] py-[0.35rem] rounded-full text-[0.82rem] font-sans tracking-wide transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.5)',
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── 에테리얼 벤토 그리드 — GNB(3.5rem) + 탭(~3.5rem) 아래 나머지 공간에서 세로 가운데 ── */}
      <div className="flex items-center justify-center px-[2rem] py-[4rem]"
        style={{ minHeight: 'calc(100vh - 7rem)' }}>
        <div className="max-w-[60rem] w-full">
        {filtered.length === 0 ? (
          <div className="glass-card rounded-[1.25rem] p-[3rem] text-center text-[var(--color-muted)] font-serif">
            이 카테고리에는 아직 폴더가 없습니다.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: '1.75rem',
            }}
          >
            {filtered.map((folder, i) => {
              const span = getSpan(folder.orientation);
              const constraints = HEIGHT_CONSTRAINTS[folder.orientation];

              return (
                /* 입장 애니메이션 래퍼 */
                <motion.div
                  key={folder.slug}
                  style={{ gridColumn: `span ${span}` }}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* 부유 애니메이션 래퍼 (float) */}
                  <motion.div
                    animate={{ y: [0, -9, 0] }}
                    transition={{
                      duration: 4.5 + i * 0.35,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: FLOAT_DELAY[i % FLOAT_DELAY.length],
                    }}
                  >
                    <BentoCard
                      folder={folder}
                      aspectRatio={folder.aspectRatio}
                      minHeight={constraints.min}
                      maxHeight={constraints.max}
                    />
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </>
  );
}

// ── 벤토 카드 (패럴랙스 틸트 + 호버 효과) ─────────────────────────
type BentoCardProps = {
  folder: FolderData;
  aspectRatio: number;
  minHeight: string;
  maxHeight: string;
};

function BentoCard({ folder, aspectRatio, minHeight, maxHeight }: BentoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const normX = useMotionValue(0);
  const normY = useMotionValue(0);
  const rotateY = useSpring(useTransform(normX, [-0.5, 0.5], [-7, 7]), {
    stiffness: 160,
    damping: 26,
  });
  const rotateX = useSpring(useTransform(normY, [-0.5, 0.5], [5, -5]), {
    stiffness: 160,
    damping: 26,
  });

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
  }, [normX, normY]);

  return (
    <div style={{ perspective: '900px' }}>
      <Link href={`/${folder.slug}`} className="block">
        <motion.div
          ref={cardRef}
          className="bento-card relative overflow-hidden rounded-[1.5rem]"
          style={{
            aspectRatio: String(aspectRatio),
            minHeight,
            maxHeight,
            rotateX,
            rotateY,
          }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          whileHover={{ scale: 1.025 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        >
          {/* 썸네일 */}
          {folder.thumbnail ? (
            <Image
              src={folder.thumbnail}
              alt={folder.title}
              fill
              className="bento-card-img object-contain"
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--color-surface)]" />
          )}

          {/* 호버 시 걷히는 블러 오버레이 */}
          <div className="bento-blur-veil absolute inset-0 pointer-events-none" />

          {/* 그라데이션 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

          {/* 유리 표면 글레어 */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 40%, transparent 60%)',
            }}
          />

          {/* 물방울 하이라이트 */}
          <div className="card-droplet" />

          {/* 호버 글로우 테두리 */}
          <div className="bento-glow-ring absolute inset-0 rounded-[1.5rem] pointer-events-none" />

          {/* 텍스트 */}
          <div className="absolute bottom-0 left-0 right-0 p-[1.5rem]">
            <h2 className="font-serif text-[1.4rem] text-white leading-snug mb-[0.4rem]">
              {folder.title}
            </h2>
            <div className="flex gap-[0.35rem] flex-wrap">
              {folder.tags.map((tag) => (
                <span key={tag} className="glass-tag">
                  {tag}
                </span>
              ))}
              <span className="glass-tag opacity-50">{folder.count} items</span>
            </div>
          </div>
        </motion.div>
      </Link>
    </div>
  );
}
